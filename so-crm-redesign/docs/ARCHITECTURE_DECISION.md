# สถาปัตยกรรมระบบใหม่ (Architecture Decision) — คู่ขนาน → Cutover

| | |
|---|---|
| วันที่ | 2026-07-10 |
| เป้าหมายผู้บริหาร | **รันคู่ขนานต่อยอดข้างระบบเดิมก่อน → เมื่อระบบใหม่นิ่ง/สมบูรณ์ ค่อยปิดระบบเก่าแล้วย้ายมาใช้ตัวใหม่ทั้งหมด** |
| ข้อกำหนดเหล็ก | ระบบเดิมต้องไม่มีปัญหา · ข้อมูลจริงห้ามกระทบ/ห้ามเพี้ยน · ทุกส่วน dynamic (ไม่ fix logic) |
| อ้างอิงหลักฐาน | [DB_VERIFICATION_2026-07-10.md](DB_VERIFICATION_2026-07-10.md) (ตรวจ read-only จริง) |

---

## 0. อัปเดตการตัดสินใจ (FINAL — 2026-07-10)

ผู้ใช้เลือก: **ตารางใหม่ทั้งหมดอยู่ใน schema `x_socrm` (ไม่แยก schema)** พร้อม **มาตรฐานการตั้งชื่อ** ให้แยกของใหม่ออกจากของเดิมชัดเจน:

| กรณี | กติกา | ตัวอย่าง |
|---|---|---|
| **ตารางใหม่** (โครงสร้างใหม่ล้วน) | prefix **`n_`** | `n_accounts`, `n_contacts`, `n_referrals`, `n_companies`, `n_businesses`, `n_departments`, `n_roles`, `n_permissions`, `n_role_permissions`, `n_user_roles`, `n_custom_fields`, `n_custom_field_values`, `n_pipeline_stages`, `n_picklists`, `n_workflow_rules`, `n_ai_logs`, `n_feature_flags` |
| **คอลัมน์ใหม่บนตารางเดิม** | suffix **`_new`** | `customers.account_id_new`, `customers.opportunity_name_new`, `customer_services.unit_price_new`, `customer_services.attributes_new`, `services.attribute_schema_new` |

**ประโยชน์:** มองปุ๊บรู้ว่าอะไรของใหม่ · ถอย (rollback) ง่าย = ลบทุก object ที่ขึ้นต้น `n_` + ทุกคอลัมน์ลงท้าย `_new` · ไม่มีทางพลาดไปแตะ object เดิม
**ผลต่อ tooling:** เหลือ schema เดียว → Prisma ใช้แบบ **single-schema** (ไม่ต้อง multiSchema) · introspect เฉพาะ `x_socrm`
**หมายเหตุ:** ทุกที่ในเอกสารนี้ที่เขียน "schema `crm`" ให้อ่านเป็น "ตาราง `n_*` ใน `x_socrm`" แทน

---

## 1. ข้อสรุปที่ "ถูกบังคับด้วยตรรกะ" (ไม่ใช่ความชอบ)

**คำถาม:** ช่วงคู่ขนาน ข้อมูลตัวจริงต้องอยู่ที่ไหน?

**เหตุผล:**
- ระบบเก่ายังรันอยู่ และเรา **แก้ระบบเก่าไม่ได้** → มันอ่าน/เขียน `x_socrm` เท่านั้น
- ถ้าแอปใหม่เก็บข้อมูลหลัก (ลูกค้า/ดีล/งาน/ผู้ใช้) ไว้ **ที่อื่น** (เช่น crm_db) → จะมีข้อมูล **2 ชุด** ที่เขียนคนละที่ → **เพี้ยน/ไม่ตรงกันแน่นอน** = ผิดข้อกำหนดเหล็ก
- เราเปลี่ยนแอปเก่าไม่ได้ ดังนั้นวิธีเดียวที่ให้ข้อมูล "ชุดเดียว" ขณะรัน 2 แอปพร้อมกันคือ:

> ### ⇒ ช่วงคู่ขนาน: `x_socrm` = Single Source of Truth ของข้อมูลหลัก แอปใหม่ต้องอ่าน/เขียนบน x_socrm โดยตรง (ไม่สำเนา)

นี่ **ปิดประตู** การใช้ crm_db เป็น store หลักช่วงคู่ขนาน (crm_db ว่างเปล่า + จะทำให้ข้อมูล 2 ชุด)

---

## 2. สถาปัตยกรรม 2 เฟส

### เฟส A — คู่ขนาน (ตอนนี้ → ระบบใหม่สมบูรณ์)
```
   แอปเก่า (socrm-system)  ─┐
                            ├─►  x_socrm  ◄── Single Source of Truth (ข้อมูลหลักชุดเดียว)
   แอปใหม่ (CRM ใหม่)  ─────┘        │  customers/users/services/contact_history/tasks/projects
                                     │
   แอปใหม่ยังอ่าน/เขียนเพิ่มที่ ►  schema `crm` (ใหม่, additive)  ── โครงสร้าง dynamic ที่แอปเก่าไม่ใช้
                                        (org, rbac, custom fields, accounts, pipeline config, ai logs...)
                                        อ้างอิง id ของ x_socrm · แอปเก่าไม่เคย query = กระทบ 0
```

**กฎการเก็บข้อมูลช่วงคู่ขนาน:**
| ประเภทข้อมูล | เก็บที่ | เหตุผล |
|---|---|---|
| Entity หลักที่ 2 แอปใช้ร่วม (ลูกค้า/ผู้ใช้/บริการ/ประวัติ/งาน/โปรเจกต์) | **x_socrm** (ชุดเดียว) | กันเพี้ยน — ทั้ง 2 แอปเห็นแถวเดียวกัน |
| Attribute เสริมของ entity เดิม (เช่น account_id ของลูกค้า) | **คอลัมน์ nullable ใหม่ใน x_socrm** | additive ปลอดภัย (verify แล้ว) แอปเก่ามองข้าม |
| โครงสร้างใหม่ล้วน (org hierarchy, RBAC, custom fields, accounts layer, contacts, referrals, pipeline config, workflow, ai logs, feature flags) | **schema `crm` ใหม่** อ้าง id ของ x_socrm | dynamic เต็ม · แยกขาด · แอปเก่าไม่แตะ · rollback ได้ด้วย DROP SCHEMA |

**ทำไมข้อมูลไม่มีทางเพี้ยนช่วงคู่ขนาน:** พื้นผิวที่เขียนร่วมกัน = ตารางหลักใน x_socrm เท่านั้น (ไม่มีสำเนา = เพี้ยนไม่ได้โดยโครงสร้าง) ส่วน schema `crm` เป็นข้อมูลใหม่ที่แอปเก่าไม่รู้จัก จึงกระทบแอปเก่าไม่ได้

### เฟส B — Cutover (เมื่อระบบใหม่สมบูรณ์)
- ปิดแอปเก่า → แอปใหม่เป็นระบบเดียว → **หมดความเสี่ยงข้อมูล 2 ชุด**
- ค่อยตัดสิน (เลื่อนไปตอนนั้น): (ก) **คง x_socrm + crm เป็น store ถาวร** (ย้ายน้อยสุด เสี่ยงต่ำสุด) หรือ (ข) **migrate ครั้งเดียวเข้า schema แบบ crm_db** ถ้าจะไปทาง multi-tenant SaaS — ทำได้ปลอดภัยเพราะไม่มีแอปเก่าเขียนแข่งแล้ว

---

## 3. "Dynamic ทุกส่วน" ทำได้อย่างไรทั้งที่เกาะ x_socrm

