// สถานะส่วนกลางของแอป (Svelte 5 runes) — ใช้ร่วมกันทุกหน้า
// แก้ค่าด้วยการกำหนดที่ property เช่น app.settings.columns = 2 (ห้าม reassign ตัว app)
import { defaultSettings, type DocSettings, type ImportResult, type Part, type Question } from '$lib/types';

const STORAGE_KEY = 'examdoc:v1';

export const app = $state({
	questions: [] as Question[],
	parts: [] as Part[],
	settings: { ...defaultSettings } as DocSettings,
	dark: false
});

/** โหลดข้อมูลที่บันทึกไว้จาก localStorage (เรียกครั้งเดียวตอน mount) */
export function loadState() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return;
		const data = JSON.parse(raw);
		app.questions = data.questions ?? [];
		app.parts = data.parts ?? [];
		app.settings = { ...defaultSettings, ...(data.settings ?? {}) };
		app.dark = !!data.dark;
	} catch {
		/* ข้อมูลเสียให้ข้ามไป */
	}
}

/** บันทึกอัตโนมัติ — ถ้ารูปภาพทำให้เกินโควต้า ให้บันทึกโดยตัดรูปออก */
export function saveState() {
	const payload = { questions: app.questions, parts: app.parts, settings: app.settings, dark: app.dark };
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
	} catch {
		try {
			const slim = {
				...payload,
				questions: app.questions.map((q) => ({ ...q, image: undefined, inlineImages: undefined }))
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
		} catch {
			/* เก็บไม่ได้จริงๆ ก็ปล่อยผ่าน */
		}
	}
}

/** สร้างข้อสอบเปล่า 4 ตัวเลือก */
export function newQuestion(): Question {
	return { id: crypto.randomUUID(), text: '', kind: 'choice', choices: ['', '', '', ''], answerIndex: null };
}

/** สร้างข้อเขียนเปล่า (ไม่มีตัวเลือก) */
export function newWrittenQuestion(): Question {
	return { id: crypto.randomUUID(), text: '', kind: 'written', choices: [], answerIndex: null, answerLines: 3 };
}

/** สร้างตอนเปล่า */
export function newPart(): Part {
	return { id: crypto.randomUUID(), title: '', instructions: '' };
}

/** รวมผลนำเข้า: ใช้ตอนเดิมถ้าชื่อซ้ำ แล้วต่อท้ายรายการข้อสอบ */
export function mergeImport(result: ImportResult) {
	const keyOf = (t: string) => t.trim().toLowerCase();
	const remap = new Map<string, string>();
	for (const p of result.parts) {
		const existing = app.parts.find((x) => keyOf(x.title) === keyOf(p.title));
		if (existing) remap.set(p.id, existing.id);
		else {
			app.parts.push(p);
			remap.set(p.id, p.id);
		}
	}
	for (const q of result.questions) {
		if (q.partId) q.partId = remap.get(q.partId) ?? undefined;
		app.questions.push(q);
	}
}

/** ข้อสอบตัวอย่างไว้ทดลองใช้งาน */
export function sampleQuestions(): Question[] {
	const mk = (text: string, choices: string[], answerIndex: number): Question => ({
		id: crypto.randomUUID(),
		text,
		choices,
		answerIndex
	});
	return [
		mk('เมืองหลวงของประเทศไทยคือข้อใด', ['เชียงใหม่', 'กรุงเทพมหานคร', 'ภูเก็ต', 'ขอนแก่น'], 1),
		mk('น้ำประกอบด้วยธาตุใดบ้าง', ['ไฮโดรเจนและออกซิเจน', 'คาร์บอนและออกซิเจน', 'ไนโตรเจนและไฮโดรเจน', 'เหล็กและออกซิเจน'], 0),
		mk('2 + 3 × 4 มีค่าเท่ากับเท่าใด', ['20', '14', '24', '9'], 1),
		mk('ข้อใดเป็นคำนามในประโยค "นักเรียนอ่านหนังสือ"', ['อ่าน', 'นักเรียน', 'ใน', 'และ'], 1)
	];
}
