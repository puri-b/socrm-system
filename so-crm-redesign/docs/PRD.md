# PRD — SO CRM ปรับปรุงใหม่ (Account-Centric, Cross-BU, ไม่กระทบระบบเดิม)

| | |
|---|---|
| **เอกสาร** | Product Requirements Document (PRD) |
| **ระบบ** | SO LEAD Management System (SO CRM) |
| **เวอร์ชันเป้าหมาย** | v3 (Account → Opportunity model) |
| **สถานะ** | Draft สำหรับเริ่มพัฒนา |
| **วันที่** | 2026-07-10 |
| **ผู้จัดทำ** | chinnapat.j@siamraj.com |
| **Repo** | `socrm-system` · workspace: `so-crm-redesign/` |
| **ฐานข้อมูลปัจจุบัน** | PostgreSQL — schema `x_socrm` (ดู `docs/current-database.md`) |

---

## 1. บทสรุปผู้บริหาร (Executive Summary)

SO CRM ปัจจุบันทำงานแบบ "บันทึกลูกค้ารายแผนก (BU)" ทำให้เกิดปัญหา 3 อย่าง:
1. เปิดลูกค้าซ้ำเสมอ (ระบบมองลูกค้าเป็นใบงาน ไม่ใช่องค์กร)
2. ลูกค้า 1 ราย มีหลายโปรเจกต์/หลายใบเสนอราคาไม่ได้
3. เสนอราคาข้าม BU ไม่ได้ (ทั้งที่กลุ่ม SO มี 6 BU ที่ควรขายไขว้กัน)

**หลักฐานจากข้อมูลจริง:** มี 11 บริษัทที่ถูกขายข้ามมากกว่า 1 BU แล้ว และมีลูกค้าชื่อซ้ำ 15 กลุ่ม → พิสูจน์ว่าปัญหานี้เกิดขึ้นจริง

**ทางแก้:** ปรับสถาปัตยกรรมข้อมูลเป็น **Account (องค์กร) → Opportunity (ดีล) → Line items (รายการขาย)** โดยใช้ฟอร์มแบบ metadata-driven (หน้าเดียวรองรับทุก BU) และเพิ่มความสามารถขายไขว้ข้าม BU (Cross-BU referral + Account 360°)

**ข้อกำหนดสำคัญที่สุด:** ระบบเดิมมีคนใช้งานเยอะ → การปรับปรุงต้อง **ไม่กระทบข้อมูลเดิมและระบบเดิม** ใช้แนวทาง **additive / strangler บนข้อมูลชุดเดียว** (เพิ่มอย่างเดียว ไม่ลบ ไม่แก้) และทยอยย้าย user แบบย้อนกลับได้

---

## 2. บริบทและโครงสร้างธุรกิจ (Background)

กลุ่ม SO มี 4 แบรนด์ / 6 BU ที่ให้บริการ Outsource ต่างประเภทกับลูกค้าองค์กร:

| แบรนด์ | BU (รหัส) | ธุรกิจ | ฐานการคิดราคา (unit) |
|---|---|---|---|
| SO People | LBA | Outsource คน (หลายตำแหน่ง) | คน · รายเดือน |
| SO People | LBD | Outsource คน (สายขับรถ/บริการ) | คน · รายเดือน |
| SO Wheel | CR | รถเช่า | คัน · รายเดือน |
| SO Green | LM | ดูแล/ปรับปรุงภูมิทัศน์ | พื้นที่ / คน / โครงการ |
| SO Next | DS | Data Entry / BPO / สแกน / OCR | ปริมาณงาน / คน + SLA |
| SO Next | SN | Platform / SaaS | user / package / โครงการ |

**ข้อค้นพบสำคัญ:** ข้อมูล "องค์กรลูกค้า" และ "pipeline การขาย" เหมือนกันทุก BU — ต่างกันแค่ **หน่วยที่ขาย + รอบบิล + ข้อมูลเฉพาะบริการ** เท่านั้น (จึงไม่ต้องแยกฟอร์ม/ตารางราย BU)

รูปแบบการขายของ SN มีหลายแบบ: SaaS public, SaaS private, on-prem, on-prem custom (จัดเป็น attribute + รอบบิลของ line item)

