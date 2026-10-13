import {
	AlignmentType,
	BorderStyle,
	Document,
	Footer,
	ImageRun,
	LeaderType,
	Packer,
	PageNumber,
	Paragraph,
	SectionType,
	Table,
	TableCell,
	TableRow,
	TabStopType,
	TextRun,
	WidthType,
	ShadingType,
	type ISectionOptions
} from 'docx';
import { saveAs } from 'file-saver';
import type { ChoiceStyle, DocSettings, InlineImage, Part, Question, QuestionImage } from '$lib/types';
import { isWritten } from '$lib/types';
import { estimateEm, isShortChoices } from '$lib/layout';
import { parseRichText, plainText } from '$lib/richtext';

/* ---------- Page geometry (DXA, 1440 = 1 inch) ---------- */
const A4 = { width: 11906, height: 16838 };
const MARGIN = 1134; // 2 ซม.
const CONTENT_W = A4.width - MARGIN * 2; // 9638
const COL_GAP = 567; // 1 ซม.
const DXA_PER_PX = 15;
const colWidth = (columns: 1 | 2) => (columns === 2 ? (CONTENT_W - COL_GAP) / 2 : CONTENT_W);
const INLINE_MAX_PX = 220; // เพดานความกว้างรูปที่แทรกในข้อความ

/* ---------- การแบ่งเพจจริง ----------
   docx-preview ไม่ paginate อัตโนมัติ (หน้าเป็น min-height + overflow: hidden)
   ข้อสอบยาวจึงพากันขึ้นหน้าเดียวสูง/ถูกตัด วิธีแก้ = แทรก page break จริงในไฟล์
   แบ่งเนื้อหาเป็นกลุ่มที่พอดีความสูงหนึ่งหน้า โดยประมาณความสูงจากความยาวข้อความ */
const USABLE_H = A4.height - MARGIN * 2; // 14570
const lineDxaFor = (s: DocSettings) => Math.round(s.fontSize * 20 * 1.15 * s.lineSpacing);
// อักษรไทยจริงๆ กว้าง ≈ 0.6 เท่าของขนาด font (TH Sarabun) — ปัดความจุบรรทัดเป็น em
const GLYPH_W = 0.6;
const emPerLineFor = (s: DocSettings) => Math.max(6, colWidth(s.columns) / (s.fontSize * 20 * GLYPH_W));
const linesOf = (text: string, emPerLine: number) => Math.max(1, Math.ceil(estimateEm(text) / emPerLine));
const imageHeightDxa = (img: QuestionImage, maxWpx: number) => {
	const scale = Math.min(1, maxWpx / Math.max(1, img.width));
	return Math.round(img.height * scale * DXA_PER_PX);
};

function estimateHeaderHeight(s: DocSettings, lineDxa: number, emPerLine: number): number {
	let paras = 0;
	if (s.school) paras++;
	if (s.mainHeading) paras++;
	if (s.examTitle) paras++;
	if (s.subject || s.subjectCode || s.classLevel) paras++;
	if (s.durationMin || s.totalScore) paras++;
	let h = paras * (lineDxa + 40);
	if (s.instructions) {
		for (const ln of s.instructions.split('\n')) h += linesOf(ln, emPerLine) * lineDxa + 40;
		h += 120; // ระยะก่อนคำชี้แจง
	}
	if (s.showStudentInfo) h += lineDxa + 180;
	h += lineDxa + 120; // เส้นคั่นท้ายส่วนหัว
	return Math.round(h);
}

