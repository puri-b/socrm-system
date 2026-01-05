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
    const serviceIdParam = searchParams.get('service_id');

    // Support single or comma-separated service_id (e.g. "1" or "1,2,3")
    const serviceIds = (serviceIdParam || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n > 0);

    let queryText = `
      SELECT
        c.*,
        u.full_name as sales_person_name,
        COALESCE(svc.service_ids, ARRAY[]::int[]) as service_ids,
        COALESCE(svc.service_names, ARRAY[]::text[]) as service_names
      FROM x_socrm.customers c
      LEFT JOIN x_socrm.users u ON c.sales_person_id = u.user_id
      LEFT JOIN LATERAL (
        SELECT
          array_agg(DISTINCT cs.service_id ORDER BY cs.service_id) as service_ids,
          array_agg(DISTINCT s.service_name ORDER BY s.service_name) as service_names
        FROM x_socrm.customer_services cs
        JOIN x_socrm.services s ON s.service_id = cs.service_id
        WHERE cs.customer_id = c.customer_id
      ) svc ON true
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

    // Filter customers by service(s) if provided
    if (serviceIds.length > 0) {
      queryText += ` AND EXISTS (
        SELECT 1
        FROM x_socrm.customer_services cs
        WHERE cs.customer_id = c.customer_id
          AND cs.service_id = ANY($${paramCount}::int[])
      )`;
      params.push(serviceIds);
      paramCount++;
    }

    queryText += ' ORDER BY c.created_at DESC';

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
      services
    } = data;

    const targetDepartment = user.role === 'admin' ? (department || '') : user.department;

    if (!targetDepartment) {
      return NextResponse.json({ error: 'Department is required' }, { status: 400 });
    }

    if (!canAccessDepartment(user, targetDepartment)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (sales_person_id) {
      const sp = await query(
        `SELECT user_id, department FROM x_socrm.users WHERE user_id = $1 AND is_active = true`,
        [sales_person_id]
      );

      if (sp.rows.length === 0) {
        return NextResponse.json({ error: 'Sales person not found' }, { status: 400 });
      }

      if (user.role !== 'admin' && sp.rows[0].department !== user.department) {
        return NextResponse.json(
          { error: 'Access denied (sales person department mismatch)' },
          { status: 403 }
        );
      }
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
        company_name, email, phone, location, registration_info, business_type,
        budget, contact_person, service_interested, lead_source, search_keyword,
        is_quality_lead, sales_person_id, lead_status || 'Lead', contract_value, pain_points,
        contract_duration, contract_start_date, contract_end_date, targetDepartment, user.user_id
      ]
    );

    const customer = result.rows[0];

    if (services && services.length > 0) {
      for (const service of services) {
        await query(
          `INSERT INTO x_socrm.customer_services (customer_id, service_id, quantity)
           VALUES ($1, $2, $3)`,
          [customer.customer_id, service.service_id, service.quantity]
        );
      }
    }

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
