import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, canAccessDepartment, canManageUsers } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assigned_to');

    let queryText = `
      SELECT t.*, 
             c.company_name,
             u1.full_name as assigned_to_name,
             u2.full_name as created_by_name
      FROM x_socrm.tasks t
      LEFT JOIN x_socrm.customers c ON t.customer_id = c.customer_id
      LEFT JOIN x_socrm.users u1 ON t.assigned_to = u1.user_id
      LEFT JOIN x_socrm.users u2 ON t.created_by = u2.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    // ✅ การมองเห็นงาน:
    // - Admin เห็นทุกแผนก
    // - Manager/User เห็นงานในแผนกตนเองเป็นหลัก
    // - และเพื่อกันเคสงานถูกมอบหมายข้ามเงื่อนไข/ข้อมูล department ไม่ตรงกัน
    //   ให้ผู้รับผิดชอบ (assigned_to) และผู้สร้าง (created_by) มองเห็นงานของตนเองเสมอ
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
      assigned_to,
      title,
      description,
      task_date,
      status,
      department
    } = data;

    const assignedToId = assigned_to !== undefined && assigned_to !== null ? Number(assigned_to) : user.user_id;
    // ✅ กันเคส client ส่ง department ไม่มา/ว่าง ให้ใช้ department จาก token เป็นหลัก
    const taskDepartment = (department && String(department).trim()) ? String(department).trim() : user.department;

    if (!canAccessDepartment(user, taskDepartment)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (assignedToId !== user.user_id && !canManageUsers(user)) {
      return NextResponse.json({ 
        error: 'เฉพาะ Manager และ Admin เท่านั้นที่สามารถมอบหมายงานให้ผู้อื่นได้' 
      }, { status: 403 });
    }

    const result = await query(
      `INSERT INTO x_socrm.tasks (
        customer_id, assigned_to, created_by, title, description,
        task_date, status, department
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        customer_id || null,
        assignedToId,
        user.user_id,
        title,
        description,
        task_date,
        status || 'pending',
        taskDepartment
      ]
    );

    return NextResponse.json({ success: true, task: result.rows[0] });
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

    return NextResponse.json({ success: true, task: result.rows[0] });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}