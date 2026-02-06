import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกอีเมลและรหัสผ่าน' },
        { status: 400 }
      );
    }

    const result = await query(
      'SELECT user_id, email, password_hash, full_name, department, role, allowed_departments, is_active FROM x_socrm.users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return NextResponse.json(
        { error: 'บัญชีของคุณถูกระงับการใช้งาน' },
        { status: 403 }
      );
    }

    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const token = generateToken({
      user_id: user.user_id,
      email: user.email,
      department: user.department,
      role: user.role,
      full_name: user.full_name,
      allowed_departments: Array.isArray(user.allowed_departments)
        ? user.allowed_departments
        : undefined,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        department: user.department,
        role: user.role,
        allowed_departments: Array.isArray(user.allowed_departments)
          ? user.allowed_departments
          : undefined,
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 วัน
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
