> ⚠️ **เอกสารนี้ถูกแทนที่แล้ว** — แผนฉบับสมบูรณ์ปัจจุบันอยู่ที่ `Customer-Relation-Management/docs/DEVELOPMENT-PLAN.md`
> (ฉบับนี้เก็บไว้เป็นประวัติ; ส่วน "schema crm" เปลี่ยนเป็น "ตาราง n_ ใน x_socrm" แล้ว ดู ARCHITECTURE_DECISION.md)

# แผนการพัฒนาระบบ Customer-Relation-Management (SO CRM v3)

| | |
|---|---|
| **เอกสาร** | Development Plan / Technical Proposal |
| **โปรเจกต์ใหม่** | `Customer-Relation-Management` (แยกจาก `socrm-system` เดิม) |
| **ฐานข้อมูล** | เกาะฐานเดิม — PostgreSQL `ocr_service`, schema `x_socrm` (read/additive) + schema ใหม่ `crm` |
| **หลักการ** | Dynamic ทุกส่วน (ไม่ Fix Logic) · Additive/Strangler · ไม่กระทบข้อมูล/ระบบเดิม |
| **AI** | Ollama ภายในองค์กร (`http://110.49.94.180:11434`) — URL/model ตั้งค่าได้ |
| **วันที่** | 2026-07-10 |
| **สถานะ** | Draft เสนอเพื่ออนุมัติ (ยังไม่เริ่ม code) |

> เอกสารนี้ต่อยอดจาก [PRD.md](PRD.md) และ [current-database.md](current-database.md) โดยเพิ่มข้อกำหนดใหม่ของผู้บริหาร: **โครงสร้างหลังบ้านต้อง Dynamic ทั้งหมด (Multiple Company / Business / Department / User / Role) + โปรเจกต์ใหม่แยก + AI ในบาง Function**

---

## 1. สรุปผลการศึกษาระบบเดิม (Current State)

### 1.1 สถาปัตยกรรม
- **Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · PostgreSQL (`pg` pool) · JWT + Microsoft SSO (Azure AD) · ส่งเมลผ่าน Microsoft Graph
- **DB:** host `94.74.115.204`, db `ocr_service`, schema `x_socrm` (10 ตาราง, 517 ลูกค้า) — ใช้ร่วมกับระบบ OCR (`ocr-ai-db`) และอื่นๆ ในฐานเดียวกัน
- **การเชื่อมต่อ:** โค้ดเดิมใช้ `DATABASE_URL`; ไฟล์ `so-crm-redesign/.env` ใช้ `PG_*` (host/port/user/pass/db/schema) — ชี้ฐานเดียวกัน
- **โครงสร้างโค้ด:** `app/api/*` (route handlers), `app/dashboard/*` (หน้าจอ), `lib/{db,auth,mailer}.ts`

### 1.2 User Journey / Process เดิม
1. **Login** — email/password หรือ Microsoft SSO → SSO ครั้งแรกไป complete-profile (เลือกแผนกเอง) → เก็บ user ใน `localStorage`
2. **Dashboard** — ภาพรวม pipeline (donut + stat cards ตาม stage: Lead→Potential→Prospect→Pipeline→PO→Close) + งานที่ต้องติดตามวันนี้
3. **ลูกค้า (Customers)** — CRUD ผ่าน modal, กรอกฟอร์มยาว, เลือกบริการหลายบรรทัด + จำนวน, ตรวจซ้ำ (block 409 + cross-check นามบัตร OCR), export Excel, ประวัติติดต่อ
4. **บันทึกติดต่อ (Contact)** — log touchpoint, อัปเดต stage, ใส่ยอดใบเสนอราคา, ตั้งวันติดตาม → สร้าง task อัตโนมัติ
5. **งาน (Tasks)** — จัดกลุ่มตามโปรเจกต์, มอบหมายหลายคน, workflow ขออนุมัติเปลี่ยนสถานะ (completed/cancelled/postponed ต้อง approve โดยผู้สร้างงาน/admin) + แจ้งเมล
6. **บริการ (Services)** — admin เท่านั้น, แค็ตตาล็อกราย BU + หน่วย
7. **ผู้ใช้ (Users)** — manager/admin จัดการ user, กำหนด role + allowed_departments

