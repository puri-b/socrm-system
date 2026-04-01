import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' }, { status: 400 });
    }

    const result = await query(
      `SELECT *
       FROM x_socrm.users
       WHERE email = $1 AND is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    if (result.rows.length > 1) {
      return NextResponse.json(
        { error: 'พบบัญชีผู้ใช้อีเมลนี้มากกว่า 1 รายการ กรุณาติดต่อ Admin เพื่อจัดการข้อมูล' },
        { status: 409 }
      );
    }

    const user = result.rows[0];

    if (user.allow_local_login === false || user.user_provider === 'AzureAD') {
      return NextResponse.json(
        { error: 'บัญชีนี้เปิดใช้งานเฉพาะการเข้าสู่ระบบด้วย Microsoft' },
        { status: 403 }
      );
    }

    const isValid = await bcrypt.compare(String(password), String(user.password_hash));
    if (!isValid) {
      return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    const token = generateToken({
      user_id: user.user_id,
      email: user.email,
      department: user.department,
      role: user.role,
      full_name: user.full_name,
    } as any);

    const response = NextResponse.json({
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        department: user.department,
        role: user.role,
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' }, { status: 500 });
  }
}