---

## 3. ปัญหาปัจจุบัน (Problem Statement) — อ้างอิงข้อมูลจริง

จากการเชื่อมต่อ DB จริง (2026-06-30, `x_socrm`, 517 ลูกค้า):

1. **ลูกค้าซ้ำ** — 15 กลุ่มชื่อซ้ำ (31 แถว) เพราะไม่มีแนวคิด "องค์กรเดียว"
2. **cross-BU ทำไม่ได้** — 11 บริษัทถูกขายข้าม >1 BU แล้ว แต่ระบบเก็บเป็นคนละลูกค้า (เช่น โตโยต้า มอเตอร์ เอเชีย 3 แถว/2 BU, CJ Logistics, อีซูซุ, ดับบลิวพี เอ็นเนอร์ยี่, อาลีบาบา คลาวด์)
3. **หลายดีลต่อลูกค้าไม่ได้** — pipeline ผูกกับตัวลูกค้า ทำให้ลูกค้าเก่ากลับมาซื้อรอบใหม่ต้องทับของเดิมหรือเปิดซ้ำ
4. **โครงสร้างอื่นที่พบ:** ไม่มี Tax ID ที่ใช้ได้ (registration_info เป็น free text, มีแค่ 1 แถวที่เป็นเลข 13 หลัก); สถานะงาน `done`/`postponed` ไม่เคยถูกใช้; ใบเสนอราคาเป็นแค่ตัวเลขไม่ใช่เอกสาร; ไม่มี loop หลังการขาย (renewal)

---

## 4. เป้าหมาย & ตัวชี้วัด (Goals / Non-Goals / Metrics)

### 4.1 เป้าหมาย
- G1: ลูกค้า 1 องค์กร = 1 Account (ไม่ซ้ำ) มีได้หลายดีลข้ามหลาย BU
- G2: หน้าเดียวรองรับการเก็บข้อมูลครบทั้ง 6 BU (metadata-driven)
- G3: เปิดการขายไขว้ข้าม BU (referral + มุมมอง Account 360°)
- G4: **ไม่กระทบระบบเดิม/ข้อมูลเดิม** — old app ใช้งานได้ต่อ, ย้าย user แบบย้อนกลับได้
- G5: วางฐานสำหรับ forecast, ใบเสนอราคาแบบมีรายการ, และ renewal ในอนาคต

### 4.2 Non-Goals (ยังไม่ทำในรอบนี้)
- ไม่ทำ CPQ เต็มรูป (line-item quote + เวอร์ชัน) ในเฟสแรก — วางโครงไว้ก่อน
- ไม่ทำ weighted forecast/quota ในเฟสแรก
- ไม่ทำ integration ระบบบัญชี/ERP
- ไม่ลบหรือรื้อระบบเดิมจนกว่าจะย้ายครบและ verify

### 4.3 ตัวชี้วัดความสำเร็จ
- จำนวนลูกค้าซ้ำใหม่ = 0 (สร้างดีลเชื่อมเข้า account เดิมแทน)
- % ลูกค้าที่มีดีล >1 BU เพิ่มขึ้น (วัด cross-sell)
- จำนวน referral ข้าม BU และ % ที่ปิดได้
- ไม่มี incident จากระบบเดิมระหว่างเปลี่ยนผ่าน (0 breaking change)

---

## 5. ผู้ใช้และบทบาท (Roles)

คงบทบาทเดิม + ปรับสิทธิ์การมองเห็นให้รองรับ cross-BU:
- **user** — Sale ประจำ BU
- **manager** — หัวหน้า จัดการ user ใน BU
- **admin** — เห็น/จัดการทุก BU + services
- **digital_marketing** — เห็นได้หลาย BU ตาม `allowed_departments`
- (ใหม่ แนะนำ) **brand lead** — หัวหน้าระดับแบรนด์ เห็นทุก BU ในแบรนด์ (เช่น SO Next เห็นทั้ง DS + SN) — *ขึ้นกับคำตอบ Open Question Q1*

---

## 6. หลักการออกแบบ (Design Principles)