function estimateQuestionHeight(
	q: Question,
	no: number,
	s: DocSettings,
	lineDxa: number,
	emPerLine: number
): number {
	const colPx = colWidth(s.columns) / DXA_PER_PX;
	let h = linesOf(`${no}. ${plainText(q.text)}`, emPerLine) * lineDxa + 80;
	if (q.image) h += imageHeightDxa(q.image, Math.min(colPx, s.columns === 2 ? colPx - 30 : 380)) + lineDxa;
	// รูปแทรกในข้อความ
	for (const seg of parseRichText(q.text)) {
		if (seg.type !== 'img') continue;
		const img = q.inlineImages?.find((i) => i.id === seg.value);
		if (img) h += imageHeightDxa(img, INLINE_MAX_PX);
	}
	if (isWritten(q)) {
		h += Math.max(1, q.answerLines ?? 3) * lineDxa;
		return Math.round(h);
	}
	const inline = s.choiceLayout === 'inline' && s.columns === 1 && q.choices.length <= 4;
	if (inline) {
		h += lineDxa;
	} else if (
		s.choiceLayout === 'double' &&
		isShortChoices(q.choices, q.choices.map((_, i) => labelOf(s.choiceStyle, i)))
	) {
		h += Math.ceil(q.choices.length / 2) * lineDxa;
	} else {
		q.choices.forEach((c, i) => {
			h += linesOf(`${labelOf(s.choiceStyle, i)} ${plainText(c)}`, emPerLine) * lineDxa;
		});
	}
	return Math.round(h);
}

function estimatePartHeight(p: Part, s: DocSettings, lineDxa: number, emPerLine: number): number {
	let h = lineDxa * 1.3 + 240; // หัวตอน + ระยะห่าง
	if (p.instructions) {
		for (const ln of p.instructions.split('\n')) h += linesOf(ln, emPerLine) * lineDxa + 40;
	}
	return Math.round(h);
}

export type FlowItem =
	| { kind: 'part'; part: Part }
	| { kind: 'question'; q: Question; no: number };

/** เรียงเนื้อหา: ข้อที่ไม่ผูกตอนก่อน แล้วตามด้วยแต่ละตอน (พร้อมข้อของตอนนั้น) */
export function buildFlow(questions: Question[], parts: Part[]): FlowItem[] {
	const items: FlowItem[] = [];
	let no = 0;
	const ids = new Set(parts.map((p) => p.id));
	for (const q of questions) {
		if (!q.partId || !ids.has(q.partId)) items.push({ kind: 'question', q, no: ++no });
	}
	for (const p of parts) {
		items.push({ kind: 'part', part: p });
		for (const q of questions) {
			if (q.partId === p.id) items.push({ kind: 'question', q, no: ++no });
		}
	}
	return items;
}

function groupIntoPages(items: FlowItem[], s: DocSettings): FlowItem[][] {
	const lineDxa = lineDxaFor(s);
	const emPerLine = emPerLineFor(s);
	// เผื่อบรรทัดกันล้นเกินหน้า (ถ้าเกินจะหลุดไปหน้าถัดไปใน section เดียวกัน)
	const fullBudget = (s.columns === 2 ? USABLE_H * 2 : USABLE_H) - lineDxa;
	// หน้าที่ 1 ต้องเหลือพื้นที่ให้ header ด้วย
	const firstBudget = Math.max(0, fullBudget - estimateHeaderHeight(s, lineDxa, emPerLine));

	const heightOf = (it: FlowItem) =>
		it.kind === 'part'
			? estimatePartHeight(it.part, s, lineDxa, emPerLine)
			: estimateQuestionHeight(it.q, it.no, s, lineDxa, emPerLine);

	const groups: FlowItem[][] = [];
	let cur: FlowItem[] = [];
	let used = 0;
	for (const it of items) {
		const h = heightOf(it);
		const budget = cur.length === 0 && groups.length === 0 ? firstBudget : fullBudget;
		if (cur.length > 0 && used + h > budget) {
			groups.push(cur);
			cur = [];
			used = 0;
		}
		cur.push(it);
		used += h;
	}
	if (cur.length) groups.push(cur);
	return groups;
}

/* ---------- Thai helpers ---------- */
const THAI_RE = /[\u0E00-\u0E7F]/;
const segmenter =
	typeof Intl !== 'undefined' && 'Segmenter' in Intl
		? new Intl.Segmenter('th', { granularity: 'word' })
		: null;