### 1.3 จุดที่ "Fix Logic" (ต้องแก้ให้ Dynamic)
ค้นพบการ hardcode หลายจุด ซึ่งขัดกับเป้าหมายใหม่:

| จุด | Hardcode ปัจจุบัน | ตำแหน่ง |
|---|---|---|
| แผนก/BU | `['LBD','LBA','CR','LM','DS','SN']` (string ตายตัว ~5 ที่) | `auth/microsoft/profile`, หน้า UI ทุกหน้า |
| Role | union type 4 ค่า `user/manager/admin/digital_marketing` | `lib/auth.ts` |
| สิทธิ์ | if/else ต่อ role ตายตัว, ผูกกับ `department` string เดียว | `lib/auth.ts`, ทุก route |
| ฟิลด์เฉพาะ BU | คอลัมน์ `car_type/car_subtype/gear_type` (เฉพาะ CR) | `customers.PUT` |
| หน่วยนับ | match ตามชื่อบริการเป็น string | `customers/page.tsx` |
| Pipeline stage | Lead→…→Close ตายตัวใน UI | `dashboard/page.tsx` |
| สถานะงาน | enum ตายตัว (มี `done/postponed` ที่ไม่เคยใช้) | `tasks/route.ts` |
| ช่องทางติดต่อ, lead source | mapping ตายตัว | `customers/route.ts` |

### 1.4 หนี้เทคนิค/ความปลอดภัย (จาก PRD §14 + ที่พบเพิ่ม)
- 🔴 `JWT_SECRET` มี fallback `'your-secret-key'` (auth.ts:5, callback, profile)
- 🔴 SSO self-onboarding: ใครใน tenant ก็สมัคร+เลือกแผนกเองได้ (profile route)
- 🟠 `ssl: rejectUnauthorized:false`, ขอ Graph token ใหม่ทุกเมล + ส่ง sequential
- 🟠 auth เก็บใน `localStorage` (ควรอ่านจาก httpOnly cookie/token ฝั่ง server)
- 🟡 hard-delete ลูกค้า = CASCADE ลบประวัติทั้งหมด (ควร soft-delete), ไม่มี pagination/index
- 🟡 UI ซ้ำซ้อน (filter bar, service selector copy-paste), icon SVG ซ้ำทุกไฟล์, `AddContactForm` ใช้สไตล์เก่าต่างจากที่อื่น

---

## 2. เป้าหมายระบบใหม่ (รวม PRD + ข้อกำหนดผู้บริหาร)

1. **G-PRD:** Account (องค์กร) → Opportunity (ดีล) → Line items — 1 องค์กร = 1 account, หลายดีลข้าม BU, ฟอร์มเดียว metadata-driven, cross-BU referral + Account 360°
2. **G-DYN (ใหม่):** โครงสร้างหลังบ้าน **Dynamic ทั้งหมด** — Multiple Company → Business (แบรนด์) → Department (BU) → User → Role/Permission กำหนดผ่านหน้าจอ/config ไม่ hardcode
3. **G-AI (ใหม่):** ใช้ AI (Ollama) ช่วยงานบางส่วน — dedup, cross-sell, สรุป, ร่างข้อความ, ค้นหาภาษาธรรมชาติ
4. **G-SAFE:** ไม่กระทบข้อมูล/ระบบเดิม — old app ใช้ต่อได้ 100%, ย้อนกลับได้
5. **G-NEW:** เป็นโปรเจกต์ใหม่ `Customer-Relation-Management` แยกจากของเดิม

---

## 3. สถาปัตยกรรมเป้าหมาย (Target Architecture)

### 3.1 ภาพรวม
```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  socrm-system (เดิม)         │        │  Customer-Relation-Management │
│  Next.js 14 · อ่าน x_socrm   │        │  (ใหม่) Next.js · Dynamic + AI │
│  ใช้งานต่อได้ ไม่แตะ          │        │                               │
└──────────────┬──────────────┘        └───────────────┬──────────────┘
               │      อ่าน/เขียน string เดิม              │ อ่านผ่าน views + เขียน additive
               ▼                                          ▼
        ┌────────────────────────────────────────────────────────┐
        │  PostgreSQL  ocr_service                                 │
        │  • schema x_socrm  (เดิม — เพิ่มได้เฉพาะคอลัมน์ nullable) │
        │  • schema crm      (ใหม่ทั้งหมด: org, accounts, config…)  │
        │  • views (map ทับ x_socrm — single source of truth)      │
        └────────────────────────────────────────────────────────┘
                                 ▲
                                 │ HTTP (config URL/model)
                    ┌────────────┴─────────────┐
                    │  Ollama (org internal)    │
                    │  110.49.94.180:11434      │
                    └───────────────────────────┘
```