1. **Additive only** — เพิ่มตาราง/คอลัมน์ใหม่เท่านั้น; ห้าม rename/drop/เปลี่ยน type ของเดิม; คอลัมน์ใหม่ nullable เสมอ
2. **Single source of truth** — ระบบเก่าและใหม่ใช้ตารางชุดเดียวกัน ไม่มี sync job
3. **`customers` เดิม = `opportunities`** — เพิ่มชั้น `accounts` ทับด้านบน
4. **Metadata-driven form** — ฟิลด์ย่อยของรายการขายถูกกำหนดโดย config ของบริการ ไม่ hardcode ราย BU
5. **Reversible rollout** — เปิดระบบใหม่ทีละ user ด้วย feature flag; ปิดกลับได้ทุกเมื่อ
6. **Dedup = เชื่อม ไม่บล็อก** — เจอ account ซ้ำให้เพิ่มดีลใหม่ ไม่ปฏิเสธ

---

## 7. โมเดลข้อมูลใหม่ (Data Model)

### 7.1 ภาพรวมความสัมพันธ์
```
accounts (องค์กร, ใหม่)
  └─ opportunities (ดีล = customers เดิม + account_id + คอลัมน์เสริม)
       ├─ bu (LBA/LBD/CR/LM/DS/SN)
       ├─ opportunity_lines (= customer_services เดิม + คอลัมน์เสริม)
       │     └─ service (services เดิม + config: unit, billing, attribute_schema)
       ├─ contact_history (เดิม — ผูก customer_id)
       ├─ tasks (เดิม)
       └─ project (เดิม — เปิดเมื่อได้ PO)
  ├─ contacts (ผู้ติดต่อหลายคน + บทบาท, ใหม่)
  └─ referrals (ส่งต่อข้าม BU, ใหม่)
```

### 7.2 ตารางใหม่: `accounts`
| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| account_id | serial PK | |
| account_name | text NOT NULL | ชื่อองค์กร |
| normalized_name | text | คีย์ dedup (lower/trim/ตัดคำต่อท้าย) |
| tax_id | text NULL | เก็บเพิ่มภายหลัง (ปัจจุบันไม่มีข้อมูล) |
| industry | text NULL | |
| address | text NULL | |
| website | text NULL | |
| primary_owner_id | int NULL | ผู้ดูแลหลัก (อ้าง users) |
| created_at / updated_at | timestamp | |

### 7.3 ต่อยอด `customers` → เป็น Opportunity (เพิ่มคอลัมน์ nullable)
- `account_id int NULL` (FK → accounts, **ไม่ cascade**)
- `opportunity_name text NULL` (ถ้าไม่ระบุใช้ company_name + service)
- `probability int NULL` (สำหรับ forecast อนาคต)
- `expected_close_date date NULL`
- คอลัมน์เดิมทั้งหมด (company_name, department, lead_status, contract_value, win/lose_reason, car_type...) **คงไว้เหมือนเดิม**
- ระบบเก่ายังอ่าน `customers` แบบเดิมได้ 100%

### 7.4 ต่อยอด `customer_services` → เป็น Opportunity Line (เพิ่มคอลัมน์ nullable)
- `unit_price numeric NULL`
- `billing_cycle text NULL` — one_time | monthly | yearly | per_project
- `duration_months int NULL`
- `attributes jsonb NULL` — ข้อมูลเฉพาะตาม attribute_schema ของบริการ
- คงเดิม: customer_id, service_id, quantity (ข้อมูลปัจจุบันครบ 394/394 แถว)

### 7.5 ต่อยอด `services` → เป็น Catalog + Config (เพิ่มคอลัมน์ nullable)
- ใช้ `quantity_unit` เดิมเป็น unit_of_measure (มีอยู่แล้ว: people/vehicles/boxes/pages/users)
- `default_billing text NULL`
- `attribute_schema jsonb NULL` — บอกฟอร์มว่าต้องถามฟิลด์อะไรเพิ่ม
- **ต้องเพิ่ม unit ที่ธุรกิจจริงต้องการแต่ catalog ยังไม่มี:** LM (ตร.ม./โครงการ), SN (package/โครงการ + รูปแบบติดตั้ง)

