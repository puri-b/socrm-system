import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, getAccessibleDepartments } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentParam = searchParams.get('department');

    // ✅ Admin: เห็นทุกบริการ (หรือ filter ตาม department ได้)
    // ✅ Digital Marketing: เห็นบริการได้หลายแผนกตามที่กำหนด (และ filter ตาม department ได้ หากอยู่ในสิทธิ์)
    // ✅ Manager/User: เห็นเฉพาะบริการของแผนกตนเอง
    const accessibleDepts = getAccessibleDepartments(user);

    let sql = `SELECT * FROM x_socrm.services`;
    const params: any[] = [];

    if (accessibleDepts === null) {
      // Admin
      if (departmentParam) {
        sql += ` WHERE department = $1`;
        params.push(departmentParam);
      }
    } else {
      // Non-admin (รวม digital_marketing)
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

    sql += ` ORDER BY service_name`;

    const result = await query(sql, params);
    return NextResponse.json({ services: result.rows });
  } catch (error) {
    console.error('Get services error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