/** แทรก ZWSP ระหว่างคำไทย (เฉพาะเมื่อเปิดใช้งาน) */
function thaiWrap(text: string, enabled: boolean): string {
	if (!enabled || !segmenter || !THAI_RE.test(text)) return text;
	let out = '';
	let prevThai = false;
	for (const s of segmenter.segment(text)) {
		const isThai = THAI_RE.test(s.segment);
		if (prevThai && isThai) out += '\u200B';
		out += s.segment;
		prevThai = isThai;
	}
	return out;
}

const CHOICE_LABELS: Record<ChoiceStyle, string[]> = {
	thai: ['ก', 'ข', 'ค', 'ง', 'จ'],
	latin: ['A', 'B', 'C', 'D', 'E'],
	number: ['1', '2', '3', '4', '5']
};
const labelOf = (style: ChoiceStyle, i: number) =>
	style === 'number' ? `${CHOICE_LABELS.number[i]})` : `${CHOICE_LABELS[style][i]}.`;

/* ---------- Run factory: ตั้งฟอนต์ครบ ascii / hAnsi / eastAsia / cs ---------- */
type RunOpts = { bold?: boolean; size?: number; superScript?: boolean; subScript?: boolean };

function makeRunFactory(s: DocSettings) {
	const font = { ascii: s.fontName, hAnsi: s.fontName, eastAsia: s.fontName, cs: s.fontName };

	/** run ข้อความล้วน (ไม่ตีความ markup) */
	const text = (t: string, o: RunOpts = {}) => {
		const size = (o.size ?? s.fontSize) * 2; // half-points
		return new TextRun({
			text: thaiWrap(t, s.insertZwsp),
			font,
			size,
			sizeComplexScript: size, // สำคัญ: ตัวอักษรไทยใช้ complex-script size
			bold: o.bold,
			boldComplexScript: o.bold,
			superScript: o.superScript,
			subScript: o.subScript,
			language: { value: 'en-US', eastAsia: 'th-TH', bidirectional: 'th-TH' }
		});
	};

	const image = (img: QuestionImage & Partial<InlineImage>, maxWpx: number) => {
		const { data, type } = dataUrlToBytes(img.dataUrl);
		const scale = Math.min(1, maxWpx / Math.max(1, img.width));
		return new ImageRun({
			type,
			data,
			transformation: {
				width: Math.round(img.width * scale),
				height: Math.round(img.height * scale)
			}
		});
	};

	/** run แบบ rich: ตีความ ^{} _{} {img:id} และสัญลักษณ์ */
	const rich = (t: string, o: RunOpts = {}, images?: Map<string, InlineImage>): (TextRun | ImageRun)[] => {
		const out: (TextRun | ImageRun)[] = [];
		for (const seg of parseRichText(t)) {
			if (seg.type === 'text') out.push(text(seg.value, o));
			else if (seg.type === 'sup') out.push(text(seg.value, { ...o, superScript: true }));
			else if (seg.type === 'sub') out.push(text(seg.value, { ...o, subScript: true }));
			else {
				const img = images?.get(seg.value);
				if (img) out.push(image(img, INLINE_MAX_PX));
			}
		}
		return out;
	};

	return { text, rich, image };
}
type RunFactory = ReturnType<typeof makeRunFactory>;

/* ---------- Image helper ---------- */
function dataUrlToBytes(dataUrl: string): { data: Uint8Array; type: 'png' | 'jpg' | 'gif' } {
	const [meta, b64] = dataUrl.split(',');
	const mime = /data:image\/(\w+)/.exec(meta)?.[1] ?? 'png';
	const bin = atob(b64);
	const data = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
	const type = mime === 'jpeg' || mime === 'jpg' ? 'jpg' : mime === 'gif' ? 'gif' : 'png';
	return { data, type };
}