### 7.6 ตารางใหม่: `contacts` (ผู้ติดต่อหลายคนต่อ account)
account_id, name, position, role (decision_maker/user/procurement/...), phone, email, line_id, is_primary

### 7.7 ตารางใหม่: `referrals` (ส่งต่อข้าม BU)
referral_id, account_id, from_bu, to_bu, from_user_id, to_user_id NULL, note, status (open/accepted/converted/declined), created_opportunity_id NULL, created_at

---

## 8. ฟอร์มหน้าเดียว (Metadata-Driven) — ตอบทุก BU

โครงฟอร์ม:
1. **ส่วนคงที่ (เหมือนทุก BU):** ข้อมูลองค์กร (Account) + ดีล & Pipeline (BU, เจ้าของ, สถานะ, แหล่งที่มา)
2. **ส่วนยืดหยุ่น (บรรทัดรายการ):** เลือกบริการจาก catalog ของ BU → ฟอร์ม render ฟิลด์ตาม `attribute_schema` ของบริการนั้น
   - ฟิลด์มาตรฐาน: หน่วย · จำนวน · ราคา/หน่วย · รอบบิล
   - ฟิลด์เฉพาะ (จาก attribute_schema): เช่น CR→ประเภทรถ/เกียร์, DS→SLA%/ประเภทเอกสาร, SN→รูปแบบติดตั้ง, LBA/LBD→ตำแหน่ง

ตัวอย่าง `attribute_schema` (เก็บใน services):
```json
// CR - รถตู้
[{"key":"car_type","label":"ประเภทรถ"},{"key":"gear","label":"เกียร์","options":["auto","manual"]},{"key":"rental_months","label":"ระยะเวลาเช่า","type":"number"}]
// DS - บริการบันทึกข้อมูล
[{"key":"sla_percent","label":"SLA %","type":"number"},{"key":"doc_type","label":"ประเภทเอกสาร"}]
// SN - เวิร์กโฟลว์แพลตฟอร์ม
[{"key":"deployment","label":"รูปแบบติดตั้ง","options":["saas_public","saas_private","on_prem","on_prem_custom"]}]
// LBA - พนักงานตำแหน่งอื่นๆ
[{"key":"position","label":"ตำแหน่ง"},{"key":"shift","label":"กะ"}]
```

**ประโยชน์:** เพิ่ม BU/บริการ/หน่วยใหม่ = แก้ config (JSON) ไม่ต้องแก้โค้ดฟอร์ม

---

## 9. Cross-BU Referral & Account 360°

- **Account 360°:** หน้าเดียวเห็นทุกดีลของลูกค้ารายนี้ทุก BU + ผู้ติดต่อ + ประวัติ + BU ที่ยังไม่เคยขาย (ช่องว่าง cross-sell)
- **Referral:** Sale ที่เจอลูกค้าก่อน กดส่งต่อให้ BU อื่น พร้อมโน้ต → เกิด opportunity ใหม่ใน BU ปลายทาง + วัดผลการส่งต่อ
- **Auto cross-sell hint:** ระบบชี้ว่า "ลูกค้ารายนี้ยังไม่มีดีลกับ SO Wheel/Green/Next"

---

## 10. โมเดลสิทธิ์การมองเห็น 3 ชั้น

| ชั้น | ใครเห็น | เห็นอะไร |
|---|---|---|
| Account (องค์กร) | ทุก BU ในกลุ่ม (ระดับเบา) | ชื่อ, อุตสาหกรรม, BU ไหนดูแลอยู่ — กันเปิดซ้ำ + เห็นโอกาส cross-sell |
| Opportunity (ดีล) | เฉพาะ BU เจ้าของ + admin + DM (+ brand lead) | มูลค่า, ใบเสนอราคา, pipeline |
| Referral (สะพาน) | BU ต้นทาง ↔ ปลายทาง | เฉพาะดีลที่ส่งต่อ |

หลักการ: "รู้ว่ามีลูกค้ารายนี้ในกลุ่ม" เปิด — "รายละเอียดดีล/ราคา" ปิดเฉพาะเจ้าของ

---

