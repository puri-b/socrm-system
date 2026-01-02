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
    const department = searchParams.get('department');

    if (!department) {
      return NextResponse.json({ error: 'Department required' }, { status: 400 });
    }

    const result = await query(
      `SELECT * FROM x_socrm.services WHERE department = $1 ORDER BY service_name`,
      [department]
    );

    return NextResponse.json({ services: result.rows });
  } catch (error) {
    console.error('Get services error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}