/* ---------- Builders ---------- */
function buildHeader(s: DocSettings, rf: RunFactory): Paragraph[] {
	const center = (t: string, size: number, bold = true) =>
		new Paragraph({
			alignment: AlignmentType.CENTER,
			spacing: { after: 40 },
			children: rf.rich(t, { bold, size })
		});

	const out: Paragraph[] = [];
	if (s.school) out.push(center(s.school, s.fontSize + 6));
	if (s.mainHeading) out.push(center(s.mainHeading, s.fontSize + 8));
	if (s.examTitle) out.push(center(s.examTitle, s.fontSize + 2));

	const sub = [
		s.subject && `วิชา${s.subject}`,
		s.subjectCode && `รหัสวิชา ${s.subjectCode}`,
		s.classLevel && `ชั้น${s.classLevel}`
	].filter(Boolean) as string[];
	if (sub.length) out.push(center(sub.join('   '), s.fontSize, false));

	const meta = [
		s.durationMin ? `เวลา ${s.durationMin} นาที` : '',
		s.totalScore ? `คะแนนเต็ม ${s.totalScore} คะแนน` : ''
	].filter(Boolean);
	if (meta.length) out.push(center(meta.join('   '), s.fontSize, false));

	// คำชี้แจงรายวิชา (จัดชิดซ้าย รองรับหลายบรรทัด)
	if (s.instructions) {
		s.instructions.split('\n').forEach((line, i, arr) =>
			out.push(
				new Paragraph({
					spacing: { before: i === 0 ? 100 : 0, after: i === arr.length - 1 ? 80 : 0 },
					indent: { left: 420, right: 420 },
					children: rf.rich(line)
				})
			)
		);
	}

	if (s.showStudentInfo) {
		out.push(
			new Paragraph({
				spacing: { before: 120, after: 60 },
				tabStops: [
					{ type: TabStopType.RIGHT, position: 5600, leader: LeaderType.DOT },
					{ type: TabStopType.RIGHT, position: 7600, leader: LeaderType.DOT },
					{ type: TabStopType.RIGHT, position: CONTENT_W, leader: LeaderType.DOT }
				],
				children: [rf.text('ชื่อ-สกุล'), rf.text('\t'), rf.text(' เลขที่'), rf.text('\t'), rf.text(' ชั้น'), rf.text('\t')]
			})
		);
	}

	// เส้นคั่นท้ายส่วนหัว
	out.push(
		new Paragraph({
			spacing: { after: 120 },
			border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000', space: 2 } },
			children: []
		})
	);
	return out;
}

function buildPart(p: Part, s: DocSettings, rf: RunFactory, breakBefore: boolean): Paragraph[] {
	const spacing = { line: Math.round(s.lineSpacing * 240) };
	const out: Paragraph[] = [
		new Paragraph({
			pageBreakBefore: breakBefore,
			spacing: { ...spacing, before: 200, after: 80 },
			keepNext: true,
			children: rf.rich(p.title || 'ตอน', { bold: true, size: s.fontSize + 2 })
		})
	];
	if (p.instructions) {
		p.instructions.split('\n').forEach((line, i, arr) =>
			out.push(
				new Paragraph({
					spacing: { ...spacing, after: i === arr.length - 1 ? 120 : 0 },
					indent: { left: 280, right: 280 },
					keepNext: i < arr.length - 1,
					children: rf.rich(line)
				})
			)
		);
	}
	return out;
}

