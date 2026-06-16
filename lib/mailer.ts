/**
 * lib/mailer.ts
 * ส่งอีเมลผ่าน Microsoft Graph API (Mail.Send permission)
 * ใช้ Client Credentials Flow (Application permission) ไม่ต้องมี user login
 *
 * ใช้ App Registration แยกสำหรับส่งอีเมล (SOCRMSystemEmail)
 * MAIL_CLIENT_ID     = Client ID ของ SOCRMSystemEmail
 * MAIL_CLIENT_SECRET = Secret ของ SOCRMSystemEmail
 * AZURE_AD_TENANT_ID = ใช้ร่วมกับ SSO ได้เลย (Tenant เดียวกัน)
 * MAIL_SENDER_EMAIL  = อีเมลที่ใช้ส่ง (mailbox จริงในองค์กร)
 */

const TENANT_ID = process.env.AZURE_AD_TENANT_ID!;
const CLIENT_ID = process.env.MAIL_CLIENT_ID || process.env.AZURE_AD_CLIENT_ID!;
const CLIENT_SECRET = process.env.MAIL_CLIENT_SECRET || process.env.AZURE_AD_CLIENT_SECRET!;
const SENDER_EMAIL = process.env.MAIL_SENDER_EMAIL || 'noreply@siamrajthanee.com';

/**
 * ดึง Access Token สำหรับ Microsoft Graph
 * ใช้ Client Credentials (app-level) ไม่ต้องมี user session
 */
