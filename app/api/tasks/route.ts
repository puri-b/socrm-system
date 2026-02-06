import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, canAccessDepartment, canManageUsers, getAccessibleDepartments } from '@/lib/auth';

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

const ALLOWED_STATUSES = new Set([
  'pending',
  'in_progress',
  'done',
  'cancelled',
  'postponed',
]);

const RESTRICTED_STATUSES = new Set(['done', 'cancelled', 'postponed']); // ต้องขออนุมัติ

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

    // visibility (รองรับ digital_marketing):
    // - admin: เห็นทั้งหมด
    // - non-admin: เห็นงานของแผนกที่เข้าถึงได้ + งานที่ assigned_to/created_by เป็นตัวเอง
    const accessibleDepts = getAccessibleDepartments(user);
    if (accessibleDepts !== null) {
      if (accessibleDepts.length === 0) {
        queryText += ` AND (t.assigned_to = $${paramCount} OR t.created_by = $${paramCount + 1})`;
        params.push(user.user_id, user.user_id);
        paramCount += 2;
      } else {
        queryText += ` AND (t.department = ANY($${paramCount}::text[]) OR t.assigned_to = $${paramCount + 1} OR t.created_by = $${paramCount + 2})`;
        params.push(accessibleDepts, user.user_id, user.user_id);
        paramCount += 3;
      }
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
      title,
      description,
      task_date,
      status,
      department,
      assigned_to,
      project_id,
    } = data;

    if (!customer_id || !title) {
      return NextResponse.json({ error: 'customer_id และ title จำเป็นต้องระบุ' }, { status: 400 });
    }

    // Determine customer department to authorize
    const custRes = await query(`SELECT customer_id, department, company_name FROM x_socrm.customers WHERE customer_id = $1`, [Number(customer_id)]);
    if (custRes.rows.length === 0) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const customerDept = String(custRes.rows[0].department);
    if (!canAccessDepartment(user, customerDept)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const deptToSave = String(department || customerDept || user.department);
    const assignedTo = assigned_to ? Number(assigned_to) : user.user_id;

    const result = await query(
      `INSERT INTO x_socrm.tasks (
        customer_id, assigned_to, created_by, title, description, task_date, status, department, project_id, assigned_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        Number(customer_id),
        assignedTo,
        user.user_id,
        title,
        description || null,
        task_date || null,
        status || 'pending',
        deptToSave,
        project_id ? Number(project_id) : null,
        user.user_id,
      ]
    );

    const task = result.rows[0];

    await logActivity({
      entity_type: 'task',
      entity_id: task.task_id,
      action: 'create',
      performed_by: user.user_id,
      message: `สร้างงาน: ${task.title}`,
      meta: { customer_id, project_id: project_id ?? null },
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

    // visibility (match GET) รองรับ digital_marketing
    if (user.role !== 'admin') {
      const accessibleDepts = getAccessibleDepartments(user) || [];
      const ok =
        accessibleDepts.includes(String(task.department)) ||
        Number(task.assigned_to) === Number(user.user_id) ||
        Number(task.created_by) === Number(user.user_id);
      if (!ok) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // ✅ ถ้าสถานะต้อง approval: สร้าง request ส่งให้ "ผู้สร้างงาน" เท่านั้น
    if (RESTRICTED_STATUSES.has(newStatus)) {
      if (newStatus === 'postponed' && (!note || String(note).trim().length === 0)) {
        return NextResponse.json({ error: 'สถานะ "ขอเลื่อน" ต้องระบุหมายเหตุ (note)' }, { status: 400 });
      }

      const pendingRes = await query(
        `
        SELECT request_id, requested_status, note, requested_by, created_at
        FROM x_socrm.task_status_requests
        WHERE task_id = $1 AND decision = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [Number(task_id)]
      );

      if (pendingRes.rows.length > 0) {
        return NextResponse.json({ error: 'มีคำขอรออนุมัติอยู่แล้ว' }, { status: 400 });
      }

      const requiredApproverIds = [Number(task.created_by)];
      const reqRes = await query(
        `
        INSERT INTO x_socrm.task_status_requests (task_id, requested_status, note, requested_by, required_approver_ids)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [Number(task_id), newStatus, note || null, user.user_id, JSON.stringify(requiredApproverIds)]
      );

      await logActivity({
        entity_type: 'task',
        entity_id: Number(task_id),
        action: 'request_status_change',
        performed_by: user.user_id,
        message: `ขอเปลี่ยนสถานะงานเป็น: ${newStatus}`,
        meta: { note: note || null, required_approver_ids: requiredApproverIds },
      });

      return NextResponse.json({ success: true, request: reqRes.rows[0], requires_approval: true });
    }

    // ✅ สถานะทั่วไป (ไม่ต้อง approval)
    const upd = await query(
      `
      UPDATE x_socrm.tasks
      SET status = $1, status_note = $2, updated_at = CURRENT_TIMESTAMP
      WHERE task_id = $3
      RETURNING *
      `,
      [newStatus, note || null, Number(task_id)]
    );

    await logActivity({
      entity_type: 'task',
      entity_id: Number(task_id),
      action: 'update_status',
      performed_by: user.user_id,
      message: `เปลี่ยนสถานะงานเป็น: ${newStatus}`,
      meta: { note: note || null },
    });

    return NextResponse.json({ success: true, task: upd.rows[0], requires_approval: false });
  } catch (error) {
    console.error('Update task status error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