## 11. กลยุทธ์อยู่ร่วมกับระบบเดิม (Coexistence) — ข้อกำหนดหลัก

**แนวทางที่เลือก: Additive + Strangler บน single source of truth** (ไม่ใช่ big-bang, ไม่ใช่ sync 2 ฐาน)

### กฎเหล็ก
1. ✅ เพิ่มตารางใหม่ได้ / เพิ่มคอลัมน์ใหม่ได้ (nullable เสมอ)
2. ❌ ห้าม rename / drop / เปลี่ยน type คอลัมน์เดิม
3. ❌ ห้ามแก้ค่าแถวเดิม (ยกเว้น backfill `account_id` ที่ระบบเก่าไม่ใช้)
4. ระบบใหม่อ่านผ่าน **compatibility views** (`opportunities`, `account_360`, ฯลฯ) ที่ map ทับตารางเดิม — ไม่ทำสำเนา
5. เมื่อเขียนผ่านระบบใหม่ ต้องเติมคอลัมน์เดิมที่ระบบเก่าใช้ให้ครบ (เพราะเป็นแถวเดียวกัน = อัตโนมัติ)

### ข้อควรระวังจาก DB จริง
- FK เดิมเป็น CASCADE จาก `customers` → **ไม่**ผูก accounts แบบ cascade ลง customers (กันลบ account แล้วลบข้อมูลเก่า)
- ระบบเก่ายังมี logic "กันซ้ำ = บล็อก" → ช่วงเปลี่ยนผ่านปล่อยไว้ (คนละ flow กับระบบใหม่)

---

## 12. แผน Migration / Backfill (ไม่ทำลายข้อมูล)

1. รัน DDL เพิ่ม (ตาราง + คอลัมน์ nullable + views) — ไม่เปลี่ยนพฤติกรรมระบบ
2. Backfill `accounts`: จัดกลุ่ม `customers` ด้วย `normalized_name` → สร้าง account ต่อกลุ่ม → set `customers.account_id`
   - คาดผล: 517 customers → ~500 accounts (ยุบ 15 กลุ่มซ้ำ ~31 แถว), แต่ละ customer = 1 opportunity
3. Backfill `contacts`: ดึงจาก `contact_person` (+ อนาคตจาก BusinessCard/OCR)
4. เติม config catalog: `attribute_schema` + unit ที่ขาด (LM, SN)
5. Verify: ตรวจว่า old app ยังทำงาน + ตัวเลขตรง (จำนวนลูกค้า, ยอด, ดีลข้าม BU 11 ราย)

*ทั้งหมดทำบน schema ใหม่/คอลัมน์ใหม่ ไม่แตะข้อมูลเดิม — ย้อนได้ด้วยการ drop ส่วนที่เพิ่ม*

---

## 13. แผนเฟส & การเปิดใช้ (Rollout)

| เฟส | ขอบเขต | ผลต่อ user เดิม |
|---|---|---|
| 0 | DDL เพิ่ม (accounts, คอลัมน์ nullable, views) | ไม่รู้สึกอะไร |
| 1 | Backfill accounts + account_id + contacts | ไม่กระทบ |
| 2 | หน้าจอใหม่ (Account 360°, multi-deal, dynamic form) เปิดด้วย feature flag ราย user | คนยังไม่เปิด = ใช้ของเดิม |
| 3 | ฟอร์มสร้าง/แก้เขียนผ่าน layer ใหม่ (เติมคอลัมน์เดิมครบ) + dedup แบบเชื่อม | ข้อมูลตรงกันทั้งสองฝั่ง |
| 4 | Cross-BU referral + auto cross-sell hint | ฟีเจอร์เสริม |
| 5 | เมื่อย้ายครบ + verify → พิจารณาปิดหน้าจอเก่า | ของเดิมไม่เคยถูกลบ |
| ภายหลัง | CPQ (line-item quote), weighted forecast, renewal alerts | — |

**Feature flag:** เพิ่ม `users.ui_version` หรือ flag ต่อ user (nullable, default = เก่า)

---

## 14. ข้อกำหนดที่ไม่ใช่ฟังก์ชัน (Non-Functional) + หนี้เทคนิคที่ควรแก้ควบคู่

