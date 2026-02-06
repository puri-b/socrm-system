import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, canManageUsers, getAccessibleDepartments, isAdmin, hashPassword } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');

    let queryText = `
      SELECT user_id, email, full_name, department, role, allowed_departments, is_active, created_at
      FROM x_socrm.users
      WHERE is_active = true
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // ✅ Admin เห็นทุกแผนก (ถ้าส่ง department มาก็ filter ให้)
    // ✅ Digital Marketing เห็นเฉพาะแผนกที่กำหนด
    // ✅ User/Manager เห็นเฉพาะแผนกตนเอง
    const accessibleDepts = getAccessibleDepartments(user);

    if (accessibleDepts === null) {
      if (department) {
        queryText += ` AND department = $${paramIndex}`;
        params.push(department);
        paramIndex++;
      }
    } else {
      if (accessibleDepts.length === 0) {
        return NextResponse.json({ users: [] });
      }
      queryText += ` AND department = ANY($${paramIndex}::text[])`;
      params.push(accessibleDepts);
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
    const { email, password, full_name, department, role, allowed_departments } = data;

    if (!email || !password || !full_name || !department || !role) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // ✅ role ใหม่: digital_marketing (สร้างได้โดย Admin เท่านั้น)
    if (role === 'digital_marketing' && !isAdmin(user)) {
      return NextResponse.json(
        { error: 'เฉพาะ Admin เท่านั้นที่สามารถสร้าง Digital Marketing ได้' },
        { status: 403 }
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

    // digital_marketing ต้องมี allowed_departments อย่างน้อย 1 แผนก และต้องรวม department ไว้ด้วย
    let allowedDepts: string[] | null = null;
    if (role === 'digital_marketing') {
      const arr = Array.isArray(allowed_departments) ? allowed_departments.map(String) : [];
      const unique = Array.from(new Set(arr.filter(Boolean)));
      // ถ้า user เลือกไม่ครบ ให้ใส่ department เป็น default
      if (!unique.includes(String(department))) unique.push(String(department));
      if (unique.length === 0) {
        return NextResponse.json(
          { error: 'กรุณาเลือกแผนกที่ Digital Marketing สามารถเข้าถึงอย่างน้อย 1 แผนก' },
          { status: 400 }
        );
      }
      allowedDepts = unique;
    }

    const result = await query(
      `INSERT INTO x_socrm.users (email, password_hash, full_name, department, role, allowed_departments)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, email, full_name, department, role, allowed_departments, is_active, created_at`,
      [email, passwordHash, full_name, department, role, allowedDepts]
    );

    return NextResponse.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
