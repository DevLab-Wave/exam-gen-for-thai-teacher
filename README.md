# ExamDoc Generator

ระบบสร้างข้อสอบภาษาไทยเป็นไฟล์ Word (.docx) ตามมาตรฐานราชการ — SvelteKit (Svelte 5) + Tailwind + docx.js

## เริ่มใช้งาน
```bash
bun install
bun run dev      # เปิด http://localhost:5173
bun run build    # build เป็น static site ไว้ที่ build/
```
(ใช้ `npm install` / `npm run dev` แทนได้)

## โครงสร้าง
- `src/lib/types.ts` — type และค่าเริ่มต้นการตั้งค่าเอกสาร
- `src/lib/state.svelte.ts` — สถานะส่วนกลาง + บันทึกลง localStorage
- `src/lib/importers.ts` — นำเข้า CSV/XLSX และอ่านรูปภาพ
- `src/lib/docx/generateExamDocx.ts` — ตัวสร้างไฟล์ .docx (ฟอนต์ไทย, 2 คอลัมน์, เฉลย)
- `src/lib/components/` — DropZone, QuestionTable, QuestionEditor, SettingsPanel, DocPreview
- `src/routes/` — หน้าหลัก, /create, /data, /templates, /history, /settings

## หมายเหตุ
- เครื่องที่เปิดไฟล์ .docx ต้องติดตั้งฟอนต์ TH Sarabun New (ถ้าไม่มี Word จะใช้ฟอนต์ทดแทน)
- รูปแบบไฟล์นำเข้า: ดูตัวอย่างที่ `static/template.csv`
