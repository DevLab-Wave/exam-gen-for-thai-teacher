import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import type { ImportResult, Part, Question, QuestionImage } from '$lib/types';

/**
 * รูปแบบคอลัมน์ที่รองรับ (หัวตารางไม่สนตัวพิมพ์/เว้นวรรค):
 *  โจทย์ : question | โจทย์ | คำถาม | ข้อสอบ
 *  ตัวเลือก : ก ข ค ง จ | a b c d e | choice1..5 | ตัวเลือก1..5
 *  เฉลย : answer | เฉลย | ans  (ค่าเป็น ก-จ, A-E, หรือ 1-5)
 *  อธิบาย : explanation | อธิบาย
 *  ตอน : ตอน | part | ส่วน   (ข้อที่มีตอนชื่อเดียวกันจะถูกรวมเป็นตอนเดียวกัน)
 *  ประเภท : ประเภท | kind | ชนิด  (ข้อเขียน/อัตนัย/written = ข้อเขียน ไม่มีตัวเลือก)
 */
const KEYS = {
	question: ['question', 'โจทย์', 'คำถาม', 'ข้อสอบ'],
	answer: ['answer', 'เฉลย', 'ans'],
	explanation: ['explanation', 'อธิบาย', 'คำอธิบาย'],
	part: ['ตอน', 'part', 'ส่วน', 'ตอนที่'],
	kind: ['ประเภท', 'kind', 'ชนิด', 'แบบ']
};
const CHOICE_KEYS: string[][] = [
	['ก', 'a', 'choice1', 'ตัวเลือก1', 'ตัวเลือกก'],
	['ข', 'b', 'choice2', 'ตัวเลือก2', 'ตัวเลือกข'],
	['ค', 'c', 'choice3', 'ตัวเลือก3', 'ตัวเลือกค'],
	['ง', 'd', 'choice4', 'ตัวเลือก4', 'ตัวเลือกง'],
	['จ', 'e', 'choice5', 'ตัวเลือก5', 'ตัวเลือกจ']
];

const norm = (s: unknown) => String(s ?? '').replace(/^\ufeff/, '').trim().toLowerCase().replace(/[\s_.\-]/g, '');
const uid = () => crypto.randomUUID();

function pick(row: Record<string, string>, keys: string[]): string {
	for (const k of Object.keys(row)) if (keys.includes(norm(k))) return String(row[k] ?? '').trim();
	return '';
}

function parseAnswer(raw: string, choiceCount: number): number | null {
	const v = raw.trim().toLowerCase().replace(/[.)]/g, '');
	if (!v) return null;
	const thai = ['ก', 'ข', 'ค', 'ง', 'จ'].indexOf(v);
	if (thai >= 0) return thai < choiceCount ? thai : null;
	if (/^[a-e]$/.test(v)) return v.charCodeAt(0) - 97 < choiceCount ? v.charCodeAt(0) - 97 : null;
	const n = parseInt(v, 10);
	return n >= 1 && n <= choiceCount ? n - 1 : null;
}

function isWrittenKind(raw: string): boolean {
	const v = norm(raw);
	return ['written', 'ข้อเขียน', 'อัตนัย', 'เขียน', 'อธิบาย', 'เติมคำ'].includes(v);
}

function rowsToQuestions(rows: Record<string, string>[]): ImportResult {
	const questions: Question[] = [];
	const parts: Part[] = [];
	const partByTitle = new Map<string, Part>();

	for (const row of rows) {
		const text = pick(row, KEYS.question);
		if (!text) continue;
		const written = isWrittenKind(pick(row, KEYS.kind));
		const choices = written ? [] : CHOICE_KEYS.map((k) => pick(row, k)).filter(Boolean);

		let partId: string | undefined;
		const partTitle = pick(row, KEYS.part);
		if (partTitle) {
			const key = norm(partTitle);
			let p = partByTitle.get(key);
			if (!p) {
				p = { id: uid(), title: partTitle, instructions: '' };
				partByTitle.set(key, p);
				parts.push(p);
			}
			partId = p.id;
		}

		questions.push({
			id: uid(),
			text,
			kind: written ? 'written' : 'choice',
			choices,
			answerIndex: written ? null : parseAnswer(pick(row, KEYS.answer), choices.length),
			answerLines: written ? 3 : undefined,
			partId,
			explanation: pick(row, KEYS.explanation) || undefined
		});
	}
	return { questions, parts };
}

/* ---------- CSV ---------- */
export function parseCsv(file: File): Promise<ImportResult> {
	return new Promise((resolve, reject) => {
		Papa.parse<Record<string, string>>(file, {
			header: true,
			skipEmptyLines: true,
			encoding: 'UTF-8',
			complete: (r) => resolve(rowsToQuestions(r.data)),
			error: reject
		});
	});
}

/* ---------- Excel ---------- */
function cellText(v: ExcelJS.CellValue): string {
	if (v == null) return '';
	if (typeof v === 'object') {
		if ('richText' in v) return v.richText.map((t) => t.text).join('');
		if ('result' in v) return String(v.result ?? '');
		if ('text' in v) return String(v.text ?? '');
		return '';
	}
	return String(v);
}

export async function parseExcel(file: File): Promise<ImportResult> {
	const wb = new ExcelJS.Workbook();
	await wb.xlsx.load(await file.arrayBuffer());
	const ws = wb.worksheets[0];
	if (!ws) return { questions: [], parts: [] };

	const headers: string[] = [];
	ws.getRow(1).eachCell({ includeEmpty: false }, (c, col) => (headers[col] = cellText(c.value)));

	const rows: Record<string, string>[] = [];
	ws.eachRow((row, i) => {
		if (i === 1) return;
		const rec: Record<string, string> = {};
		headers.forEach((h, col) => {
			if (h) rec[h] = cellText(row.getCell(col).value);
		});
		rows.push(rec);
	});
	return rowsToQuestions(rows);
}

/** เลือก parser ตามนามสกุลไฟล์ (ใช้กับ Drag & Drop) */
export async function importQuestions(file: File): Promise<ImportResult> {
	const ext = file.name.split('.').pop()?.toLowerCase();
	if (ext === 'csv') return parseCsv(file);
	if (ext === 'xlsx') return parseExcel(file);
	throw new Error('รองรับเฉพาะไฟล์ .csv และ .xlsx');
}

/* ---------- Image ---------- */
export function readImageFile(file: File): Promise<QuestionImage> {
	return new Promise((resolve, reject) => {
		const fr = new FileReader();
		fr.onerror = () => reject(fr.error);
		fr.onload = () => {
			const dataUrl = fr.result as string;
			const img = new Image();
			img.onerror = reject;
			img.onload = () =>
				resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
			img.src = dataUrl;
		};
		fr.readAsDataURL(file);
	});
}