function buildQuestion(
	q: Question,
	no: number,
	s: DocSettings,
	rf: RunFactory,
	breakBefore = false
): Paragraph[] {
	const spacing = { line: Math.round(s.lineSpacing * 240) };
	const out: Paragraph[] = [];
	const imgs = new Map((q.inlineImages ?? []).map((i) => [i.id, i]));

	out.push(
		new Paragraph({
			pageBreakBefore: breakBefore, // docx-preview แบ่งหน้าจาก pageBreakBefore เท่านั้น
			spacing: { ...spacing, before: 80 },
			indent: { left: 420, hanging: 420 },
			keepNext: true,
			keepLines: true,
			children: [rf.text(`${no}.`), rf.text('\t'), ...rf.rich(q.text, {}, imgs)]
		})
	);

	if (q.image) {
		const colPx = colWidth(s.columns) / DXA_PER_PX;
		out.push(
			new Paragraph({
				alignment: AlignmentType.CENTER,
				keepNext: true,
				spacing,
				children: [rf.image(q.image, Math.min(colPx, s.columns === 2 ? colPx - 30 : 380))]
			})
		);
	}

	// ข้อเขียน: เว้นบรรทัดให้เขียนตอบ
	if (isWritten(q)) {
		const lines = Math.max(1, q.answerLines ?? 3);
		for (let i = 0; i < lines; i++) {
			out.push(
				new Paragraph({
					spacing,
					indent: { left: 420, right: 420 },
					border: { bottom: { style: BorderStyle.DOTTED, size: 4, color: '808080', space: 1 } },
					children: [rf.text(' ')]
				})
			);
		}
		return out;
	}

	const inline = s.choiceLayout === 'inline' && s.columns === 1 && q.choices.length <= 4;
	const choiceRuns = (i: number) => [...rf.rich(q.choices[i] ?? '', {}, imgs)];

	if (inline) {
		const step = Math.floor((CONTENT_W - 420) / q.choices.length);
		out.push(
			new Paragraph({
				spacing,
				indent: { left: 420 },
				tabStops: q.choices.map((_, i) => ({ type: TabStopType.LEFT, position: 420 + step * i })),
				children: q.choices.flatMap((_, i) => [
					rf.text(labelOf(s.choiceStyle, i)),
					rf.text(' '),
					...choiceRuns(i),
					...(i < q.choices.length - 1 ? [rf.text('\t')] : [])
				])
			})
		);
	} else if (
		s.choiceLayout === 'double' &&
		isShortChoices(q.choices, q.choices.map((_, i) => labelOf(s.choiceStyle, i)))
	) {
		// 2 ตัวต่อบรรทัด (เฉพาะตัวเลือกที่สั้น): คอลัมน์ที่ 2 เริ่มที่กึ่งกลางด้วย tab stop
		const left = 420;
		const half = Math.floor((colWidth(s.columns) - left) / 2);
		for (let i = 0; i < q.choices.length; i += 2) {
			const children: (TextRun | ImageRun)[] = [
				rf.text(labelOf(s.choiceStyle, i)),
				rf.text(' '),
				...choiceRuns(i)
			];
			if (q.choices[i + 1] !== undefined) {
				children.push(rf.text('\t'), rf.text(labelOf(s.choiceStyle, i + 1)), rf.text(' '), ...choiceRuns(i + 1));
			}
			out.push(
				new Paragraph({
					spacing,
					indent: { left },
					tabStops: [{ type: TabStopType.LEFT, position: left + half }],
					keepNext: i + 2 < q.choices.length,
					keepLines: true,
					children
				})
			);
		}
	} else {
		q.choices.forEach((_, i) => {
			out.push(
				new Paragraph({
					spacing,
					indent: { left: 840, hanging: 420 },
					keepNext: i < q.choices.length - 1,
					keepLines: true,
					children: [rf.text(labelOf(s.choiceStyle, i)), rf.text('\t'), ...choiceRuns(i)]
				})
			);
		});
	}
	return out;
}

