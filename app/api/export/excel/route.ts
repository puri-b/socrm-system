import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { query } from '@/lib/db';
import { getUserFromRequest, getAccessibleDepartments, isAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AnyRow = Record<string, any>;

function safeSheetName(name: string, used: Set<string>) {
  const cleaned = name.replace(/[:\\/?*\[\]]/g, '_').slice(0, 31) || 'Sheet';
  let finalName = cleaned;
  let i = 1;
  while (used.has(finalName)) {
    const suffix = `_${i++}`;
    finalName = (cleaned.slice(0, 31 - suffix.length) + suffix).slice(0, 31);
  }
  used.add(finalName);
  return finalName;
}

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

async function getAllTablesInSchema(schemaName: string) {
  const res = await query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = $1
       AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
    [schemaName]
  );
  return res.rows.map((r) => String(r.table_name));
}

async function getTableColumns(schemaName: string, tableName: string) {
  const res = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2`,
    [schemaName, tableName]
  );
  return res.rows.map((r) => String(r.column_name));
}

async function fetchTableRows(
  schemaName: string,
  tableName: string,
  opts: { accessibleDepts: string[] | null; admin: boolean }
) {
  const cols = await getTableColumns(schemaName, tableName);
  const hasDepartment = cols.includes('department');

  let sql = `SELECT * FROM ${schemaName}.${tableName}`;
  const params: any[] = [];

  // ถ้ามี column department และ user ไม่ใช่ admin -> กรองตามสิทธิ์
  if (!opts.admin && hasDepartment) {
    const accessible = opts.accessibleDepts;
    if (Array.isArray(accessible)) {
      if (accessible.length === 0) return [];
      sql += ` WHERE department = ANY($1::text[])`;
      params.push(accessible);
    }
  }

  if (cols.includes('created_at')) {
    sql += ` ORDER BY created_at DESC`;
  }

  const res = await query(sql, params);
  return res.rows;
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = isAdmin(user);
    const accessibleDepts = getAccessibleDepartments(user); // admin อาจได้ null/all

    const wb = XLSX.utils.book_new();
    const usedNames = new Set<string>();

    // -------------------------------
    // Sheet 1: customers_accessible (ตามสิทธิ์ user)
    // -------------------------------
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

    const customersRes = await query(
      `
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
      ${customerWhere}
      GROUP BY c.customer_id, u.full_name
      ORDER BY c.created_at DESC
      `,
      customerParams
    );

    const customerRows = (customersRes.rows || []).map(normalizeRowForXlsx);
    const customersWs = XLSX.utils.json_to_sheet(customerRows);
    XLSX.utils.book_append_sheet(
      wb,
      customersWs,
      safeSheetName('customers_accessible', usedNames)
    );

    // -------------------------------
    // Sheets: ทุก table ใน schema x_socrm (กรองตาม dept ถ้ามี column)
    // -------------------------------
    const schemaName = 'x_socrm';
    const tables = await getAllTablesInSchema(schemaName);

    for (const tableName of tables) {
      const rows = await fetchTableRows(schemaName, tableName, {
        accessibleDepts,
        admin,
      });

      const normalized = (rows || []).map(normalizeRowForXlsx);
      const ws = XLSX.utils.json_to_sheet(normalized);

      XLSX.utils.book_append_sheet(wb, ws, safeSheetName(tableName, usedNames));
    }

    // เขียนเป็น Buffer แล้วแปลงเป็น Uint8Array เพื่อให้เข้ากับ BodyInit ของ NextResponse
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
    const body = new Uint8Array(buffer);

    const fileName = `CRM_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Export Excel error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}