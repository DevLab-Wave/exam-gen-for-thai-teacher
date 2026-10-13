// ตัวช่วยตัดสินว่าตัวเลือกสั้นพอจะจัด 2 ตัวต่อบรรทัดหรือไม่ (ใช้ร่วมกันทั้ง docx และ preview)
const THAI_RE = /[\u0E00-\u0E7F]/;

/** ประมาณความกว้างข้อความเป็นหน่วย em (อักษรไทย ≈ 1em, อื่นๆ ≈ 0.55em, เว้นวรรค ≈ 0.35em) */
export function estimateEm(text: string): number {
	let em = 0;
	for (const ch of text) {
		if (THAI_RE.test(ch)) em += 1;
		else if (ch === ' ') em += 0.35;
		else em += 0.55;
	}
	return em;
}

/** เพดานความกว้างต่อตัวเลือก (em) — เกินกว่านี้ถือว่ายาว ให้เรียงแนวตั้งแทน */
export const SHORT_CHOICE_EM = 11;

/** ตัวเลือกสั้นมากพอจะจัด 2 ตัวต่อบรรทัดได้ทุกตัวหรือไม่ */
export function isShortChoices(choices: string[], labels: string[]): boolean {
	if (choices.length < 2) return false;
	return choices.every((c, i) => estimateEm(`${labels[i]} ${c}`) <= SHORT_CHOICE_EM);
}