async function getGraphToken(): Promise<string> {
  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph token error: ${text}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

export interface MailRecipient {
  name: string;
  email: string;
}

export interface SendMailOptions {
  to: MailRecipient[];
  subject: string;
  htmlBody: string;
}

/**
 * ส่งอีเมลผ่าน Microsoft Graph
 */
export async function sendMail(options: SendMailOptions): Promise<void> {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    console.warn('[mailer] Microsoft credentials not set — skipping email');
    return;
  }

  if (!options.to || options.to.length === 0) {
    console.warn('[mailer] No recipients — skipping email');
    return;
  }

  const recipients = options.to.filter((r) => r?.email?.trim());
  if (recipients.length === 0) {
    console.warn('[mailer] All recipients have empty email — skipping');
    return;
  }

  try {
    const token = await getGraphToken();

 const payload = {
      message: {
        subject: options.subject,
        from: {
          emailAddress: {
            address: SENDER_EMAIL,
            name: 'SO CRM System',
          },
        },
        body: {
          contentType: 'HTML',
          content: options.htmlBody,
        },
        toRecipients: recipients.map((r) => ({
          emailAddress: {
            address: r.email.trim(),
            name: r.name || r.email.trim(),
          },
        })),
      },
      saveToSentItems: false,
    };

    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Graph sendMail error: ${text}`);
    }

    console.log(`[mailer] Sent to: ${recipients.map((r) => r.email).join(', ')}`);
  } catch (err) {
    console.error('[mailer] Failed to send email:', err);
  }
}   


// ─────────────────────────────────────────────────────────────
// Template: แจ้งเตือนเมื่อถูก assign task ใหม่
// ─────────────────────────────────────────────────────────────
export function buildTaskAssignedEmail(params: {
  assigneeName: string;
  taskTitle: string;
  taskDescription?: string | null;
  taskDate?: string | null;
  customerName?: string | null;
  projectName?: string | null;
  createdByName: string;
  appUrl: string;
}): string {
  const dueDateText = params.taskDate
    ? new Date(params.taskDate).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  return `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">SO LEAD Management System</p>
            <p style="margin:6px 0 0;font-size:13px;color:#bfdbfe;">แจ้งเตือนงานใหม่ที่ได้รับมอบหมาย</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:15px;color:#334155;">สวัสดีคุณ <strong>${params.assigneeName}</strong>,</p>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;">คุณได้รับมอบหมายงานใหม่จากระบบ SO CRM</p>
            <div style="background:#f1f5f9;border-radius:12px;border-left:4px solid #2563eb;padding:20px 24px;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;color:#94a3b8;letter-spacing:0.05em;">หัวข้องาน</p>
              <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#1e293b;">${params.taskTitle}</p>
              ${params.taskDescription ? `
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;color:#94a3b8;letter-spacing:0.05em;">รายละเอียด</p>
              <p style="margin:0 0 16px;font-size:14px;color:#475569;white-space:pre-wrap;">${params.taskDescription}</p>
              ` : ''}
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:4px 0;width:50%;">
                    <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;color:#94a3b8;">กำหนดส่ง</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#1e293b;">${dueDateText}</p>
                  </td>
                  <td style="padding:4px 0;">
                    <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;color:#94a3b8;">ลูกค้า</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#1e293b;">${params.customerName || '—'}</p>
                  </td>
                </tr>
                ${params.projectName ? `
                <tr>
                  <td colspan="2" style="padding:12px 0 4px;">
                    <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;color:#94a3b8;">โปรเจค</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#1e293b;">${params.projectName}</p>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td colspan="2" style="padding:12px 0 4px;">
                    <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;color:#94a3b8;">มอบหมายโดย</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#1e293b;">${params.createdByName}</p>
                  </td>
                </tr>
              </table>
            </div>
            <a href="${params.appUrl}/dashboard/tasks"
               style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">
              ดูงานในระบบ →
            </a>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              อีเมลนี้ส่งอัตโนมัติจาก SO LEAD Management System — กรุณาอย่าตอบกลับ
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
// Template: แจ้งเตือนเมื่อมีคำขอ Approve
// ─────────────────────────────────────────────────────────────
export function buildApprovalRequestEmail(params: {
  approverName: string;
  requesterName: string;
  taskTitle: string;
  requestedStatus: string;
  note?: string | null;
  customerName?: string | null;
  projectName?: string | null;
  appUrl: string;
}): string {
  const statusMap: Record<string, string> = {
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก',
    postponed: 'ขอเลื่อน',
  };
  const statusText = statusMap[params.requestedStatus] || params.requestedStatus;

  const statusColor: Record<string, string> = {
    completed: '#059669',
    cancelled: '#dc2626',
    postponed: '#d97706',
  };
  const badgeColor = statusColor[params.requestedStatus] || '#2563eb';

  return `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:28px 32px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">SO LEAD Management System</p>
            <p style="margin:6px 0 0;font-size:13px;color:#ddd6fe;">รอการอนุมัติคำขอเปลี่ยนสถานะงาน</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:15px;color:#334155;">สวัสดีคุณ <strong>${params.approverName}</strong>,</p>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;">
              คุณ <strong>${params.requesterName}</strong> ได้ส่งคำขอเปลี่ยนสถานะงาน รอการพิจารณาจากคุณ
            </p>
            <div style="background:#f5f3ff;border-radius:12px;border-left:4px solid #7c3aed;padding:20px 24px;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;color:#94a3b8;letter-spacing:0.05em;">หัวข้องาน</p>
              <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#1e293b;">${params.taskTitle}</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:4px 0;width:50%;">
                    <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;color:#94a3b8;">ขอเปลี่ยนสถานะเป็น</p>
                    <span style="display:inline-block;margin-top:6px;background:${badgeColor};color:#ffffff;font-size:13px;font-weight:700;padding:4px 14px;border-radius:20px;">
                      ${statusText}
                    </span>
                  </td>
                  <td style="padding:4px 0;">
                    <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;color:#94a3b8;">ลูกค้า</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#1e293b;">${params.customerName || '—'}</p>
                  </td>
                </tr>
                ${params.projectName ? `
                <tr>
                  <td colspan="2" style="padding:12px 0 4px;">
                    <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;color:#94a3b8;">โปรเจค</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#1e293b;">${params.projectName}</p>
                  </td>
                </tr>
                ` : ''}
                ${params.note ? `
                <tr>
                  <td colspan="2" style="padding:12px 0 4px;">
                    <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;color:#94a3b8;">หมายเหตุจากผู้ขอ</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#475569;white-space:pre-wrap;">${params.note}</p>
                  </td>
                </tr>
                ` : ''}
              </table>
            </div>
            <a href="${params.appUrl}/dashboard/tasks"
               style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">
              ไปยังหน้า Tasks →
            </a>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              อีเมลนี้ส่งอัตโนมัติจาก SO LEAD Management System — กรุณาอย่าตอบกลับ
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
