import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, department } = body as {
      email?: string;
      password?: string;
      department?: string;
    };

    console.log('Login attempt:', { email, department });

    if (!email || !password || !department) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    const result = await query(
      'SELECT * FROM x_socrm.users WHERE email = $1 AND department = $2 AND is_active = true',
      [email, department]
    );

    console.log('User found:', result.rows.length);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'อีเมล, รหัสผ่าน หรือแผนกไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // 🔎 Debug ชั่วคราว (เอาออกได้ทีหลัง)
    console.log("Password len:", String(password).length);
    console.log("Password startsWith $2a$:", String(password).startsWith("$2a$"));
    console.log("Password raw:", JSON.stringify(password));
    console.log("Dept:", department);
    console.log("Hash from DB:", String(user.password_hash));

    console.log('Hash from DB (prefix):', String(user.password_hash).slice(0, 7)); // ควรขึ้นต้นด้วย "$2a$10$"
    console.log('Comparing password...');

    // ✅ ใช้ bcrypt.compare ตรง ๆ (ข้าม comparePassword ที่อาจเขียนผิด)
    const isValid = await bcrypt.compare(String(password), String(user.password_hash));

    console.log('Password valid:', isValid);

    if (!isValid) {
      return NextResponse.json(
        { error: 'อีเมล, รหัสผ่าน หรือแผนกไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const token = generateToken({
      user_id: user.user_id,
      email: user.email,
      department: user.department,
      role: user.role,
      full_name: user.full_name
    });

    const response = NextResponse.json({
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        department: user.department,
        role: user.role
      }
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 วัน
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
