import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, canAccessDepartment, getAccessibleDepartments } from '@/lib/auth';

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

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');
    const department = searchParams.get('department');

    let q = `
      SELECT p.*, c.company_name
      FROM x_socrm.projects p
      LEFT JOIN x_socrm.customers c ON p.customer_id = c.customer_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let i = 1;

    // Visibility (รองรับ digital_marketing)
    const accessibleDepts = getAccessibleDepartments(user);
    if (accessibleDepts === null) {
      if (department) {
        q += ` AND (c.department = $${i} OR p.department = $${i})`;
        params.push(department);
        i++;
      }
    } else {
      if (accessibleDepts.length === 0) {
        return NextResponse.json({ projects: [] });
      }
      if (department && accessibleDepts.includes(department)) {
        q += ` AND (c.department = $${i} OR p.department = $${i})`;
        params.push(department);
        i++;
      } else {
        q += ` AND (c.department = ANY($${i}::text[]) OR p.department = ANY($${i}::text[]))`;
        params.push(accessibleDepts);
        i++;
      }
    }

    if (customerId) {
      q += ` AND p.customer_id = $${i}`;
      params.push(customerId);
      i++;
    }

    q += ` ORDER BY p.created_at DESC`;

    const result = await query(q, params);
    return NextResponse.json({ projects: result.rows });
  } catch (error) {
    console.error('Get projects error:', error);
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
      project_name,
      project_type,
      description,
      status,
      department,
    } = data;

    if (!customer_id || !project_name) {
      return NextResponse.json({ error: 'customer_id และ project_name จำเป็นต้องระบุ' }, { status: 400 });
    }

    const customerRes = await query(
      `SELECT customer_id, department, company_name FROM x_socrm.customers WHERE customer_id = $1`,
      [customer_id]
    );
    if (customerRes.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบลูกค้า' }, { status: 404 });
    }

    const customerDept = customerRes.rows[0].department;
    if (!canAccessDepartment(user, customerDept)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const deptToSave = department || customerDept || user.department;

    const result = await query(
      `INSERT INTO x_socrm.projects (
        customer_id, project_name, project_type, description, status, department, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        customer_id,
        project_name,
        project_type,
        description,
        status || 'open',
        deptToSave,
        user.user_id,
      ]
    );

    const project = result.rows[0];

    await logActivity({
      entity_type: 'project',
      entity_id: project.project_id,
      action: 'create',
      performed_by: user.user_id,
      message: `สร้างโปรเจกต์: ${project.project_name}`,
      meta: { customer_id },
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
