import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, canManageUsers, isAdmin, hashPassword } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');

    let queryText = `
      SELECT user_id, email, full_name, department, role, is_active, created_at
      FROM x_socrm.users
      WHERE is_active = true
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // ✅ Admin เห็นทุกแผนก (ถ้าส่ง department มาก็ filter ให้)
    if (isAdmin(user)) {
      if (department) {
        queryText += ` AND department = $${paramIndex}`;
        params.push(department);
        paramIndex++;
      }
    } else {
      // ✅ Manager/User เห็นเฉพาะแผนกตัวเองเท่านั้น
      queryText += ` AND department = $${paramIndex}`;
      params.push(user.department);
      paramIndex++;
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);
    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !canManageUsers(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { email, password, full_name, department, role } = data;

    if (!email || !password || !full_name || !department || !role) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    if (role === 'admin' && !isAdmin(user)) {
      return NextResponse.json(
        { error: 'เฉพาะ Admin เท่านั้นที่สามารถสร้าง Admin ใหม่ได้' },
        { status: 403 }
      );
    }

    if (role === 'manager' && !isAdmin(user)) {
      return NextResponse.json(
        { error: 'เฉพาะ Admin เท่านั้นที่สามารถสร้าง Manager ได้' },
        { status: 403 }
      );
    }

    if (!isAdmin(user) && department !== user.department) {
      return NextResponse.json(
        { error: 'คุณสามารถสร้างผู้ใช้ในแผนกของคุณเท่านั้น' },
        { status: 403 }
      );
    }

    const existingUser = await query(
      'SELECT user_id FROM x_socrm.users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'อีเมลนี้ถูกใช้งานแล้ว' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const result = await query(
      `INSERT INTO x_socrm.users (email, password_hash, full_name, department, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, email, full_name, department, role, is_active, created_at`,
      [email, passwordHash, full_name, department, role]
    );

    return NextResponse.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
