export interface QuestionImage {
	dataUrl: string; // data:image/png;base64,...
	width: number; // natural px
	height: number;
}

/** รูปที่แทรกกลางข้อความ มี id ไว้ให้ token {img:<id>} อ้างถึง */
export interface InlineImage extends QuestionImage {
	id: string;
}

export type QuestionKind = 'choice' | 'written'; // choice = ปรนัย (มีตัวเลือก), written = ข้อเขียน (ไม่มีตัวเลือก)

export interface Question {
	id: string;
	text: string; // รองรับ markup ยกกำลัง/ห้อย (x^{2}, H_{2}O) และรูปแทรก {img:<id>}
	kind?: QuestionKind; // ไม่ระบุ = 'choice' (เข้ากับข้อมูลเดิม)
	choices: string[]; // ใช้เมื่อ kind = 'choice'
	answerIndex: number | null; // 0-based, null = ยังไม่ระบุเฉลย
	image?: QuestionImage; // รูปหลักใต้โจทย์
	inlineImages?: InlineImage[]; // รูปที่แทรกในข้อความ (อ้างด้วย {img:<id>})
	answerLines?: number; // ข้อเขียน: จำนวนบรรทัดว่างให้เขียนตอบ
	partId?: string; // ผูกกับตอน (Part)
	explanation?: string;
}

/** ตอน/ส่วนของข้อสอบ เช่น "ตอนที่ 1 ปรนัย" พร้อมคำชี้แจงของตอน */
export interface Part {
	id: string;
	title: string;
	instructions?: string;
	columns?: 1 | 2; // จำนวนคอลัมน์ของตอนนี้ (ไม่ระบุ = ใช้ค่าตั้งต้นของเอกสาร)
}

export type ChoiceStyle = 'thai' | 'latin' | 'number'; // ก. ข. ค. ง. | A. B. C. D. | 1) 2) 3) 4)
export type ChoiceLayout = 'vertical' | 'inline' | 'double'; // inline ใช้ได้เฉพาะ 1 คอลัมน์, double = 2 ตัวต่อบรรทัด
export type AnswerKeyMode = 'none' | 'end';

export interface DocSettings {
	school: string;
	mainHeading: string; // หัวข้อหลักของข้อสอบ (ตัวใหญ่สุด)
	examTitle: string; // เช่น "ข้อสอบปลายภาคเรียนที่ 1 ปีการศึกษา 2569"
	instructions: string; // คำชี้แจงรายวิชา
	subject: string;
	subjectCode: string;
	classLevel: string;
	durationMin: number | null;
	totalScore: number | null;
	columns: 1 | 2;
	fontName: string; // 'TH Sarabun New' | 'TH SarabunPSK'
	fontSize: number; // pt (ราชการ = 16)
	lineSpacing: number; // 1.0 = 240, 1.15 = 276
	choiceStyle: ChoiceStyle;
	choiceLayout: ChoiceLayout;
	answerKey: AnswerKeyMode;
	showStudentInfo: boolean;
	insertZwsp: boolean; // แทรก Zero-Width Space ระหว่างคำ (ใช้เมื่อ Word/LibreOffice ตัดคำเพี้ยน)
}

export const defaultSettings: DocSettings = {
	school: '',
	mainHeading: '',
	examTitle: '',
	instructions: '',
	subject: '',
	subjectCode: '',
	classLevel: '',
	durationMin: null,
	totalScore: null,
	columns: 2,
	fontName: 'TH Sarabun New',
	fontSize: 12,
	lineSpacing: 1.3,
	choiceStyle: 'thai',
	choiceLayout: 'vertical',
	answerKey: 'end',
	showStudentInfo: true,
	insertZwsp: false
};

/** ชนิดคำถาม (ค่า default เมื่อไม่ได้ระบุ) */
export const kindOf = (q: Question): QuestionKind => q.kind ?? 'choice';
export const isWritten = (q: Question): boolean => kindOf(q) === 'written';

/** ผลลัพธ์การนำเข้าไฟล์ (ข้อสอบ + ตอนที่สร้างจากคอลัมน์) */
export interface ImportResult {
	questions: Question[];
	parts: Part[];
}
