# Microsoft SSO setup (Azure AD / Microsoft Entra ID)

1. ไปที่ Microsoft Entra admin center > App registrations > New registration
2. ตั้ง Redirect URI เป็น Web และใส่:
   - Local: `http://localhost:3000/api/auth/microsoft/callback`
   - Vercel: `https://YOUR-DOMAIN/api/auth/microsoft/callback`
3. สร้าง Client Secret
4. ใส่ค่า env ตามไฟล์ `.env.local.example`
5. รัน SQL เพิ่มคอลัมน์ที่เราเตรียมไว้ก่อนหน้านี้
6. วางทับไฟล์ทั้งหมดใน zip นี้ แล้ว deploy
