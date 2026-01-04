import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, canAccessDepartment } from '@/lib/auth';

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
    
    // แปลงค่าว่างเป็น null สำหรับ numeric และ date fields
    const cleanData = {
      company_name: data.company_name,
      email: data.email || null,
      phone: data.phone || null,
      location: data.location || null,
      registration_info: data.registration_info || null,
      business_type: data.business_type || null,
      budget: data.budget ? parseFloat(data.budget) : null,
      contact_person: data.contact_person || null,
      service_interested: data.service_interested || null,
      lead_source: data.lead_source || null,
      search_keyword: data.search_keyword || null,
      is_quality_lead: data.is_quality_lead || false,
      sales_person_id: data.sales_person_id ? parseInt(data.sales_person_id) : null,
      lead_status: data.lead_status || 'Lead',
      contract_value: data.contract_value ? parseFloat(data.contract_value) : null,
      pain_points: data.pain_points || null,
      contract_duration: data.contract_duration || null,
      contract_start_date: data.contract_start_date || null,
      contract_end_date: data.contract_end_date || null
    };

    // ตรวจสอบว่าลูกค้ามีอยู่และมีสิทธิ์แก้ไข
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

    // อัพเดตข้อมูล
    const result = await query(
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
        customerId
      ]
    );

    return NextResponse.json({ success: true, customer: result.rows[0] });
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

    // ตรวจสอบว่าลูกค้ามีอยู่และมีสิทธิ์ลบ
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

    // ลบข้อมูล (soft delete หรือ hard delete ตามต้องการ)
    await query(
      'DELETE FROM x_socrm.customers WHERE customer_id = $1',
      [customerId]
    );

    return NextResponse.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบข้อมูล' }, { status: 500 });
  }
}