### 3.2 หลักการแยก schema (สำคัญที่สุดเรื่องความปลอดภัยข้อมูล)
- **`x_socrm` (เดิม):** ห้าม rename/drop/เปลี่ยน type; เพิ่มได้เฉพาะ **คอลัมน์ใหม่ nullable** (เช่น `customers.account_id`) — ทำให้ old app ไม่พัง
- **`crm` (ใหม่):** เก็บโครงสร้างใหม่ทั้งหมด (org hierarchy, accounts, config, referrals, contacts, ai_logs) — แยกขาด ปลอดภัย ลบทิ้งได้ถ้าต้อง rollback
- **compatibility views ใน `crm`:** เช่น `crm.opportunities` = SELECT ทับ `x_socrm.customers` (+ join account) → ระบบใหม่อ่าน "ความหมายใหม่" โดยไม่ทำสำเนา ไม่มี sync job (single source of truth ตาม PRD §11)

---

## 4. โมเดลข้อมูล (Data Model)

### 4.1 ชั้น Dynamic Org (ใหม่ทั้งหมดใน `crm`) — หัวใจของ "ไม่ Fix Logic"
```
crm.companies      (บริษัท — รองรับหลายบริษัท)
  └─ crm.businesses (แบรนด์: SO People / Wheel / Green / Next — ตอบ PRD Q1)
       └─ crm.departments (BU: LBA/LBD/CR/LM/DS/SN + อนาคต)
              • legacy_code  ← bridge ไปยัง x_socrm.customers.department (เช่น 'CR')
              └─ users (เดิม + department_id FK nullable)
crm.roles          (role กำหนดเองได้ ไม่ fix 4 ค่า)
crm.permissions    (สิทธิ์ระดับ feature/action)
crm.role_permissions (map)
crm.user_scopes    (user เห็น company/business/department ใดได้บ้าง — แทน allowed_departments)
```

**ตาราง `crm.departments` (bridge สำคัญ):**
| คอลัมน์ | หมายเหตุ |
|---|---|
| department_id serial PK | |
| business_id FK | |
| name / code | เช่น 'รถเช่า' / 'CR' |
| **legacy_code** | ตรงกับ `x_socrm.customers.department` string เดิม → ทำให้ระบบใหม่กับเก่าเข้าใจ BU เดียวกัน |
| config jsonb | ค่าตั้งต้นเฉพาะแผนก (เช่น unit เริ่มต้น) |

> ผล: เพิ่มบริษัท/แบรนด์/แผนก/บทบาทใหม่ = เพิ่มแถวในตาราง ไม่แก้โค้ด

### 4.2 ชั้น CRM (ตาม PRD §7 — additive)
- **`crm.accounts`** (ใหม่): account_id, account_name, normalized_name (คีย์ dedup), tax_id NULL, industry, address, website, primary_owner_id, timestamps
- **`x_socrm.customers` → Opportunity:** เพิ่มคอลัมน์ **nullable** เท่านั้น — `account_id` (FK → crm.accounts, **ไม่ cascade**), `opportunity_name`, `probability`, `expected_close_date`; คอลัมน์เดิมคงไว้ 100%
- **`x_socrm.customer_services` → Opportunity Line:** เพิ่ม nullable — `unit_price`, `billing_cycle`, `duration_months`, `attributes jsonb`
- **`x_socrm.services` → Catalog+Config:** เพิ่ม nullable — `default_billing`, `attribute_schema jsonb` (บอกฟอร์มว่าต้องถามฟิลด์อะไร) + เพิ่ม unit ที่ขาด (LM ตร.ม./โครงการ, SN package/โครงการ)
- **`crm.contacts`** (ใหม่): ผู้ติดต่อหลายคนต่อ account + role
- **`crm.referrals`** (ใหม่): ส่งต่อข้าม BU + สถานะ + opportunity ที่เกิด

