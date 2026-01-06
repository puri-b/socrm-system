import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, canAccessDepartment } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const status = searchParams.get('status');

    // รวมบริการจากตาราง customer_services เพื่อให้หน้า customers แสดง/แก้ไขบริการได้
    let queryText = `
      SELECT
        c.*,
        u.full_name as sales_person_name,
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'service_id', s.service_id,
              'service_name', s.service_name,
              'requires_quantity', s.requires_quantity,
              'quantity_unit', s.quantity_unit,
              'quantity', cs.quantity
            )
          ) FILTER (WHERE s.service_id IS NOT NULL),
          '[]'::jsonb
        ) AS customer_services,
        NULLIF(string_agg(DISTINCT s.service_name, ', '), '') AS customer_service_display
      FROM x_socrm.customers c
      LEFT JOIN x_socrm.users u ON c.sales_person_id = u.user_id
      LEFT JOIN x_socrm.customer_services cs ON cs.customer_id = c.customer_id
      LEFT JOIN x_socrm.services s ON s.service_id = cs.service_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (user.role !== 'admin') {
      queryText += ` AND c.department = $${paramCount}`;
      params.push(user.department);
      paramCount++;
    } else if (department) {
      queryText += ` AND c.department = $${paramCount}`;
      params.push(department);
      paramCount++;
    }

    if (status) {
      queryText += ` AND c.lead_status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    queryText += ' GROUP BY c.customer_id, u.full_name ORDER BY c.created_at DESC';

    const result = await query(queryText, params);
    return NextResponse.json({ customers: result.rows });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const {
      company_name,
      email,
      phone,
      location,
      registration_info,
      business_type,
      budget,
      contact_person,
      service_interested,
      lead_source,
      search_keyword,
      is_quality_lead,
      sales_person_id,
      lead_status,
      contract_value,
      pain_points,
      contract_duration,
      contract_start_date,
      contract_end_date,
      department,
      services,
      selectedServices,
    } = data;

    if (!canAccessDepartment(user, department)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const result = await query(
      `INSERT INTO x_socrm.customers (
        company_name, email, phone, location, registration_info, business_type,
        budget, contact_person, service_interested, lead_source, search_keyword,
        is_quality_lead, sales_person_id, lead_status, contract_value, pain_points,
        contract_duration, contract_start_date, contract_end_date, department, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        company_name,
        email,
        phone,
        location,
        registration_info,
        business_type,
        budget,
        contact_person,
        service_interested,
        lead_source,
        search_keyword,
        is_quality_lead,
        sales_person_id,
        lead_status || 'Lead',
        contract_value,
        pain_points,
        contract_duration,
        contract_start_date,
        contract_end_date,
        department,
        user.user_id,
      ]
    );

    const customer = result.rows[0];

    // รองรับได้ทั้ง services และ selectedServices (กันกรณี frontend ส่งชื่อ field ไม่ตรง)
    const svcRows = (Array.isArray(services) ? services : Array.isArray(selectedServices) ? selectedServices : [])
      .filter((s: any) => s && s.service_id)
      .map((s: any) => ({
        service_id: Number(s.service_id),
        quantity: Math.max(1, Number(s.quantity ?? 1)),
      }));

    if (svcRows.length > 0) {
      for (const s of svcRows) {
        await query(
          `INSERT INTO x_socrm.customer_services (customer_id, service_id, quantity)
           VALUES ($1, $2, $3)`,
          [customer.customer_id, s.service_id, s.quantity]
        );
      }
    }

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
