import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, canAccessDepartment, canManageUsers } from '@/lib/auth';

async function logActivity(params: {
  entity_type: 'customer' | 'project' | 'task';
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
    // log fail must not break main flow
    console.error('activity_logs insert failed:', e);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assigned_to');
    const customerId = searchParams.get('customer_id');


    let queryText = `
      SELECT t.*, 
             c.company_name,
             u1.full_name as assigned_to_name,
             u2.full_name as created_by_name,
             p.project_name,
             p.project_type
      FROM x_socrm.tasks t
      LEFT JOIN x_socrm.customers c ON t.customer_id = c.customer_id
      LEFT JOIN x_socrm.users u1 ON t.assigned_to = u1.user_id
      LEFT JOIN x_socrm.users u2 ON t.created_by = u2.user_id
      LEFT JOIN x_socrm.projects p ON t.project_id = p.project_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    // ✅ Visibility rule (fixes "assigned user can't see"):
    // Non-admin can see tasks that are
    // - in their department OR
    // - assigned to them OR
    // - created by them
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
      params.push(assignedTo);
      paramCount++;
    }

    if (customerId) {
  queryText += ` AND t.customer_id = $${paramCount}`;
  params.push(Number(customerId));
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const {
      customer_id,
      project_id,
      assigned_to,
      title,
      description,
      task_date,
      status,
      department
    } = data;

    if (!canAccessDepartment(user, department)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (assigned_to !== user.user_id && !canManageUsers(user)) {
      return NextResponse.json({ 
        error: 'เฉพาะ Manager และ Admin เท่านั้นที่สามารถมอบหมายงานให้ผู้อื่นได้' 
      }, { status: 403 });
    }

    const result = await query(
      `INSERT INTO x_socrm.tasks (
        customer_id, project_id, assigned_to, created_by, title, description,
        task_date, status, department
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        customer_id || null,
        project_id || null,
        assigned_to,
        user.user_id,
        title,
        description,
        task_date,
        status || 'pending',
        department
      ]
    );

    const task = result.rows[0];

    await logActivity({
      entity_type: 'task',
      entity_id: task.task_id,
      action: 'TASK_CREATED',
      performed_by: user.user_id,
      message: `สร้างงาน: ${title}`,
      meta: {
        customer_id: customer_id || null,
        project_id: project_id || null,
        assigned_to,
        status: status || 'pending',
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { task_id, status } = data;

    const result = await query(
      `UPDATE x_socrm.tasks 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE task_id = $2
       RETURNING *`,
      [status, task_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await logActivity({
      entity_type: 'task',
      entity_id: Number(task_id),
      action: 'TASK_STATUS_UPDATED',
      performed_by: user.user_id,
      message: `อัปเดตสถานะงานเป็น ${status}`,
      meta: { status },
    });

    return NextResponse.json({ success: true, task: result.rows[0] });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}