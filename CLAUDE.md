# อ่านคล่อง นม.2 — คู่มือสำหรับ Claude

ระบบประเมินการอ่านของ สพป.นครราชสีมา เขต 2 (React + TypeScript + Vite + Supabase) ตอบผู้ใช้เป็นภาษาไทย

## ข้อมูลโปรเจคจริง (ไม่ใช่ความลับ)
- GitHub: `winainu-lab/ReadingAndWritingApp` (branch `main`) — git user `winaiNun <winaicomputer18@gmail.com>`
- เว็บจริง (Vercel, deploy อัตโนมัติเมื่อ push `main`, ใช้เวลา 1–7 นาที): https://reading-and-writing-app.vercel.app
- Supabase จริง: ref `ivutsksddeoqxmzcmqfy` ("winainu-lab's Project", Seoul) — ตรวจแล้วจากไฟล์ JS ของเว็บจริง
- อย่าสับสนกับโปรเจคอื่นในบัญชี Supabase `superkorat2app` / `superkorat2-droid's Project` ซึ่งไม่เกี่ยวกับเว็บนี้
- Supabase local: `supabase start` (ต้องเปิด Docker) → API `127.0.0.1:54321`, Studio `:54323`, dev server `npm run dev` (`:5173`), ฟังก์ชัน `npm run functions:serve`
- บัญชี local เท่านั้น: `admin@korat2.local / Admin1234!`, `supervisor@korat2.local / Supervisor1234!`, `teacher@korat2.local / Teacher1234!`

## เมื่อผู้ใช้กลับมา / สลับโปรเจค / ล็อกเอาท์ไป: ทำอันดับแรก
1. รัน `npm run release:check` (อ่านอย่างเดียว) ตรวจ git remote, บัญชี Supabase CLI ที่ล็อกอิน, การผูกโปรเจค, migration ที่ค้าง และเว็บจริง
2. ถ้าสคริปต์บอกให้แก้ ทำตามที่มันแนะนำ แล้วบอกผู้ใช้เฉพาะขั้นที่ต้องทำเอง (ล็อกอิน/รหัสผ่าน)
3. ถ้า `supabase projects list` ไม่เห็น `ivutsksddeoqxmzcmqfy` แปลว่า CLI ล็อกอินผิดบัญชี → ผู้ใช้ต้อง `supabase logout` แล้ว `supabase login` ด้วยบัญชีเจ้าของโปรเจค (อาการคือ 403)
4. ถ้าไม่ได้ผูกโปรเจค (โฟลเดอร์ `supabase/.temp` หายเมื่อ clone ใหม่): `supabase link --project-ref ivutsksddeoqxmzcmqfy`

สิ่งที่เก็บถาวรไม่ได้/ไม่ควรเก็บในไฟล์: รหัสผ่านฐานข้อมูลและ access token ห้ามเขียนลงไฟล์ใน repo หรือขอให้พิมพ์ในแชท ให้ผู้ใช้ตั้งเองใน env var (`SUPABASE_DB_PASSWORD`, หรือ `SUPABASE_ACCESS_TOKEN` สำหรับเลี่ยงการ `supabase login` ซ้ำ ตั้งถาวรบน Windows ด้วย `setx`) CLI อาจจำรหัสผ่านฐานข้อมูลไว้หลัง `supabase link` อยู่แล้ว

## ขั้นตอน release (ลำดับสำคัญ DB ก่อนเว็บเสมอ)
ทุกอย่างที่แตะ production ต้องได้รับอนุมัติจากผู้ใช้ก่อนทุกครั้ง
1. `npm run release:check` ต้องผ่าน และ `npx tsc -b` + `npx vitest run` ผ่าน
2. สำรอง: `supabase db dump --linked -f D:/backup-<วันที่>-schema.sql` และ `supabase db dump --linked --data-only --use-copy -f D:/backup-<วันที่>-data.sql` (เก็บนอก repo)
3. `supabase db push --dry-run` แล้วให้ผู้ใช้ดูรายการ → `echo y | supabase db push`
4. ถ้าแก้ฟังก์ชัน: `supabase functions deploy admin-create-user` และ `admin-update-user`
5. `git push origin main` → รอ Vercel (ดูว่าชื่อไฟล์ `assets/index-*.js` เปลี่ยน) → ตรวจหน้าเว็บ
6. ฟังก์ชันเก่าที่ frontend เดิมเรียกต้องยังใช้ได้หลัง push DB (backward-compatible) เพราะ DB ขึ้นก่อนเว็บ

## ข้อควรระวังของโปรเจคนี้
- ก่อนเพิ่ม migration ที่แก้ `current_role()`/RLS ให้ตรวจว่าแอดมินจริงยัง `status='approved'`
- ทักษะ B01–B24 มาจาก `supabase/reference_seed.sql` (ไม่ใช่ migration) B25–B34 สร้างใน migration
- คำศัพท์ที่มี source_note "รอครูตรวจทาน" เป็นคำที่ Claude เลือกเอง ยังรอครูตรวจ
- หลังแก้ migration ให้ `supabase migration up` แล้ว `npm run db:types` เพื่ออัปเดต `src/types/database.generated.ts`
- seed `seed.sql`/`demo_seed.sql` เป็นของ local เท่านั้น ห้าม push ขึ้น production
- PDF หนังสือ/คู่มืออยู่ใน `books/` และรากโปรเจค (ถูก gitignore) ห้าม commit

## ปัญหาที่เคยเจอ
- Vite dev server บน Windows บางครั้งค้างโค้ดเก่า (หน้าขาว/ReferenceError ทั้งที่ไฟล์ถูก) → หยุด process node/vite แล้ว `npm run dev` ใหม่
- เขียนไฟล์ยาวด้วย heredoc ใน bash อาจพัง ให้ใช้เครื่องมือ Write/Edit แทน
- ทดสอบหน้าจอ: มีสคริปต์ควบคุม Edge headless ผ่าน CDP (ถ้าต้องใช้ให้เขียนใหม่ใน scratchpad ด้วย `node` ที่มี `WebSocket` ในตัว) และ test jsdom ต้องรอ client Supabase เริ่มต้นนานหลายวินาที
- แอปเป็น PWA ผู้ใช้อาจเห็นหน้าเก่า ให้รีเฟรชแบบล้างแคช (Ctrl+Shift+R)
