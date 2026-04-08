import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { query } from '@/lib/db';
import { getUserFromRequest, getAccessibleDepartments, isAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AnyRow = Record<string, any>;

function normalizeRowForXlsx(row: AnyRow) {
  const out: AnyRow = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined) out[k] = null;
    else if (v instanceof Date) out[k] = v.toISOString();
    else if (typeof v === 'object' && v !== null) out[k] = JSON.stringify(v);
    else out[k] = v;
  }
  return out;
}

async function fetchCustomerDetails(
  accessibleDepts: string[] | null,
  admin: boolean
) {
  const customerParams: any[] = [];
  let customerWhere = '';

  if (!admin) {
    if (Array.isArray(accessibleDepts)) {
      if (accessibleDepts.length === 0) {
        customerWhere = ' AND 1=0';
      } else {
        customerWhere = ' AND c.department = ANY($1::text[])';
        customerParams.push(accessibleDepts);
      }
    }
  }

  const queryRes = await query(
    `
    SELECT
      ROW_NUMBER() OVER (ORDER BY c.created_at DESC)  AS "ลำดับ",
      TO_CHAR(c.created_at, 'Mon YYYY')               AS "เดือน",
      TO_CHAR(c.created_at, 'YYYY-MM-DD')              AS "ว/ด/ป ติดต่อ",
      u.full_name                                      AS "เจ้าหน้าที่รับสาย",
      c.department                                     AS "BU",
      s.service_name                                   AS "Product",
      c.lead_source                                    AS "ช่องทางการติดต่อ",
      c.contact_person                                 AS "ผู้ติดต่อฝั่งลูกค้า",
      c.department                                     AS "ติดต่อมาที่",
      c.contract_duration                              AS "ระยะสัญญา",
      c.company_name                                   AS "ชื่อบริษัทลูกค้า",
      c.business_type                                  AS "ประเภทอุตสาหกรรม",
      c.location                                       AS "ที่อยู่",
      c.pain_points                                    AS "รายละเอียดการติดต่อ",
      cs.quantity                                      AS "จำนวน",
      s.quantity_unit                                  AS "หน่วย",
      c.car_type                                       AS "ประเภทรถ (CR)",
      c.car_subtype                                    AS "ประเภทรถ(ย่อย)(CR)",
      c.gear_type                                      AS "เกียร์(CR)",
      c.contact_person                                 AS "ชื่อผู้ติดต่อ",
      c.phone                                          AS "เบอร์ติดต่อ",
      c.email                                          AS "Email",
      u.full_name                                      AS "ส่งต่อเจ้าหน้าที่การตลาด",
      CASE
        WHEN c.contract_value IS NOT NULL AND c.contract_value::text != ''
        THEN 'เสนอราคาแล้ว'
        ELSE 'ยังไม่เสนอราคา'
      END                                              AS "การเสนอราคา",
      c.quality_lead_reason                            AS "เหตุผลไม่เสนอราคา",
      c.contract_value                                 AS "มูลค่าที่เสนอราคา",
      CASE
        WHEN c.lead_status = 'PO'    THEN 'ได้งาน'
        WHEN c.lead_status = 'Close' THEN 'ไม่ได้งาน'
        ELSE c.lead_status
      END                                              AS "การได้งาน",
      c.lose_reason                                    AS "เหตุผลที่ไม่ได้งาน",
      c.budget                                         AS "มูลค่าการได้งาน",
      c.win_reason                                     AS "เหตุผลที่ได้งาน",
      c.is_quality_lead                                AS "Lead Qty.",
      c.quality_lead_reason                            AS "เหตุผลไม่คุณภาพ",
      c.search_keyword                                 AS "Keyword"
    FROM x_socrm.customers c
    LEFT JOIN x_socrm.users u              ON u.user_id     = c.sales_person_id
    LEFT JOIN x_socrm.customer_services cs ON cs.customer_id = c.customer_id
    LEFT JOIN x_socrm.services s           ON s.service_id   = cs.service_id
    WHERE 1=1
    ${customerWhere}
    ORDER BY c.created_at DESC
    `,
    customerParams
  );

  return (queryRes.rows || []).map(normalizeRowForXlsx);
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = isAdmin(user);
    const accessibleDepts = getAccessibleDepartments(user);

    const wb = XLSX.utils.book_new();

    const customerRows = await fetchCustomerDetails(accessibleDepts, admin);
    const customersWs = XLSX.utils.json_to_sheet(customerRows);
    XLSX.utils.book_append_sheet(wb, customersWs, 'customers_accessible');

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
    const body = new Uint8Array(buffer);

    const fileName = `CRM_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Export Excel error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}