import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { getUserFromRequest, canAccessDepartment } from '@/lib/auth';

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

    const incomingServices = Array.isArray(data.customer_services)
      ? data.customer_services
      : Array.isArray(data.services)
        ? data.services
        : Array.isArray(data.selectedServices)
          ? data.selectedServices
          : [];

    const isQualityLead = toNullableBoolean(data?.is_quality_lead) ?? false;
    const qualityLeadReason = isQualityLead ? null : toNullableString(data?.quality_lead_reason);

    if (!isQualityLead && !qualityLeadReason) {
      return NextResponse.json({ error: 'กรุณาระบุเหตุผลที่ไม่เป็น Lead คุณภาพ' }, { status: 400 });
    }

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

    const cleanData = {
      company_name: toNullableString(data?.company_name),
      email: toNullableString(data?.email),
      phone: toNullableString(data?.phone),
      location: toNullableString(data?.location),
      registration_info: toNullableString(data?.registration_info),
      car_type: customerDept === 'CR' ? toNullableString(data?.car_type) : null,
      car_subtype: customerDept === 'CR' ? toNullableString(data?.car_subtype) : null,
      gear_type: customerDept === 'CR' ? toNullableString(data?.gear_type) : null,
      business_type: toNullableString(data?.business_type),
      budget: toNullableNumber(data?.budget),
      contact_person: toNullableString(data?.contact_person),
      service_interested: toNullableString(data?.service_interested),
      lead_source: toNullableString(data?.lead_source),
      search_keyword: toNullableString(data?.search_keyword),
      is_quality_lead: isQualityLead,
      quality_lead_reason: qualityLeadReason,
      sales_person_id: toNullableNumber(data?.sales_person_id),
      lead_status: toNullableString(data?.lead_status) || 'Lead',
      contract_value: toNullableNumber(data?.contract_value),
      pain_points: toNullableString(data?.pain_points),
      contract_duration: toNullableString(data?.contract_duration),
      contract_start_date: toNullableString(data?.contract_start_date),
      contract_end_date: toNullableString(data?.contract_end_date),
    };

    if (!cleanData.company_name) {
      return NextResponse.json({ error: 'ชื่อบริษัทจำเป็นต้องระบุ' }, { status: 400 });
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
          car_type = $6,
          car_subtype = $7,
          gear_type = $8,
          business_type = $9,
          budget = $10,
          contact_person = $11,
          service_interested = $12,
          lead_source = $13,
          search_keyword = $14,
          is_quality_lead = $15,
          quality_lead_reason = $16,
          sales_person_id = $17,
          lead_status = $18,
          contract_value = $19,
          pain_points = $20,
          contract_duration = $21,
          contract_start_date = $22,
          contract_end_date = $23,
          updated_at = CURRENT_TIMESTAMP
        WHERE customer_id = $24
        RETURNING *`,
        [
          cleanData.company_name,
          cleanData.email,
          cleanData.phone,
          cleanData.location,
          cleanData.registration_info,
          cleanData.car_type,
          cleanData.car_subtype,
          cleanData.gear_type,
          cleanData.business_type,
          cleanData.budget,
          cleanData.contact_person,
          cleanData.service_interested,
          cleanData.lead_source,
          cleanData.search_keyword,
          cleanData.is_quality_lead,
          cleanData.quality_lead_reason,
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
