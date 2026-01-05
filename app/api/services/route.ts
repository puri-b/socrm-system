import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentParam = searchParams.get('department');

    // ✅ Admin: เห็นทุกบริการ (หรือ filter ตาม department ได้)
    // ✅ Manager/User: เห็นเฉพาะบริการของแผนกตนเอง (ignore query param)
    const isAdmin = user.role === 'admin';
    const department = isAdmin ? departmentParam : user.department;

    let sql = `SELECT * FROM x_socrm.services`;
    const params: any[] = [];

    if (department) {
      sql += ` WHERE department = $1`;
      params.push(department);
    }

    sql += ` ORDER BY service_name`;

    const result = await query(sql, params);
    return NextResponse.json({ services: result.rows });
  } catch (error) {
    console.error('Get services error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
