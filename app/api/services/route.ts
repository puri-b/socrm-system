import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, getAccessibleDepartments, isAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentParam = searchParams.get('department');

    const accessibleDepts = getAccessibleDepartments(user);
    let sql = `SELECT * FROM x_socrm.services`;
    const params: any[] = [];

    if (accessibleDepts === null) {
      if (departmentParam) {
        sql += ` WHERE department = $1`;
        params.push(departmentParam);
      }
    } else {
      if (accessibleDepts.length === 0) {
        return NextResponse.json({ services: [] });
      }

      if (departmentParam && accessibleDepts.includes(departmentParam)) {
        sql += ` WHERE department = $1`;
        params.push(departmentParam);
      } else {
        sql += ` WHERE department = ANY($1::text[])`;
        params.push(accessibleDepts);
      }
    }

    sql += ` ORDER BY department ASC, service_name ASC`;

    const result = await query(sql, params);
    return NextResponse.json({ services: result.rows });
  } catch (error) {
    console.error('Get services error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'เฉพาะ Admin เท่านั้นที่เพิ่มบริการได้' }, { status: 403 });
    }

    const body = await request.json();
    const serviceName = String(body?.service_name || '').trim();
    const department = String(body?.department || '').trim();
    const quantityUnit = String(body?.quantity_unit || '').trim();

    if (!serviceName) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อบริการ' }, { status: 400 });
    }

    if (!department) {
      return NextResponse.json({ error: 'กรุณาเลือกแผนก' }, { status: 400 });
    }

    if (!quantityUnit) {
      return NextResponse.json({ error: 'กรุณาเลือกหน่วย' }, { status: 400 });
    }

    const duplicateCheck = await query(
      `SELECT service_id
       FROM x_socrm.services
       WHERE LOWER(TRIM(service_name)) = LOWER(TRIM($1))
         AND department = $2
       LIMIT 1`,
      [serviceName, department]
    );

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json({ error: 'บริการนี้มีอยู่แล้วในแผนกที่เลือก' }, { status: 409 });
    }

    const insertResult = await query(
      `INSERT INTO x_socrm.services (department, service_name, requires_quantity, quantity_unit)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [department, serviceName, true, quantityUnit]
    );

    return NextResponse.json({ success: true, service: insertResult.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Create service error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกบริการ' }, { status: 500 });
  }
}