### 4.3 ชั้น Config / Metadata (ใหม่ — ทำให้ "Dynamic ทุกส่วน")
เพื่อไม่ fix logic ฝั่ง business rule:
- **`crm.pipeline_stages`** — stage ต่อ business/department (แทน Lead→Close ตายตัว)
- **`crm.field_definitions`** — นิยามฟิลด์ของ entity (form builder ระดับ config)
- **`crm.picklists`** — dropdown ที่ config ได้ (lead_source, contact_channel, industry…)
- **`crm.workflow_rules`** — เงื่อนไข automation (เช่น ตั้ง followup → สร้าง task) เป็น data ไม่ใช่ if/else
- **`crm.ai_logs`** — เก็บ prompt/response/latency/model ของทุก AI call (audit + cost tracking)
- **`crm.feature_flags` / `users.ui_version`** — เปิดระบบใหม่ทีละ user (rollout ย้อนได้)

---

## 5. Dynamic Engine (ไม่ Fix Logic)

| ด้าน | เดิม (fixed) | ใหม่ (dynamic) |
|---|---|---|
| องค์กร | department string | Company→Business→Department table + legacy_code bridge |
| สิทธิ์ | 4 role hardcode | roles + permissions + user_scopes (RBAC ที่ config ได้) |
| ฟอร์ม | ฟิลด์ตายตัว/คอลัมน์ราย BU | metadata-driven จาก `field_definitions` + `attribute_schema` |
| Pipeline | stage ตายตัว | `pipeline_stages` ต่อ BU |
| Dropdown | ค่าตายตัว | `picklists` |
| Automation | if/else ในโค้ด | `workflow_rules` (data-driven) |

**Layer โค้ด:** `lib/org.ts` (resolve hierarchy/scope), `lib/rbac.ts` (permission check จาก DB), `lib/forms.ts` (render จาก schema), `lib/ai.ts` (Ollama client)

---

## 6. AI Integration (Ollama)

**Client กลาง `lib/ai.ts`:** อ่าน `OLLAMA_BASE_URL` + `OLLAMA_MODEL` จาก env (default `http://110.49.94.180:11434`) — เปลี่ยน model ได้โดยไม่แก้โค้ด, มี timeout/retry/fallback (ถ้า Ollama ล่ม ระบบต้องทำงานต่อได้), log ลง `crm.ai_logs`

**Use cases (เรียงตามคุ้มค่า):**
1. **Account dedup / entity resolution** — เจอชื่อคล้าย → AI จัดกลุ่ม/แนะนำ merge (แก้ปัญหา 15 กลุ่มซ้ำ; PRD ทำ normalize อย่างเดียว AI ช่วยจับที่สะกดต่าง)
2. **Cross-sell hint** — วิเคราะห์ account 360° → เสนอ BU/บริการที่ควรขายต่อ
3. **สรุปประวัติติดต่อ / Account brief** — ย่อ contact_history เป็นสรุปสั้น
4. **ร่างข้อความ** — follow-up email / referral note / next-best-action
5. **Natural-language search** — "ลูกค้ารถเช่ากรุงเทพที่ยังไม่ปิด" → filter
6. **แยกข้อมูลนามบัตร** — OCR text → ฟิลด์ account/contact (ต่อยอด BusinessCard OCR ที่มีอยู่)
7. **ช่วยเหตุผล lead quality / win-lose** — สรุปเป็นข้อความ

> ทุกฟีเจอร์ AI เป็น **assist** (มีผลลัพธ์ให้คนยืนยัน) ไม่ตัดสินใจแทนอัตโนมัติ

---

## 7. Migration / Coexistence (ไม่ทำลายข้อมูล)

