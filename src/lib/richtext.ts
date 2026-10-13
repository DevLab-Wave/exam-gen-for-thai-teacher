// ตัวช่วยข้อความแบบrich text สำหรับโจทย์/ตัวเลือก
// รองรับ: ยกกำลัง x^{2}, ห้อย H_{2}O และรูปแทรกกลางข้อความ {img:<id>}
// ใช้ escape ด้วย backslash เช่น \^ \_ \{ \}

export type RichSegment =
	| { type: 'text'; value: string }
	| { type: 'sup'; value: string }
	| { type: 'sub'; value: string }
	| { type: 'img'; value: string }; // value = id ของ InlineImage

const ESCAPABLE = new Set(['^', '_', '{', '}', '\\']);

/** อ่านเนื้อหาในวงเล็บปีกกา เริ่มที่ index ของ '{' คืนค่า content และ index ถัดไป */
function readBrace(text: string, openIndex: number): { content: string; next: number } {
	let depth = 0;
	let out = '';
	for (let i = openIndex; i < text.length; i++) {
		const ch = text[i];
		if (ch === '\\' && i + 1 < text.length) {
			out += text[i + 1];
			i++;
			continue;
		}
		if (ch === '{') {
			depth++;
			if (depth === 1) continue; // ไม่รวมปีกกาก่อนแรก
		} else if (ch === '}') {
			depth--;
			if (depth === 0) return { content: out, next: i + 1 };
		}
		out += ch;
	}
	// ไม่เจอวงเล็บปิด — คืนที่เหลือทั้งหมด
	return { content: out, next: text.length };
}

/** แยกข้อความเป็น segment ตาม markup */
export function parseRichText(text: string): RichSegment[] {
	const out: RichSegment[] = [];
	let buf = '';
	const flush = () => {
		if (buf) {
			out.push({ type: 'text', value: buf });
			buf = '';
		}
	};

	for (let i = 0; i < text.length; i++) {
		const ch = text[i];

		if (ch === '\\' && i + 1 < text.length && ESCAPABLE.has(text[i + 1])) {
			buf += text[i + 1];
			i++;
			continue;
		}

		// รูปแทรก {img:<id>}
		if (ch === '{' && text.startsWith('{img:', i)) {
			const { content, next } = readBrace(text, i);
			const id = content.slice(4); // ตัด "img:"
			if (id) {
				flush();
				out.push({ type: 'img', value: id });
				i = next - 1;
				continue;
			}
		}

		if (ch === '^' || ch === '_') {
			const type = ch === '^' ? 'sup' : 'sub';
			if (text[i + 1] === '{') {
				const { content, next } = readBrace(text, i + 1);
				flush();
				out.push({ type, value: content });
				i = next - 1;
			} else if (i + 1 < text.length) {
				flush();
				out.push({ type, value: text[i + 1] });
				i++;
			} else {
				buf += ch;
			}
			continue;
		}

		buf += ch;
	}
	flush();
	return out;
}

/** ข้อความล้วน (ตัด markup/rูป ออก) — ใช้ประมาณความยาว/แสดงตัวอย่าง */
export function plainText(text: string): string {
	return parseRichText(text)
		.map((s) => (s.type === 'img' ? ' ' : s.value))
		.join('');
}

/** จำนวนรูปที่อ้างถึงในข้อความ */
export function countInlineImages(text: string): number {
	return parseRichText(text).filter((s) => s.type === 'img').length;
}

/** สัญลักษณ์คณิต/วิทยาศาสตร์常用 สำหรับปุ่มแทรก */
export const SYMBOLS: string[] = [
	'√', '∛', 'π', '∞', '±', '×', '÷', '≠', '≈', '≤', '≥', '∝',
	'∑', '∏', '∫', '∂', '∆', 'θ', 'α', 'β', 'γ', 'λ', 'μ', 'Ω',
	'°', '′', '″', '%', '∠', '⊥', '∥', '△', '□', '○', '∈', '∉',
	'∪', '∩', '⊂', '⊃', '→', '←', '↔', '⇒', '⇔', '∴', '∵'
];