จากการรีวิวโค้ดเดิม (แยก track ได้ แต่ควรทำช่วงปรับ):
- 🔴 บังคับ `JWT_SECRET` ต้องมีค่า (ตอนนี้มี fallback `'your-secret-key'`)
- 🔴 ปิด self-onboarding SSO ให้ต้องอนุมัติ/whitelist (ตอนนี้ใครใน tenant ก็เลือกแผนกเองได้)
- 🟠 แก้ DB `ssl: rejectUnauthorized:false` ให้ verify cert
- 🟠 cache Microsoft Graph token + ส่งอีเมล async (ตอนนี้ขอ token ใหม่ทุกอีเมล + ส่ง sequential)
- 🟡 เพิ่ม pagination + index (customers/tasks), ยุบ enum สถานะงาน (`done`/`postponed` ไม่ถูกใช้)
- 🟡 เปลี่ยน hard-delete ลูกค้าเป็น soft-delete (ปัจจุบัน CASCADE ลบประวัติทั้งหมด)

---

## 15. ความเสี่ยงและการรับมือ

| ความเสี่ยง | การรับมือ |
|---|---|
| การ backfill จับกลุ่มผิด (ชื่อบริษัทเขียนต่างกัน) | ใช้ normalized_name + ให้ admin review/merge ด้วยมือ; ไม่มี Tax ID จึงต้องมีขั้น manual confirm |
| ระบบเก่าพังจากคอลัมน์ใหม่ | คอลัมน์ใหม่ nullable ทั้งหมด + ทดสอบ query เดิม |
| ข้อมูลไม่ตรงกันสองระบบ | ใช้ single source of truth (ไม่มีสำเนา/ไม่มี sync) |
| user สับสนช่วงมีสองระบบ | rollout ทีละคน + feature flag + คู่มือ |
| สิทธิ์ cross-BU รั่ว | โมเดล 3 ชั้น + ทดสอบ access control |

---

## 16. คำถามที่ต้องตัดสินใจ (Open Questions)

- **Q1:** "แบรนด์" (SO People/Wheel/Green/Next) ต้องเป็นชั้นจริงในระบบไหม (มีรายงาน/สิทธิ์ระดับแบรนด์ เช่น brand lead เห็นทั้ง DS+SN)?
- **Q2:** 2 BU ในแบรนด์เดียว (LBA/LBD, DS/SN) แชร์ลูกค้า/ทีมกันเอง หรือแยกขาด?
- **Q3:** ระดับการเปิด "Account layer" ให้ทุก BU เห็น — เห็นแค่ชื่อ+BU ที่ดูแล หรือเห็นสถานะดีลระดับสรุปด้วย?
- **Q4:** เก็บ Tax ID เพิ่มอย่างไร (บังคับกรอกดีลใหม่? ดึงจาก BusinessCard/OCR?)
- **Q5:** ใบเสนอราคาแบบมีรายการ (CPQ) จัดเข้าเฟสไหน?

---

## 17. ภาคผนวก

- `docs/current-database.md` — ผลการศึกษา DB ปัจจุบัน (ตาราง, ปริมาณ, FK, catalog)
- `README.md` — สรุปเป้าหมาย/โครงสร้างโฟลเดอร์
- ถัดไป: `schema/01_additive.sql` (DDL เพิ่มอย่างเดียว), `config/*.json` (attribute_schema ราย BU), `mockups/` (Account 360°, dynamic form)

### สรุปการ mapping ระบบเดิม → ใหม่
| เดิม (x_socrm) | ใหม่ | วิธี |
|---|---|---|
| customers (แถว) | opportunity | เพิ่ม account_id + คอลัมน์ nullable |
| (ข้อมูลองค์กรใน customers) | accounts | ดึงขึ้น + backfill จัดกลุ่ม |
| customer_services | opportunity_lines | เพิ่มคอลัมน์ nullable |
| services | catalog + config | เพิ่ม attribute_schema, default_billing |
| contact_person | contacts | backfill + ขยายหลายคน |
| contact_history / tasks / projects | คงเดิม | ผูก customer_id (=opportunity) เหมือนเดิม |
