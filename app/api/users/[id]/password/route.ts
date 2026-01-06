import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requester = getUserFromRequest(request);
    if (!requester) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetUserId = Number(params.id);
    if (!Number.isFinite(targetUserId)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const body = await request.json();
    const newPassword = String(body?.new_password || '');
    const currentPassword = body?.current_password ? String(body.current_password) : '';

    // ✅ Policy ขั้นต่ำ
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' },
        { status: 400 }
      );
    }

    // โหลด user เป้าหมาย (ต้องมี password_hash เพื่อตรวจรหัสเก่า)
    const targetRes = await query(
      `SELECT user_id, password_hash
       FROM x_socrm.users
       WHERE user_id = $1 AND is_active = true`,
      [targetUserId]
    );

    if (targetRes.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 });
    }

    const target = targetRes.rows[0];
    const isSelf = Number(requester.user_id) === Number(target.user_id);
    const isAdmin = String(requester.role) === 'admin';

    /**
     * ✅ RULE ตามที่คุณกำหนด
     * - Admin: เปลี่ยนให้คนอื่นได้ ไม่ต้องใส่รหัสเก่า
     * - Manager/User: เปลี่ยนได้เฉพาะของตนเอง และต้องใส่รหัสเก่า
     */
    if (!isAdmin) {
      // manager/user
      if (!isSelf) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'กรุณากรอกรหัสผ่านปัจจุบัน' },
          { status: 400 }
        );
      }
      const ok = await bcrypt.compare(currentPassword, String(target.password_hash));
      if (!ok) {
        return NextResponse.json(
          { error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' },
          { status: 401 }
        );
      }
    }

    // hash และ update
    const hashed = await bcrypt.hash(newPassword, 10);

    await query(
      `UPDATE x_socrm.users
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [hashed, targetUserId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' },
      { status: 500 }
    );
  }
}