function buildAnswerKey(questions: Question[], s: DocSettings, rf: RunFactory): (Paragraph | Table)[] {
	const PAIRS = 5;
	const CELL_W = 960; // 10 คอลัมน์ x 960 = 9600
	const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
	const borders = { top: border, bottom: border, left: border, right: border };

	const cell = (text: string, head = false) =>
		new TableCell({
			borders,
			width: { size: CELL_W, type: WidthType.DXA },
			shading: head ? { type: ShadingType.CLEAR, fill: 'E5E7EB', color: 'auto' } : undefined,
			margins: { top: 40, bottom: 40, left: 80, right: 80 },
			children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [rf.text(text, { bold: head })] })]
		});

	const ansText = (q: Question) =>
		isWritten(q) ? '-' : q.answerIndex == null ? '-' : labelOf(s.choiceStyle, q.answerIndex).replace(/[.)]$/, '');

	const rows: TableRow[] = [
		new TableRow({
			tableHeader: true,
			children: Array.from({ length: PAIRS }).flatMap(() => [cell('ข้อ', true), cell('เฉลย', true)])
		})
	];
	for (let i = 0; i < questions.length; i += PAIRS) {
		rows.push(
			new TableRow({
				cantSplit: true,
				children: Array.from({ length: PAIRS }).flatMap((_, k) => {
					const q = questions[i + k];
					return q ? [cell(String(i + k + 1)), cell(ansText(q))] : [cell(''), cell('')];
				})
			})
		);
	}

	return [
		new Paragraph({
			pageBreakBefore: true, // docx-preview เริ่มหน้าใหม่จาก pageBreakBefore เท่านั้น
			alignment: AlignmentType.CENTER,
			spacing: { after: 160 },
			children: [rf.text('เฉลยข้อสอบ', { bold: true, size: s.fontSize + 4 })]
		}),
		new Table({
			width: { size: CELL_W * PAIRS * 2, type: WidthType.DXA },
			columnWidths: Array(PAIRS * 2).fill(CELL_W),
			rows
		})
	];
}

/* ---------- Public API ---------- */
export async function buildExamDocx(questions: Question[], s: DocSettings, parts: Part[] = []): Promise<Blob> {
	const rf = makeRunFactory(s);

	const page = {
		size: { width: A4.width, height: A4.height },
		margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN }
	};
	const footer = () =>
		new Footer({
			children: [
				new Paragraph({
					alignment: AlignmentType.CENTER,
					children: [
						new TextRun({
							children: ['หน้า ', PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES],
							font: { ascii: s.fontName, hAnsi: s.fontName, eastAsia: s.fontName, cs: s.fontName },
							size: (s.fontSize - 2) * 2,
							sizeComplexScript: (s.fontSize - 2) * 2
						})
					]
				})
			]
		});

	const flow = buildFlow(questions, parts);
	const sections: ISectionOptions[] = [
		// ส่วนหัว: 1 คอลัมน์เสมอ
		{ properties: { page }, footers: { default: footer() }, children: buildHeader(s, rf) },
		// เนื้อข้อสอบ: แบ่งเป็นเพจจริง (sections) กลุ่มละพอดีหนึ่งหน้า
		// กลุ่มแรก CONTINUOUS ต่อจาก header ขึ้นหน้าเดียวกัน กลุ่มถัดไปเริ่มหน้าใหม่
		...groupIntoPages(flow, s).map((group, gi) => ({
			properties: {
				type: gi === 0 ? SectionType.CONTINUOUS : SectionType.NEXT_PAGE,
				page,
				column: s.columns === 2 ? { count: 2, space: COL_GAP, separate: true } : undefined
			},
			footers: { default: footer() },
			children: group.flatMap((item, i) => {
				const brk = gi > 0 && i === 0;
				return item.kind === 'part' ? buildPart(item.part, s, rf, brk) : buildQuestion(item.q, item.no, s, rf, brk);
			})
		}))
	];

	if (s.answerKey === 'end') {
		sections.push({
			properties: { type: SectionType.NEXT_PAGE, page },
			footers: { default: footer() },
			children: buildAnswerKey(questions, s, rf)
		});
	}

	const sz = s.fontSize * 2;
	const doc = new Document({
		creator: 'ExamDoc Generator',
		title: s.mainHeading || s.examTitle || 'ข้อสอบ',
		styles: {
			default: {
				document: {
					run: {
						font: { ascii: s.fontName, hAnsi: s.fontName, eastAsia: s.fontName, cs: s.fontName },
						size: sz,
						sizeComplexScript: sz
					},
					paragraph: { spacing: { line: Math.round(s.lineSpacing * 240) } }
				}
			}
		},
		sections
	});

	return Packer.toBlob(doc);
}

export async function downloadExamDocx(questions: Question[], s: DocSettings, parts: Part[] = []) {
	const blob = await buildExamDocx(questions, s, parts);
	const date = new Date().toISOString().slice(0, 10);
	saveAs(blob, `${s.subjectCode || 'exam'}-${date}.docx`);
}