1. **DDL เพิ่มอย่างเดียว** — สร้าง schema `crm` + ตาราง org/config + คอลัมน์ nullable ใน x_socrm + views (ไม่เปลี่ยนพฤติกรรมระบบเก่า)
2. **Seed org** — สร้าง companies/businesses/departments โดย `legacy_code` = department string เดิม + roles/permissions ตั้งต้น (map จาก 4 role เดิม)
3. **Backfill accounts** — จัดกลุ่ม `customers` ด้วย normalized_name (+ AI ช่วย) → สร้าง account → set `customers.account_id`; คาด ~517 → ~500 accounts. **มีขั้น admin review/merge ด้วยมือ** (ไม่มี Tax ID)
4. **Backfill contacts** — จาก `contact_person`
5. **เติม config catalog** — attribute_schema + unit ที่ขาด (LM/SN)
6. **Verify** — old app ทำงานปกติ + ตัวเลขตรง (517 ลูกค้า, ดีลข้าม BU 11 ราย, ยอดรวม)
7. **Rollout ทีละ user** ด้วย feature flag — ปิดกลับได้ทุกเมื่อ

**กฎเหล็ก:** ห้าม rename/drop/แก้ type/แก้ค่าเดิม (ยกเว้น backfill `account_id`) · accounts→customers **ไม่ cascade** · ระบบใหม่เขียนต้องเติมคอลัมน์เดิมที่ระบบเก่าใช้ให้ครบ

---

## 8. UX/UI ระบบใหม่

- **Navigation:** เปลี่ยนจาก top-pill เป็น **sidebar** (รองรับเมนูเยอะขึ้น: Accounts, Opportunities, Referrals, Reports, Admin/Settings) + centralized nav config
- **Account 360°:** หน้าใหม่ — เห็นทุกดีลทุก BU ของลูกค้า + ผู้ติดต่อ + ประวัติ + ช่องว่าง cross-sell + ปุ่ม AI (สรุป/แนะนำ)
- **Dynamic form หน้าเดียว:** render จาก catalog + attribute_schema (รองรับทุก BU โดยไม่แยกฟอร์ม)
- **Design system กลาง:** shared icon module, component library (Button/Modal/Table/FilterBar/Field), เลิก copy-paste
- **Dedup = เชื่อม ไม่บล็อก:** เจอ account ซ้ำ → เสนอเพิ่มดีลใหม่เข้า account เดิม (ไม่ 409 บล็อกแบบเดิม)
- คงโทน slate/blue เดิมเพื่อความคุ้นเคย แต่จัดระเบียบเป็น token

---

## 9. แผนเฟส (Phased Delivery)

| เฟส | ขอบเขต | Deliverable | ผลต่อระบบเดิม |
|---|---|---|---|
| **0. Setup** | สร้างโปรเจกต์ `Customer-Relation-Management`, เชื่อม DB, lib กลาง (db/auth/rbac/ai), แก้หนี้ security ตั้งต้น (JWT_SECRET, cookie auth) | โปรเจกต์รันได้ + login | ไม่แตะ |
| **1. Dynamic Org + RBAC** | schema `crm` org/roles/permissions + seed จาก legacy + หน้า Admin จัดการ Company/Business/Department/User/Role | หลังบ้าน dynamic ใช้ได้ | ไม่แตะ |
| **2. Additive DDL + Backfill** | คอลัมน์ nullable + views + accounts/contacts + backfill (+AI dedup) + verify | ข้อมูล account พร้อม | ไม่กระทบ (nullable) |
| **3. Account 360° + Multi-deal + Dynamic Form** | หน้า account/opportunity/line แบบ metadata-driven + config catalog | ฟีเจอร์หลัก CRM | เปิดด้วย feature flag ราย user |
| **4. Cross-BU Referral + AI assist** | referral flow + cross-sell hint + สรุป/ร่างข้อความ + NL search | ขายไขว้ + AI | ฟีเจอร์เสริม |
| **5. Consolidation + Cutover** | ย้าย user ครบ, verify, พิจารณาปิดหน้าจอเก่า | ครบระบบ | ของเดิมไม่เคยถูกลบ |
| **ภายหลัง** | CPQ (line-item quote), weighted forecast, renewal alerts | — | — |

---

## 10. Tech Stack ที่เสนอ

