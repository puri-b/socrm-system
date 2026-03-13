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

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }

    const result = await query(
      `SELECT ch.*, u.full_name as sales_person_name
       FROM x_socrm.contact_history ch
       LEFT JOIN x_socrm.users u ON ch.sales_person_id = u.user_id
       WHERE ch.customer_id = $1
       ORDER BY ch.contact_date DESC, ch.created_at DESC`,
      [customerId]
    );

    return NextResponse.json({ contacts: result.rows });
  } catch (error) {
    console.error('Get contact history error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const client = await getClient();

  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    const customer_id = toNullableNumber(data?.customer_id);
    const contact_date = toNullableString(data?.contact_date);
    const contact_subject = toNullableString(data?.contact_subject);
    const contact_channel = toNullableString(data?.contact_channel);
    const customer_contact_person = toNullableString(data?.customer_contact_person);
    const sales_person_id = toNullableNumber(data?.sales_person_id);
    const quotation_amount = toNullableNumber(data?.quotation_amount);
    const next_followup_date = toNullableString(data?.next_followup_date);
    const notes = toNullableString(data?.notes);
    const lead_status_updated = toNullableString(data?.lead_status_updated);

    if (!customer_id) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }

    const cust = await client.query(
      `SELECT customer_id, department, contract_value
       FROM x_socrm.customers
       WHERE customer_id = $1`,
      [customer_id]
    );

    if (cust.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerDept = String(cust.rows[0].department);

    if (!canAccessDepartment(user, customerDept)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const assignedSalesPersonId = sales_person_id ? Number(sales_person_id) : user.user_id;

    if (sales_person_id) {
      const sp = await client.query(
        'SELECT user_id, department FROM x_socrm.users WHERE user_id = $1 AND is_active = true',
        [assignedSalesPersonId]
      );

      if (sp.rows.length === 0) {
        return NextResponse.json({ error: 'Sales person not found' }, { status: 400 });
      }

      if (!canAccessDepartment(user, String(sp.rows[0].department))) {
        return NextResponse.json(
          { error: 'Access denied (sales person department mismatch)' },
          { status: 403 }
        );
      }
    }

    await client.query('BEGIN');

    const contactResult = await client.query(
      `INSERT INTO x_socrm.contact_history (
        customer_id, contact_date, contact_subject, contact_channel,
        customer_contact_person, sales_person_id, quotation_amount,
        next_followup_date, notes, lead_status_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        Number(customer_id),
        contact_date,
        contact_subject,
        contact_channel,
        customer_contact_person,
        assignedSalesPersonId,
        quotation_amount,
        next_followup_date,
        notes,
        lead_status_updated,
      ]
    );

    if (lead_status_updated) {
      await client.query(
        `UPDATE x_socrm.customers
         SET lead_status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE customer_id = $2`,
        [lead_status_updated, Number(customer_id)]
      );
    }

    if (quotation_amount !== null) {
      await client.query(
        `UPDATE x_socrm.customers
         SET contract_value = $1, updated_at = CURRENT_TIMESTAMP
         WHERE customer_id = $2`,
        [quotation_amount, Number(customer_id)]
      );
    }

    let createdTask: any = null;

    if (next_followup_date) {
      const taskResult = await client.query(
        `INSERT INTO x_socrm.tasks (
          customer_id,
          project_id,
          assigned_to,
          created_by,
          title,
          description,
          task_date,
          status,
          department,
          assigned_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          Number(customer_id),
          null,
          user.user_id,
          user.user_id,
          contact_subject || 'ติดตามลูกค้า',
          notes,
          next_followup_date,
          'pending',
          customerDept,
          user.user_id,
        ]
      );

      createdTask = taskResult.rows[0] ?? null;

      if (createdTask) {
        await client.query(
          `INSERT INTO x_socrm.activity_logs (entity_type, entity_id, action, performed_by, message, meta)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            'task',
            createdTask.task_id,
            'create',
            user.user_id,
            `สร้างงานติดตามอัตโนมัติจากการบันทึกการติดต่อ: ${createdTask.title}`,
            JSON.stringify({
              source: 'contact_history_followup',
              customer_id: Number(customer_id),
              contact_id: contactResult.rows[0]?.contact_id ?? null,
              next_followup_date,
            }),
          ]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({
      success: true,
      contact: contactResult.rows[0],
      task: createdTask,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create contact history error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  } finally {
    client.release();
  }
}
