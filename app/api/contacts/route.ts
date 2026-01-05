import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

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
    const {
      customer_id,
      contact_date,
      contact_subject,
      contact_channel,
      customer_contact_person,
      sales_person_id,
      quotation_amount,
      next_followup_date,
      notes,
      lead_status_updated
    } = data;

    if (!customer_id) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }

    // Ensure the user can access the customer's department
    const cust = await client.query(
      'SELECT customer_id, department FROM x_socrm.customers WHERE customer_id = $1',
      [customer_id]
    );

    if (cust.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (user.role !== 'admin' && cust.rows[0].department !== user.department) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Allow assigning the contact to another sales person (within the same department for non-admin)
    const assignedSalesPersonId = sales_person_id ? Number(sales_person_id) : user.user_id;

    if (sales_person_id) {
      const sp = await client.query(
        'SELECT user_id, department FROM x_socrm.users WHERE user_id = $1 AND is_active = true',
        [assignedSalesPersonId]
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

    await client.query('BEGIN');

    const contactResult = await client.query(
      `INSERT INTO x_socrm.contact_history (
        customer_id, contact_date, contact_subject, contact_channel,
        customer_contact_person, sales_person_id, quotation_amount,
        next_followup_date, notes, lead_status_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        customer_id, contact_date, contact_subject, contact_channel,
        customer_contact_person, assignedSalesPersonId, quotation_amount,
        next_followup_date, notes, lead_status_updated
      ]
    );

    if (lead_status_updated || quotation_amount) {
      let updateQuery = 'UPDATE x_socrm.customers SET updated_at = CURRENT_TIMESTAMP';
      const updateParams: any[] = [];
      let paramCount = 1;

      if (lead_status_updated) {
        updateQuery += `, lead_status = $${paramCount}`;
        updateParams.push(lead_status_updated);
        paramCount++;
      }

      if (quotation_amount) {
        updateQuery += `, contract_value = $${paramCount}`;
        updateParams.push(quotation_amount);
        paramCount++;
      }

      updateQuery += ` WHERE customer_id = $${paramCount}`;
      updateParams.push(customer_id);

      await client.query(updateQuery, updateParams);
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      contact: contactResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Add contact error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  } finally {
    client.release();
  }
}
