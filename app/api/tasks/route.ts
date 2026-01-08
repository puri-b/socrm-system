import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, canAccessDepartment, canManageUsers } from '@/lib/auth';

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

const RESTRICTED_STATUSES = new Set(['completed', 'cancelled', 'postponed']);
const ALLOWED_STATUSES = new Set(['pending', 'in_progress', 'completed', 'cancelled', 'postponed', 'not_approved']);

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assigned_to');
    const customerId = searchParams.get('customer_id');
    const projectId = searchParams.get('project_id');

    let queryText = `
      SELECT t.*,
             c.company_name,
             u1.full_name as assigned_to_name,
             u2.full_name as created_by_name,
             u3.full_name as assigned_by_name,
             p.project_name,
             p.project_type,

             -- latest pending request
             r.request_id as pending_request_id,
             r.requested_status as pending_requested_status,
             r.note as pending_note,
             r.requested_by as pending_requested_by,
             u4.full_name as pending_requested_by_name,
             r.created_at as pending_requested_at

      FROM x_socrm.tasks t
      LEFT JOIN x_socrm.customers c ON t.customer_id = c.customer_id
      LEFT JOIN x_socrm.users u1 ON t.assigned_to = u1.user_id
      LEFT JOIN x_socrm.users u2 ON t.created_by = u2.user_id
      LEFT JOIN x_socrm.users u3 ON t.assigned_by = u3.user_id
      LEFT JOIN x_socrm.projects p ON t.project_id = p.project_id

      LEFT JOIN LATERAL (
        SELECT r1.*
        FROM x_socrm.task_status_requests r1
        WHERE r1.task_id = t.task_id AND r1.decision = 'pending'
        ORDER BY r1.created_at DESC
        LIMIT 1
      ) r ON true
      LEFT JOIN x_socrm.users u4 ON r.requested_by = u4.user_id

      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    // visibility (เดิมของคุณ): non-admin เห็นงานของแผนกตัวเอง หรือ assigned_to/created_by เป็นตัวเอง
    if (user.role !== 'admin') {
      queryText += ` AND (t.department = $${paramCount} OR t.assigned_to = $${paramCount + 1} OR t.created_by = $${paramCount + 2})`;
      params.push(user.department, user.user_id, user.user_id);
      paramCount += 3;
    }

    if (status) {
      queryText += ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    if (assignedTo) {
      queryText += ` AND t.assigned_to = $${paramCount}`;
      params.push(Number(assignedTo));
      paramCount++;
    }
    if (customerId) {
      queryText += ` AND t.customer_id = $${paramCount}`;
      params.push(Number(customerId));
      paramCount++;
    }
    if (projectId) {
      queryText += ` AND t.project_id = $${paramCount}`;
      params.push(Number(projectId));
      paramCount++;
    }

    queryText += ' ORDER BY t.task_date DESC, t.created_at DESC';

    const result = await query(queryText, params);
    return NextResponse.json({ tasks: result.rows });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    const {
      customer_id,
      project_id,
      assigned_to,
      title,
      description,
      task_date,
      status,
      department,
    } = data;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: 'กรุณาระบุ title' }, { status: 400 });
    }
    if (!assigned_to) {
      return NextResponse.json({ error: 'กรุณาระบุ assigned_to' }, { status: 400 });
    }
    if (!task_date) {
      return NextResponse.json({ error: 'กรุณาระบุ task_date' }, { status: 400 });
    }

    const dept = department || user.department;

    if (!canAccessDepartment(user, dept)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // manager/admin เท่านั้นที่ assign ให้คนอื่นได้
    if (Number(assigned_to) !== Number(user.user_id) && !canManageUsers(user)) {
      return NextResponse.json(
        { error: 'เฉพาะ Manager และ Admin เท่านั้นที่สามารถมอบหมายงานให้ผู้อื่นได้' },
        { status: 403 }
      );
    }

    const taskStatus = status || 'pending';
    if (!ALLOWED_STATUSES.has(String(taskStatus))) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // ✅ customer_id / project_id "ไม่บังคับ" (ส่ง null ได้)
    const result = await query(
      `INSERT INTO x_socrm.tasks (
        customer_id, project_id, assigned_to, assigned_by, created_by, title, description,
        task_date, status, department
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        customer_id ? Number(customer_id) : null,
        project_id ? Number(project_id) : null,
        Number(assigned_to),
        user.user_id, // assigned_by
        user.user_id, // created_by
        String(title).trim(),
        description ? String(description) : null,
        task_date,
        String(taskStatus),
        dept,
      ]
    );

    const task = result.rows[0];

    await logActivity({
      entity_type: 'task',
      entity_id: task.task_id,
      action: 'TASK_CREATED',
      performed_by: user.user_id,
      message: `สร้างงาน: ${task.title}`,
      meta: {
        customer_id: task.customer_id,
        project_id: task.project_id,
        assigned_to: task.assigned_to,
        assigned_by: task.assigned_by,
        status: task.status,
      },
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    const { task_id, status, note } = data;

    if (!task_id || !status) {
      return NextResponse.json({ error: 'task_id และ status จำเป็นต้องระบุ' }, { status: 400 });
    }

    const newStatus = String(status);
    if (!ALLOWED_STATUSES.has(newStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Load task
    const taskRes = await query(
      `
      SELECT t.*
      FROM x_socrm.tasks t
      WHERE t.task_id = $1
      `,
      [Number(task_id)]
    );

    if (taskRes.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = taskRes.rows[0];

    // visibility (match GET)
    if (user.role !== 'admin') {
      const ok =
        task.department === user.department ||
        Number(task.assigned_to) === Number(user.user_id) ||
        Number(task.created_by) === Number(user.user_id);
      if (!ok) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // ✅ ถ้าสถานะต้อง approval: สร้าง request ส่งให้ "ผู้สร้างงาน" เท่านั้น
    if (RESTRICTED_STATUSES.has(newStatus)) {
      if (newStatus === 'postponed' && (!note || String(note).trim().length === 0)) {
        return NextResponse.json({ error: 'สถานะ "ขอเลื่อน" ต้องระบุหมายเหตุ (note)' }, { status: 400 });
      }

      // ✅ ป้องกันสร้างคำขอซ้ำ ถ้ามี pending อยู่แล้ว
      const pendingRes = await query(
        `
        SELECT request_id, requested_status, note, requested_by, created_at
        FROM x_socrm.task_status_requests
        WHERE task_id = $1 AND decision = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [Number(task.task_id)]
      );

      if (pendingRes.rows.length > 0) {
        return NextResponse.json({
          success: true,
          requires_approval: true,
          request: pendingRes.rows[0],
          message: 'มีคำขอรออนุมัติอยู่แล้ว',
        });
      }

      // ✅ ผู้อนุมัติ = ผู้สร้างงานเท่านั้น
      const requiredApproverIds = [Number(task.created_by)];

      const reqRes = await query(
        `
        INSERT INTO x_socrm.task_status_requests
          (task_id, requested_status, note, requested_by, required_approver_ids)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [
          Number(task.task_id),
          newStatus,
          note ? String(note) : null,
          Number(user.user_id),
          requiredApproverIds,
        ]
      );

      const reqRow = reqRes.rows[0];

      await logActivity({
        entity_type: 'task',
        entity_id: Number(task.task_id),
        action: 'TASK_STATUS_CHANGE_REQUESTED',
        performed_by: Number(user.user_id),
        message: `ขอเปลี่ยนสถานะงานเป็น ${newStatus} (รอผู้สร้างงานอนุมัติ)`,
        meta: {
          request_id: reqRow.request_id,
          requested_status: newStatus,
          note: note ? String(note) : null,
          approver: Number(task.created_by),
        },
      });

      return NextResponse.json({
        success: true,
        requires_approval: true,
        request: reqRow,
      });
    }

    // ✅ สถานะทั่วไป: อัปเดตได้ทันที (assigned ทำได้)
    const updRes = await query(
      `
      UPDATE x_socrm.tasks
      SET status = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE task_id = $2
      RETURNING *
      `,
      [newStatus, Number(task.task_id)]
    );

    await logActivity({
      entity_type: 'task',
      entity_id: Number(task.task_id),
      action: 'TASK_STATUS_UPDATED',
      performed_by: Number(user.user_id),
      message: `อัปเดตสถานะงานเป็น ${newStatus}`,
      meta: { status: newStatus },
    });

    return NextResponse.json({ success: true, task: updRes.rows[0] });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
