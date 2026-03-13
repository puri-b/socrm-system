import { NextRequest, NextResponse } from 'next/server';
import { getClient, query } from '@/lib/db';
import { canAccessDepartment, getUserFromRequest } from '@/lib/auth';

function toNullableString(v: any) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

function toNullableNumber(v: any) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = params.id;

    const result = await query(
      `SELECT
         c.*,
         u.full_name AS sales_person_name,
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
       WHERE c.customer_id = $1
       GROUP BY c.customer_id, u.full_name`,
      [customerId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลลูกค้า' }, { status: 404 });
    }

    const customer = result.rows[0];

    if (!canAccessDepartment(user, customer.department)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Get customer error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลลูกค้า' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = params.id;
    const data = await request.json();

    const incomingServices = Array.isArray(data.services)
      ? data.services
      : Array.isArray(data.selectedServices)
        ? data.selectedServices
        : [];

    const cleanData = {
      company_name: data.company_name,
      email: toNullableString(data.email),
      phone: toNullableString(data.phone),
      location: toNullableString(data.location),
      registration_info: toNullableString(data.registration_info),
      business_type: toNullableString(data.business_type),
      budget: toNullableNumber(data.budget),
      contact_person: toNullableString(data.contact_person),
      service_interested: toNullableString(data.service_interested),
      lead_source: toNullableString(data.lead_source),
      search_keyword: toNullableString(data.search_keyword),
      is_quality_lead: data.is_quality_lead || false,
      sales_person_id: data.sales_person_id ? parseInt(data.sales_person_id) : null,
      lead_status: data.lead_status || 'Lead',
      contract_value: toNullableNumber(data.contract_value),
      pain_points: toNullableString(data.pain_points),
      contract_duration: toNullableString(data.contract_duration),
      contract_start_date: toNullableString(data.contract_start_date),
      contract_end_date: toNullableString(data.contract_end_date),
    };

    const existingCustomer = await query(
      'SELECT * FROM x_socrm.customers WHERE customer_id = $1',
      [customerId]
    );

    if (existingCustomer.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลลูกค้า' }, { status: 404 });
    }

    const customerDept = existingCustomer.rows[0].department;
    if (!canAccessDepartment(user, customerDept)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE x_socrm.customers SET
          company_name = $1,
          email = $2,
          phone = $3,
          location = $4,
          registration_info = $5,
          business_type = $6,
          budget = $7,
          contact_person = $8,
          service_interested = $9,
          lead_source = $10,
          search_keyword = $11,
          is_quality_lead = $12,
          sales_person_id = $13,
          lead_status = $14,
          contract_value = $15,
          pain_points = $16,
          contract_duration = $17,
          contract_start_date = $18,
          contract_end_date = $19,
          updated_at = CURRENT_TIMESTAMP
        WHERE customer_id = $20
        RETURNING *`,
        [
          cleanData.company_name,
          cleanData.email,
          cleanData.phone,
          cleanData.location,
          cleanData.registration_info,
          cleanData.business_type,
          cleanData.budget,
          cleanData.contact_person,
          cleanData.service_interested,
          cleanData.lead_source,
          cleanData.search_keyword,
          cleanData.is_quality_lead,
          cleanData.sales_person_id,
          cleanData.lead_status,
          cleanData.contract_value,
          cleanData.pain_points,
          cleanData.contract_duration,
          cleanData.contract_start_date,
          cleanData.contract_end_date,
          customerId,
        ]
      );

      await client.query('DELETE FROM x_socrm.customer_services WHERE customer_id = $1', [customerId]);

      const svcRows = incomingServices
        .filter((s: any) => s && s.service_id)
        .map((s: any) => ({
          service_id: Number(s.service_id),
          quantity: Math.max(1, Number(s.quantity ?? 1)),
        }));

      for (const s of svcRows) {
        await client.query(
          `INSERT INTO x_socrm.customer_services (customer_id, service_id, quantity)
           VALUES ($1, $2, $3)`,
          [customerId, s.service_id, s.quantity]
        );
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true, customer: result.rows[0] });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัพเดต' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = params.id;

    const existingCustomer = await query(
      'SELECT * FROM x_socrm.customers WHERE customer_id = $1',
      [customerId]
    );

    if (existingCustomer.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลลูกค้า' }, { status: 404 });
    }

    const customerDept = existingCustomer.rows[0].department;
    if (!canAccessDepartment(user, customerDept)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await query('DELETE FROM x_socrm.customers WHERE customer_id = $1', [customerId]);

    return NextResponse.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบข้อมูล' }, { status: 500 });
  }
}
