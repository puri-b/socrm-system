import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateToken, hashPassword } from '@/lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ALLOWED_DEPARTMENTS = ['LBD', 'LBA', 'CR', 'LM', 'DS', 'SN'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = String(body?.token || '');
    const first_name = String(body?.first_name || '').trim();
    const last_name = String(body?.last_name || '').trim();
    const department = String(body?.department || '').trim();

    if (!token || !first_name || !last_name || !department) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    if (!ALLOWED_DEPARTMENTS.includes(department)) {
      return NextResponse.json({ error: 'แผนกไม่ถูกต้อง' }, { status: 400 });
    }

    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (!payload || payload.type !== 'sso_onboarding' || !payload.email) {
      return NextResponse.json({ error: 'ข้อมูลการยืนยันหมดอายุ กรุณาเริ่มเข้าสู่ระบบใหม่อีกครั้ง' }, { status: 401 });
    }

    const email = String(payload.email).trim();
    const providerUserId = payload.provider_user_id ? String(payload.provider_user_id) : null;
    const full_name = `${first_name} ${last_name}`.trim();

    const existing = await query(
      `SELECT user_id, email, full_name, department, role, is_active
       FROM x_socrm.users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email]
    );

    let user: any;

    if (existing.rows.length > 0) {
      user = existing.rows[0];
      if (!user.is_active) {
        return NextResponse.json({ error: 'บัญชีนี้ถูกปิดการใช้งาน' }, { status: 403 });
      }

      await query(
        `UPDATE x_socrm.users
         SET provider_user_id = COALESCE($1, provider_user_id),
             allow_sso_login = true,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [providerUserId, user.user_id]
      );
    } else {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await hashPassword(randomPassword);

      const inserted = await query(
        `INSERT INTO x_socrm.users (
          email, password_hash, full_name, first_name, last_name, department,
          role, is_active, user_provider, provider_user_id, allow_local_login, allow_sso_login
        ) VALUES ($1, $2, $3, $4, $5, $6, 'user', true, 'AzureAD', $7, false, true)
        RETURNING user_id, email, full_name, department, role, is_active`,
        [email, passwordHash, full_name, first_name, last_name, department, providerUserId]
      );

      user = inserted.rows[0];
    }

    const appToken = generateToken({
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

    response.cookies.set('token', appToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Create SSO profile error:', error);
    return NextResponse.json({ error: 'ไม่สามารถบันทึกข้อมูลได้' }, { status: 500 });
  }
}
