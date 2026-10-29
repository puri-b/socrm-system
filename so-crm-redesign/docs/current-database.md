# ผลการศึกษาฐานข้อมูลปัจจุบัน (current state)

> เชื่อมต่อจริงเมื่อ 2026-06-30 — host `94.74.115.204`, db `ocr_service`, schema หลัก `x_socrm`
> (ฐานเดียวกันมีหลายระบบอยู่ร่วม เช่น `ocr-ai-db`, `crm_db`, `so-*` ฯลฯ — เราใช้ `x_socrm`)

## 1. ตารางใน x_socrm (10 ตาราง) + ปริมาณข้อมูล
| ตาราง | rows | บทบาท |
|---|---|---|
| customers | 517 | ลูกค้า/ลีด (จะกลายเป็น account + opportunity) |
| contact_history | 640 | ประวัติติดต่อ |
| customer_services | 394 | บริการที่ลูกค้าใช้ (มี quantity ครบทุกแถว) |
| tasks | 232 | งาน |
| task_status_requests | 76 | คำขออนุมัติเปลี่ยนสถานะ |
| task_assignees | 21 | ผู้รับงาน (multi) |
| services | 26 | แค็ตตาล็อกบริการ (มี quantity_unit อยู่แล้ว!) |
| projects | 14 | งานส่งมอบ |
| users | 36 | ผู้ใช้ |
| activity_logs | 371 | audit log |

## 2. การกระจายตัวของลูกค้า
- **ตาม BU:** LBA 178 · LBD 136 · DS 67 · LM 65 · SN 60 · CR 11
- **ตามสถานะ:** Lead 291 · Close 130 · PO 42 · Potential 42 · Prospect 8 · Pipeline 4

## 3. ⭐ หลักฐานยืนยันแนวทาง redesign
- **ลูกค้าชื่อซ้ำ 15 กลุ่ม (รวม 31 แถว)** — คือลูกค้าที่ถูกเปิดซ้ำ ควรยุบเป็น account เดียว
- **11 บริษัทถูกขายข้าม >1 BU แล้วจริง** เช่น โตโยต้า มอเตอร์ เอเชีย (3 แถว/2 BU), CJ Logistics, อีซูซุ, ดับบลิวพี เอ็นเนอร์ยี่, อาลีบาบา คลาวด์ ฯลฯ
  → นี่คือ cross-BU ที่เกิดขึ้นจริง แต่ระบบปัจจุบันมองเป็นคนละลูกค้า = พิสูจน์ว่าโมเดล Account→Opportunity จำเป็น

## 4. ⚠️ ไม่มี Tax ID ที่ใช้ได้
- ไม่มีคอลัมน์ tax_id ใน customers — มีแต่ `registration_info` (free text) เติม 318/517 แต่ **มีแค่ 1 แถวที่หน้าตาเป็นเลข 13 หลัก**
- BusinessCard (ocr-ai-db) มี `taxId` แยกต่างหาก
- **สรุป:** เฟสแรกต้องใช้ "ชื่อบริษัทที่ normalize แล้ว" เป็นกุญแจรวม account (แล้วค่อยเก็บ Tax ID เพิ่มภายหลัง)

## 5. ⭐ ระบบมี "หน่วย" อยู่แล้ว (services.quantity_unit)
ทุกบริการ `requires_quantity = true` และมี unit — โมเดล line-item สร้างต่อยอดได้เลย:
| BU | บริการ | หน่วยปัจจุบัน |
|---|---|---|
| LBA | 6 บริการ (ธุรการ, ช่างอาคาร, IT Outsource, Head Hunter, ปชส., อื่นๆ) | people |
| LBD | 4 บริการ (คนขับรถผู้บริหาร/ส่วนกลาง/อื่นๆ, Valet Parking) | people |
| CR | 4 บริการ (รถเช่าระยะยาว/สั้น, รถตู้, รถดัดแปลง) | vehicles |
| LM | 3 บริการ (ดูแลสวนสวย, ตัดแต่งต้นไม้, ออกแบบสวน) | people |
| DS | 5 บริการ (BPO, OCR, บันทึกข้อมูล, สแกน, คลังเอกสาร) | **boxes / pages / people** (ผสมในBUเดียว!) |
| SN | 4 บริการ (Digidocs, VMS, คลังเอกสารดิจิทัล, เวิร์กโฟลว์) | users |

หมายเหตุ:
- **DS ใช้หลายหน่วยใน BU เดียวอยู่แล้ว** → ยืนยันว่า unit ต้องอยู่ที่ระดับ "บริการ/บรรทัดรายการ" ไม่ใช่ระดับ BU
- **LM ปัจจุบันคิดเป็น people** แต่ธุรกิจจริงมองพื้นที่/โครงการด้วย → ต้องเพิ่ม unit (ตร.ม./โครงการ) ตอนทำ config
- SN ปัจจุบันมีหน่วยเดียว (users) แต่ธุรกิจจริงมี package/โครงการ + รูปแบบติดตั้ง → ต้องเพิ่ม

## 6. ช่องทางติดต่อที่ใช้จริง (contact_channel)
โทร 310 · email 144 · line 109 · พบหน้า 63 · vdo call 14

## 7. สถานะงานที่ใช้จริง (tasks.status)
pending 156 · completed 73 · in_progress 2 · cancelled 1
→ ที่โค้ดอนุญาต (`done`, `postponed`) **ไม่ถูกใช้เลย** ยืนยันว่าควรยุบ enum ให้สั้น

## 8. Foreign keys + delete rule (สำคัญตอน migration)
- `customers` ถูกลบ → **CASCADE** ไปยัง contact_history, customer_services, projects, tasks (และ tasks→task_status_requests)
- FK ที่อ้าง users ส่วนใหญ่เป็น NO ACTION / SET NULL
- ⚠️ แปลว่าการลบลูกค้า 1 รายลบประวัติทั้งหมดทันที — migration ต้องทำบน schema ใหม่แยก ไม่แตะของเดิมจนกว่าจะ verify