- **Framework:** Next.js 14 App Router + TypeScript (สอดคล้องของเดิม ทีมคุ้น) — *หรือ* อัปเป็น Next.js 15 ถ้าต้องการ
- **DB:** `pg` (คงเดิม) + query builder เบาๆ; connection ผ่าน `PG_*` จาก .env เดิม
- **Auth:** JWT (httpOnly cookie) + Microsoft SSO (คง Azure AD เดิม) — แก้ให้ scope-based
- **UI:** Tailwind + component library กลาง (เสนอ shadcn/ui หรือคง Tailwind ล้วน)
- **AI:** Ollama REST (`/api/generate`, `/api/chat`, `/api/embeddings`) ผ่าน `lib/ai.ts`
- **Config:** env รวมจาก `.env` เดิม (DB, Azure AD, Mail, App URL) + เพิ่ม `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `JWT_SECRET` (บังคับ)

---

## 11. ความเสี่ยง & การรับมือ

| ความเสี่ยง | รับมือ |
|---|---|
| backfill จับกลุ่มผิด (ชื่อต่างสะกด) | normalized_name + AI + admin review/merge ด้วยมือ |
| ระบบเก่าพังจากคอลัมน์ใหม่ | คอลัมน์ใหม่ nullable ทั้งหมด + regression test query เดิม |
| Ollama ล่ม/ช้า | AI เป็น optional + timeout + fallback + log; ระบบหลักไม่พึ่ง AI |
| สิทธิ์ cross-BU รั่ว | RBAC + user_scopes + โมเดลสิทธิ์ 3 ชั้น + test access control |
| สองระบบทำงานพร้อมกันสับสน | feature flag ราย user + single source of truth + คู่มือ |
| ชื่อ model AI ไม่ตรง (ระบุ `qwen3.5:9b`) | ตรวจ `/api/tags` ของ Ollama จริงก่อน + ตั้งค่าใน env |

---

## 12. การตัดสินใจสถาปัตยกรรม (ล็อกแล้ว / ยังเปิด)

### ✅ ล็อกแล้ว (2026-07-10)
- **D3 — โปรเจกต์:** สร้าง `Customer-Relation-Management` เป็น **git repository ใหม่แยกต่างหาก** (ไม่ monorepo) — ต้อง setup env/CI/deploy ใหม่, อ้าง reference จากของเดิม
- **D1 — Org depth:** เฟสแรกทำ **Business → Department** ให้ dynamic ก่อน; เตรียมตาราง `companies` (seed 1 บริษัท) ไว้แต่ยังไม่เปิดใช้เต็ม
- **D2 — RBAC:** **Config ได้เต็ม** — `roles/permissions/user_scopes` สร้าง/แก้ role ผ่าน Admin UI ได้ (มีหน้าจอจัดการสิทธิ์ในเฟส 1)
- **D4 — Stack:** **Next.js 14 + Tailwind + component library (shadcn/ui)** เป็น design system กลาง

### ⏳ ยังเปิด (ไม่บล็อกเฟส 0–1 — ตัดสินใจก่อนเฟสที่เกี่ยวข้อง)
- **D5 (ก่อนเฟส 2/4):** ให้ AI ช่วย dedup ตั้งแต่ backfill (เฟส 2) หรือเริ่ม assist ในเฟส 4?
- **D6 (ก่อนเฟส 3):** LBA/LBD และ DS/SN แชร์ลูกค้า/ทีมกันไหม? · Account layer ให้เห็นแค่ชื่อ+BU หรือสถานะดีลสรุป? · เก็บ Tax ID อย่างไร?

---

## 13. ขั้นถัดไป (เฟส 0 — เมื่ออนุมัติให้เริ่ม)
1. สร้าง repo ใหม่ `Customer-Relation-Management` (Next.js 14 + TS + Tailwind + shadcn/ui) + `.env` (รวมค่าจากเดิม + `OLLAMA_*` + บังคับ `JWT_SECRET`)
2. `lib` กลาง: `db.ts` (PG_* จาก .env), `auth.ts` (JWT httpOnly cookie), `rbac.ts`, `org.ts`, `ai.ts` (Ollama client + fallback)
3. `schema/01_additive.sql` (DDL เพิ่ม: schema `crm` + คอลัมน์ nullable + views) — รันบน DB จริงแบบ additive
4. `schema/02_org_seed.sql` — seed companies/businesses/departments (legacy_code bridge) + roles/permissions ตั้งต้น
5. Login + shell (sidebar) ที่ verify ได้ = จบเฟส 0 → ต่อเฟส 1 (Admin UI จัดการ Org/RBAC แบบ dynamic)
