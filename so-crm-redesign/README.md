# SO CRM Redesign — Workspace

พื้นที่ทำงานสำหรับการ redesign ระบบ SO CRM ให้รองรับโครงสร้างกลุ่ม SO ครบทุก BU

## เป้าหมาย
เปลี่ยนจาก "บันทึกลูกค้ารายแผนก" → "CRM ของกลุ่มที่ขายไขว้ข้าม BU ได้" โดยใช้โมเดล
**Account → Opportunity → Line items** และฟอร์มแบบ metadata-driven (หน้าเดียวรองรับทุก BU)

## โครงสร้างกลุ่ม SO (4 แบรนด์ / 6 BU)
| แบรนด์ | BU | ธุรกิจ | ฐานการคิดราคา |
|---|---|---|---|
| SO People | LBA, LBD | Outsource คน (ตามตำแหน่ง) | คน · รายเดือน |
| SO Wheel | CR | รถเช่า | คัน · รายเดือน |
| SO Green | LM | ดูแล/ปรับปรุงภูมิทัศน์ | พื้นที่ / คน / โครงการ |
| SO Next | DS | Data entry / BPO | ปริมาณงาน / คน + SLA |
| SO Next | SN | Platform / SaaS | user / package / โครงการ |

## เอกสารหลัก
- 📄 **[docs/PRD.md](docs/PRD.md)** — PRD ฉบับเต็ม (อ่านก่อน) รวมทุกอย่างที่ตัดสินใจกันมา
- 📊 [docs/current-database.md](docs/current-database.md) — ผลศึกษาฐานข้อมูลจริง

## โฟลเดอร์
- `schema/` — SQL schema ใหม่ (accounts, opportunities, opportunity_lines, services config) + สคริปต์ migration จาก `x_socrm.customers`
- `config/` — JSON config ต่อ BU (unit_of_measure + attribute_schema ของแต่ละบริการ)
- `docs/` — เอกสารออกแบบ, decision, แผนเฟส, โมเดลสิทธิ์การมองเห็น
- `mockups/` — mockup หน้าจอ (เช่น Account 360°, ฟอร์มสร้างดีลแบบ dynamic)

## หลักการสำคัญ
1. **Account** = องค์กร 1 ราย คีย์ด้วย Tax ID (ดึงข้อมูลองค์กรขึ้นมาชั้นบน)
2. **Opportunity** = ดีล หลายใบต่อ account, BU เป็น attribute, pipeline อยู่ที่นี่
3. **Line items** = หน่วย/จำนวน/ราคา/รอบบิล + `attributes` JSONB ตาม config ของบริการ
4. **Dedup เปลี่ยนเป็น "เชื่อม ไม่บล็อก"** — เจอ Account ซ้ำ = เพิ่มดีลใหม่
5. **สิทธิ์ 3 ชั้น** — Account (กลุ่มเห็น) / Opportunity (BU เจ้าของ) / Referral (ข้าม BU)

## แผนเฟส
- เฟส 1: schema accounts/opportunities + migration + dedup แบบ link
- เฟส 2: Account 360° + multi-opportunity/contact + dynamic line-item form
- เฟส 3: cross-BU referral + auto cross-sell hints
- เฟส 4: CPQ (line-item quote + เวอร์ชัน), weighted forecast, renewal alerts
