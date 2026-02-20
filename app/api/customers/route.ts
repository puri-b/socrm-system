import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, canAccessDepartment, getAccessibleDepartments } from '@/lib/auth';

// --- helpers (กันเคสส่งค่าเป็น "" แล้วชน numeric ใน Postgres) ---
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

function toNullableBoolean(v: any) {
  if (v === true || v === false) return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

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

    const accessibleDepts = getAccessibleDepartments(user);
    if (accessibleDepts === null) {
      if (department) {
        queryText += ` AND c.department = $${paramCount}`;
        params.push(department);
        paramCount++;
      }
    } else {
      if (accessibleDepts.length === 0) {
        return NextResponse.json({ customers: [] });
      }
      if (department && accessibleDepts.includes(department)) {
        queryText += ` AND c.department = $${paramCount}`;
        params.push(department);
        paramCount++;
      } else {
        queryText += ` AND c.department = ANY($${paramCount}::text[])`;
        params.push(accessibleDepts);
        paramCount++;
      }
    }

    if (status) {
      queryText += ` AND c.lead_status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // ✅ ตัวกรองวันที่บันทึกข้อมูล (created_at) ส่งแบบ YYYY-MM-DD
    if (dateFrom) {
      queryText += ` AND c.created_at >= $${paramCount}`;
      params.push(`${dateFrom} 00:00:00`);
      paramCount++;
    }
    if (dateTo) {
      queryText += ` AND c.created_at <= $${paramCount}`;
      params.push(`${dateTo} 23:59:59`);
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

    // ✅ sanitize ทุก field ที่มีโอกาสส่งเป็น "" จากฟอร์ม
    const company_name = toNullableString(data?.company_name);
    const email = toNullableString(data?.email);
    const phone = toNullableString(data?.phone);
    const location = toNullableString(data?.location);
    const registration_info = toNullableString(data?.registration_info);
    const business_type = toNullableString(data?.business_type);
    const budget = toNullableNumber(data?.budget);
    const contact_person = toNullableString(data?.contact_person);
    const service_interested = toNullableString(data?.service_interested);
    const lead_source = toNullableString(data?.lead_source);
    const search_keyword = toNullableString(data?.search_keyword);
    const is_quality_lead_raw = toNullableBoolean(data?.is_quality_lead);
    const is_quality_lead = is_quality_lead_raw ?? false;
    const sales_person_id = toNullableNumber(data?.sales_person_id);
    const lead_status = toNullableString(data?.lead_status) || 'Lead';
    const contract_value = toNullableNumber(data?.contract_value);
    const pain_points = toNullableString(data?.pain_points);
    const contract_duration = toNullableString(data?.contract_duration);
    const contract_start_date = toNullableString(data?.contract_start_date);
    const contract_end_date = toNullableString(data?.contract_end_date);
    const department = toNullableString(data?.department);
    const customer_services = data?.customer_services;

    if (!company_name) {
      return NextResponse.json({ error: 'ชื่อบริษัทจำเป็นต้องระบุ' }, { status: 400 });
    }

    const customerDept = department || user.department;
    if (!canAccessDepartment(user, customerDept)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const result = await query(
      `INSERT INTO x_socrm.customers (
        company_name, email, phone, location, registration_info, business_type, budget,
        contact_person, service_interested, lead_source, search_keyword, is_quality_lead,
        sales_person_id, lead_status, contract_value, pain_points, contract_duration,
        contract_start_date, contract_end_date, department, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
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
        (sales_person_id ? Number(sales_person_id) : user.user_id),
        lead_status,
        contract_value,
        pain_points,
        contract_duration,
        contract_start_date,
        contract_end_date,
        customerDept,
        user.user_id,
      ]
    );

    const customer = result.rows[0];

    // upsert customer_services (optional)
    if (Array.isArray(customer_services)) {
      await query('DELETE FROM x_socrm.customer_services WHERE customer_id = $1', [customer.customer_id]);
      for (const cs of customer_services) {
        if (!cs?.service_id) continue;
        await query(
          `INSERT INTO x_socrm.customer_services (customer_id, service_id, quantity)
           VALUES ($1, $2, $3)`,
          [customer.customer_id, Number(cs.service_id), cs.quantity ?? null]
        );
      }
    }

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}