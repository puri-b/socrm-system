# รายงานการตรวจสอบฐานข้อมูลจริง (Read-Only) — 2026-07-10

> วิธีตรวจ: เชื่อม PostgreSQL `ocr_service` @ `94.74.115.204` ด้วย credential ใน `so-crm-redesign/.env`
> **READ ONLY** (`default_transaction_read_only=on` + `statement_timeout=15s`) — ไม่มีการเขียน/แก้ข้อมูลใดๆ
> จุดประสงค์: verify เอกสาร `current-database.md` (ลงวันที่ 2026-06-30) เทียบสภาพจริง ตามหลักการ "ห้ามเดา ต้องมีหลักฐาน"

## A. สรุปสิ่งที่ **ต่างจากเอกสาร** (สำคัญ)

### A1. ข้อมูลโตขึ้น (ระบบยัง active) — ตัวเลข backfill ต้องใช้ค่าสดเสมอ
| ตาราง | เอกสาร (06-30) | จริง (07-10) | Δ |
|---|---|---|---|
| customers | 517 | **629** | +112 |
| customer_services | 394 | **492** | +98 |
| contact_history | 640 | **783** | +143 |
| tasks | 232 | **271** | +39 |
| services | 26 | **30** | +4 |
| users | 36 | **39** | +3 |

### A2. การกระจาย BU เปลี่ยน (CR โตมาก)
จริง (07-10): **LBA 189 · LBD 141 · LM 95 · CR 72 · DS 72 · SN 60**
(เอกสาร: LBA 178·LBD 136·DS 67·LM 65·SN 60·CR 11) — CR โตจาก 11 → 72
→ ครบ 6 BU ตามคาด ไม่มีค่า department แปลกปลอม

### A3. Roles จริง = ตรงกับ 4 ค่าที่ hardcode
user 17 · admin 15 · manager 5 · digital_marketing 2 (admin เยอะผิดปกติ = 15)

## B. โครงสร้าง x_socrm ที่ยืนยันแล้ว
- **PostgreSQL 13.6**
- `customers` มีคอลัมน์เพิ่มจากที่วิเคราะห์: `solution`, `car_type/car_subtype/gear_type` (CR-specific), `win_reason/lose_reason`, `updated_at` — **ไม่มี** `account_id`, **ไม่มี** `tax_id`
- FK delete rule **ยืนยัน CASCADE จริง**: `contact_history/customer_services/projects/tasks.customer_id → customers ON DELETE CASCADE`; `task_status_requests.task_id → tasks CASCADE`; FK ที่อ้าง users = NO ACTION/SET NULL
  → ลบ customer 1 ราย = ลบประวัติ/บริการ/งาน/โปรเจกต์ทั้งหมดทันที (ตรงกับที่ PRD เตือน)

## C. ⚠️ ข้อค้นพบสำคัญที่สุด — มี CRM ใหม่ถูกสร้างไว้แล้วในฐานเดียวกัน

ฐาน `ocr_service` เป็น **shared DB** มี ~40 schema (so-hrm, so-dserp, wms_db, lbd, ฯลฯ). ในนั้นมี:

### C1. `crm_db` — Prisma multi-tenant SaaS CRM (scaffold 2026-04-02, แทบว่างเปล่า)
migration `20260402100131_init` (applied 2026-04-02) โดย user `admin@siamraj.com` ("Platform Admin")

**โครงสร้างตรงกับวิสัยทัศน์ "dynamic ทุกส่วน + PRD" เกือบทั้งหมด:**
- **Multi-tenant/SaaS:** `Company` (seed: SIAMRAJ, plan ENTERPRISE), `SubscriptionPlan` (TRIAL/STARTER/PROFESSIONAL/ENTERPRISE), `CompanySsoConfig`, `ApiKey`, `SystemConfig`
- **Dynamic Org:** `Company → Branch → Department` (seed **LBD/LBA/CR/LM/DS/SN ครบ 6 BU**), `headUserId`
- **RBAC เต็มรูป (config-driven):** `Role` (seed: Platform Super Admin/Company Admin/Sales, มี `level` 900/700/500, `isSystem`), `Permission` (**seed 78 รายการ** เช่น customers.create/read/update/delete/export/import, contacts.*), `RolePermission`, `UserRole`
- **Account-centric CRM:** `Customer` (=องค์กร: companyName/companyNameTh/**taxId**/customerBranchCode/leadScore/`metadata jsonb`/soft-delete `deletedAt`), `Deal` (=opportunity: pipelineId/stageId/**weightedValue**/expectedCloseDate/lossReason), `Pipeline`, `PipelineStage` (Qualification→Discovery→Proposal→Negotiation→Closed Won/Lost), `DealActivity`, `ContactPerson`, `CustomerContact`, `ContactHistory`
- **CPQ:** `Quote`, `QuoteItem`, `Contract`
- **Metadata-driven / dynamic fields:** `CustomField` (entityType/fieldType/`options jsonb`/`validation jsonb`), `CustomFieldValue` — ตรงกับ "ฟอร์ม dynamic ไม่ fix"
- **Integration/Sync layer:** `DataSourceConfig`, `DataSyncLog`, `MasterDataMapping` — ออกแบบให้ **sync จากแหล่งเดิม** (เช่น x_socrm)
- **อื่นๆ:** `Campaign/CampaignLead`, `Notification*`, `Source` (seed 7), `BusinessCard/CardRecord` (เชื่อม OCR), auth แบบ **NextAuth** (`Account/Session/VerificationToken`)

> หมายเหตุ: table `Account` ใน crm_db = ตาราง OAuth ของ NextAuth (userId/provider/token) **ไม่ใช่** "Account=องค์กร" ของ PRD — บทบาทองค์กรคือ `Customer`, ดีลคือ `Deal`

### C2. `x_crmsystem` — CRM เล็ก (ทดลอง?)
customers 72 · departments 6 · contact_logs 68 · customer_departments 0 · users 1

### C3. โค้ด Prisma ของ crm_db **ไม่มีบนเครื่องนี้** (local มีแต่ socrm-system)
→ สร้างจาก repo/เครื่องอื่น โดย `admin@siamraj.com`

## D. ความขัดแย้งเชิงกลยุทธ์ที่ต้องให้ผู้บริหารตัดสิน
มี 2 แนวทางในองค์กรที่ **ขัดกัน**:
1. **PRD (2026-07-10, chinnapat.j):** additive/strangler **บน x_socrm**, single source of truth, **ไม่ copy ไม่ sync**
2. **crm_db (2026-04-02, admin@siamraj):** schema แยกแบบ multi-tenant SaaS + **มี sync layer** ดึงจากแหล่งเดิม

→ ต้องเลือกทิศทางก่อนเริ่ม code (ดู DEVELOPMENT_PLAN §ตัดสินใจ)
