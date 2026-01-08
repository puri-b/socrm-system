import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

type EntityType = 'customer' | 'project' | 'task';

async function logActivity(params: {
  entity_type: EntityType;
  entity_id: number;
  action: string;
  performed_by: number;
  message?: string | null;
  meta?: any;
}) {
  try {
    await query(
      `INSERT INTO x_socrm.activity_logs (entity_type, entity_id, action, performed_by, message, meta)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.entity_type,
        params.entity_id,
        params.action,
        params.performed_by,
        params.message ?? null,
        params.meta ? JSON.stringify(params.meta) : null,
      ]
    );
  } catch (e) {
    console.error('activity_logs insert failed:', e);
  }
}

/**
 * PATCH /api/tasks/status-requests
 * Body:
 *  - request_id: number (required)
 *  - decision: 'approved' | 'rejected' (required)
 *  - decision_note?: string
 *
 * Rule:
 *  - Only required approver (task.created_by) or admin can decide.
 *  - If approved: update task.status = requested_status
 *  - If rejected: do NOT change task.status (keep current) but mark request rejected
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    const request_id = Number(data?.request_id);
    const decision = String(data?.decision || '');
    const decision_note = data?.decision_note ? String(data.decision_note) : null;

    if (!request_id || !decision) {
      return NextResponse.json({ error: 'request_id และ decision จำเป็นต้องระบุ' }, { status: 400 });
    }
    if (decision !== 'approved' && decision !== 'rejected') {
      return NextResponse.json({ error: 'decision ไม่ถูกต้อง' }, { status: 400 });
    }

    // Load request (must be pending)
    const reqRes = await query(
      `
      SELECT r.*
      FROM x_socrm.task_status_requests r
      WHERE r.request_id = $1
      `,
      [request_id]
    );

    if (reqRes.rows.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const reqRow = reqRes.rows[0];
    if (reqRow.decision !== 'pending') {
      return NextResponse.json({ error: 'Request นี้ถูกตัดสินแล้ว' }, { status: 400 });
    }

    // Load task (for permission + update)
    const taskRes = await query(
      `
      SELECT t.*
      FROM x_socrm.tasks t
      WHERE t.task_id = $1
      `,
      [Number(reqRow.task_id)]
    );

    if (taskRes.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = taskRes.rows[0];

    // Permission: admin OR (user is in required_approver_ids) OR (user is task.created_by)
    const requiredApproverIds: number[] = Array.isArray(reqRow.required_approver_ids)
      ? reqRow.required_approver_ids.map((n: any) => Number(n))
      : [];

    const isApprover =
      user.role === 'admin' ||
      Number(task.created_by) === Number(user.user_id) ||
      requiredApproverIds.includes(Number(user.user_id));

    if (!isApprover) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update request decision
    const updReq = await query(
      `
      UPDATE x_socrm.task_status_requests
      SET decision = $1,
          decided_by = $2,
          decided_at = CURRENT_TIMESTAMP,
          decision_note = $3
      WHERE request_id = $4
      RETURNING *
      `,
      [decision, Number(user.user_id), decision_note, request_id]
    );

    let updatedTask = task;

    if (decision === 'approved') {
      // Apply requested status to task
      const updTask = await query(
        `
        UPDATE x_socrm.tasks
        SET status = $1,
            status_note = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE task_id = $3
        RETURNING *
        `,
        [String(reqRow.requested_status), reqRow.note ?? null, Number(task.task_id)]
      );
      updatedTask = updTask.rows[0];

      await logActivity({
        entity_type: 'task',
        entity_id: Number(task.task_id),
        action: 'TASK_STATUS_REQUEST_APPROVED',
        performed_by: Number(user.user_id),
        message: `อนุมัติคำขอเปลี่ยนสถานะเป็น ${String(reqRow.requested_status)}`,
        meta: {
          request_id,
          requested_status: String(reqRow.requested_status),
          requested_by: Number(reqRow.requested_by),
          request_note: reqRow.note ?? null,
          decision_note,
        },
      });
    } else {
      await logActivity({
        entity_type: 'task',
        entity_id: Number(task.task_id),
        action: 'TASK_STATUS_REQUEST_REJECTED',
        performed_by: Number(user.user_id),
        message: `ไม่อนุมัติคำขอเปลี่ยนสถานะเป็น ${String(reqRow.requested_status)}`,
        meta: {
          request_id,
          requested_status: String(reqRow.requested_status),
          requested_by: Number(reqRow.requested_by),
          request_note: reqRow.note ?? null,
          decision_note,
        },
      });
    }

    return NextResponse.json({
      success: true,
      request: updReq.rows[0],
      task: updatedTask,
    });
  } catch (error) {
    console.error('status-requests PATCH error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
