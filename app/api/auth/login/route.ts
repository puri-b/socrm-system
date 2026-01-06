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

    // ✅ ไม่ต้องส่ง department แล้ว: หา user จาก email อย่างเดียว
    const result = await query(
      'SELECT * FROM x_socrm.users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // กันกรณีมี email ซ้ำหลายแผนก (ไม่ควรเกิด แต่ป้องกันไว้)
    if (result.rows.length > 1) {
      return NextResponse.json(
        { error: 'พบบัญชีผู้ใช้อีเมลนี้มากกว่า 1 แผนก กรุณาติดต่อ Admin เพื่อจัดการข้อมูล' },
        { status: 409 }
      );
    }

    const user = result.rows[0];

    // ✅ ตรวจรหัสผ่าน
    const isValid = await bcrypt.compare(String(password), String(user.password_hash));
    if (!isValid) {
      return NextResponse.json(
        { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // ✅ token จะเก็บ department จาก DB อัตโนมัติ
    const token = generateToken({
      user_id: user.user_id,
      email: user.email,
      department: user.department,
      role: user.role,
      full_name: user.full_name,
    });

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
      maxAge: 60 * 60 * 24 * 7, // 7 วัน
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}