- นิยาม org/role/permission/field/pipeline **อยู่ใน schema `crm` แบบ dynamic เต็ม** (data-driven ไม่ hardcode)
- เชื่อมกับ x_socrm ผ่าน **mapping/legacy_code** (เช่น crm.department.legacy_code = 'CR')
- **ข้อจำกัดชั่วคราวช่วงคู่ขนาน:** ค่าที่เขียน**กลับ**ลง `x_socrm.customers.department`/`lead_status` ต้องอยู่ใน 6 ค่าเดิม (เพราะ CHECK constraint + แอปเก่าต้องอ่านรู้เรื่อง) — เป็นขอบเขตของ "การเขียนกลับตารางเก่า" ไม่ใช่ข้อจำกัดของแอปใหม่
- **หลัง cutover:** ไม่มีขอบเขตนี้แล้ว → dynamic เต็มรูป (เพิ่ม BU/stage/field ได้อิสระ)
- แอปใหม่ **ไม่ hardcode** BU/role/field ใดๆ — อ่านจาก config ใน `crm` เสมอ (ตรงเป้า "ไม่ fix logic")

---

## 4. Authentication (คู่ขนาน)

- NextAuth v4 + Azure AD (ตามที่กำหนด) · session แบบ JWT
- **User store = `x_socrm.users`** (ผู้ใช้จริง 39 คน) — **ไม่ import ไปไหน** (single source)
  - verify แล้ว: email ไม่ซ้ำ, active 38/39, มี email ครบ, มีคอลัมน์ SSO อยู่แล้ว (`user_provider/provider_user_id/allow_sso_login`)
- RBAC (dynamic) อ่านจาก `crm.roles/permissions/user_roles` โดย key = `x_socrm.users.user_id`
- signIn callback: อนุญาตเฉพาะ user ที่มีใน x_socrm + active (แก้ช่องโหว่ self-onboarding เดิม)

---

## 5. ผลต่อโค้ดที่ scaffold ไปแล้ว (ต้องปรับ ก่อนไปต่อ)

โครง NextAuth/SessionProvider/Prisma ที่ทำไว้ **ใช้ต่อได้** แต่ต้อง **เปลี่ยนเป้าหมาย DB จาก crm_db → x_socrm (+ crm)**:
1. Prisma introspect ใหม่บน **x_socrm + crm** (multiSchema) แทน crm_db
2. `getOrgUserByEmail` อ่าน `x_socrm.users` + join RBAC จาก `crm`
3. crm_db ลดบทบาทเป็น **พิมพ์เขียว/ตัวเลือก target ตอน cutover** (ไม่ใช่ store)

---

## 6. กฎความปลอดภัยข้อมูล (บังคับตลอดโครงการ)
1. x_socrm: เพิ่มได้เฉพาะ **คอลัมน์ nullable / ตารางใหม่ / schema ใหม่** — ห้าม rename/drop/เปลี่ยน type/แก้ค่าเดิม (ยกเว้น backfill คอลัมน์ใหม่)
2. DDL ทุกครั้ง = **SQL ที่ review แล้ว รันเอง** — **ห้าม `prisma migrate`/`db push`** บน x_socrm/crm_db (shared DB, ไม่มี prisma migration ใน x_socrm)
3. ทุก DDL ต้อง **reversible** + ทดสอบ query แอปเก่าไม่พังก่อนใช้จริง
4. การ "เขียน" DB ครั้งแรกๆ ต้องขออนุมัติ + มี rollback (read-only ทำได้เลยตามที่อนุมัติไว้)
5. หลีกเลี่ยง CASCADE delete จาก accounts→customers (กันลบ account แล้วลบข้อมูลเก่า)

---

## 7. สิ่งที่ต้องคอนเฟิร์มก่อนลงมือเฟสถัดไป
- **C1:** schema ใหม่ชื่อ `crm` (fresh, อ้าง x_socrm) — โอเคไหม (แนะนำ; ไม่ใช้ crm_db เป็น store)
- **C2:** data layer แอปใหม่ = Prisma multiSchema (x_socrm + crm) client เดียว — โอเคไหม (แนะนำ)
- **C3:** post-cutover target (x_socrm+crm ถาวร vs migrate เข้า crm_db) — **เลื่อนไปตัดสินตอนใกล้ cutover** (ไม่ต้องตอบตอนนี้)
