<script lang="ts">
	// หน้าต่างเพิ่ม/แก้ไขข้อสอบ (โจทย์, ตัวเลือก, เฉลย, รูปภาพ, คำอธิบาย, ตอน)
	// รองรับ rich text: ยกกำลัง x^{2}, ห้อย H_{2}O, รูปแทรก {img:id}, สัญลักษณ์
	import { X, Plus, Trash2, Superscript, Subscript, ImagePlus } from 'lucide-svelte';
	import { readImageFile } from '$lib/importers';
	import { app } from '$lib/state.svelte';
	import { SYMBOLS } from '$lib/richtext';
	import type { Question, QuestionKind } from '$lib/types';

	let { question, onsave, oncancel }: { question: Question; onsave: (q: Question) => void; oncancel: () => void } = $props();

	// คัดลอกมาแก้ไข เพื่อให้กด "ยกเลิก" แล้วข้อมูลเดิมไม่เปลี่ยน
	// svelte-ignore state_referenced_locally
	let q = $state<Question>(structuredClone($state.snapshot(question)));
	const labels = ['ก', 'ข', 'ค', 'ง', 'จ'];
	const parts = $derived(app.parts);

	let lastField = $state<HTMLTextAreaElement | HTMLInputElement | null>(null);
	const kind = $derived<QuestionKind>(q.kind ?? 'choice');

	function track(e: FocusEvent) {
		lastField = e.currentTarget as HTMLTextAreaElement | HTMLInputElement;
	}

	/** แทนที่ selection ของช่องที่โฟกัสล่าสุดด้วยข้อความ แล้วคืน selection ใหม่ */
	function replaceSelection(prefix: string, suffix = '', placeholder = 'x') {
		const el = lastField;
		if (!el) return;
		const start = el.selectionStart ?? el.value.length;
		const end = el.selectionEnd ?? start;
		const sel = el.value.slice(start, end) || placeholder;
		const ins = prefix + sel + suffix;
		el.value = el.value.slice(0, start) + ins + el.value.slice(end);
		el.dispatchEvent(new Event('input', { bubbles: true }));
		const s2 = start + prefix.length;
		requestAnimationFrame(() => {
			el.focus();
			el.setSelectionRange(s2, s2 + sel.length);
		});
	}

	function insertAtCursor(token: string) {
		replaceSelection(token, '', '');
	}

	async function pickInlineImage(e: Event) {
		const f = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!f) return;
		const img = await readImageFile(f);
		q.inlineImages ??= [];
		const id = crypto.randomUUID();
		q.inlineImages.push({ id, ...img });
		insertAtCursor(`{img:${id}}`);
		(e.currentTarget as HTMLInputElement).value = '';
	}

	async function pickImage(e: Event) {
		const f = (e.currentTarget as HTMLInputElement).files?.[0];
		if (f) q.image = await readImageFile(f);
	}
	function removeChoice(i: number) {
		q.choices.splice(i, 1);
		if (q.answerIndex === i) q.answerIndex = null;
		else if (q.answerIndex !== null && q.answerIndex > i) q.answerIndex--;
	}
	function removeInlineImage(id: string) {
		q.inlineImages = (q.inlineImages ?? []).filter((im) => im.id !== id);
		q.text = q.text.replaceAll(`{img:${id}}`, '');
	}

	const canSave = $derived(q.text.trim() !== '' && (kind === 'written' || q.choices.filter((c) => c.trim()).length >= 2));

	function save() {
		const base = { ...$state.snapshot(q), text: q.text.trim(), kind };
		if (kind === 'written') {
			onsave({ ...base, choices: [], answerIndex: null, answerLines: Math.max(1, q.answerLines ?? 3) });
			return;
		}
		// ตัดตัวเลือกว่างออก และปรับตำแหน่งเฉลยให้ตรง
		const kept = q.choices.map((c, i) => ({ c: c.trim(), i })).filter((x) => x.c);
		const found = q.answerIndex === null ? -1 : kept.findIndex((x) => x.i === q.answerIndex);
		onsave({ ...base, choices: kept.map((x) => x.c), answerIndex: found < 0 ? null : found });
	}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
	<div class="card max-h-[90vh] w-full max-w-2xl overflow-y-auto">
		<div class="mb-3 flex items-center justify-between">
			<h3 class="font-bold">แก้ไขข้อสอบ</h3>
			<button class="btn-ghost !p-1" onclick={oncancel} aria-label="ปิด"><X size={18} /></button>
		</div>

		<div class="mb-3 grid gap-2 sm:grid-cols-2">
			<label class="text-sm">ประเภทข้อ
				<select class="input mt-1" bind:value={q.kind}>
					<option value="choice">ปรนัย (มีตัวเลือก)</option>
					<option value="written">ข้อเขียน (ไม่มีตัวเลือก)</option>
				</select>
			</label>
			<label class="text-sm">ตอน
				<select class="input mt-1" bind:value={q.partId}>
					<option value={undefined}>— ไม่ระบุตอน —</option>
					{#each parts as p (p.id)}<option value={p.id}>{p.title || '(ไม่มีชื่อตอน)'}</option>{/each}
				</select>
			</label>
		</div>

		<div class="mb-1 flex items-center justify-between">
			<label class="block text-sm font-semibold" for="qtext">โจทย์</label>
			<span class="text-xs text-slate-400">x^{'{2}'} ยกกำลัง · H_{'{2}'}O ห้อย</span>
		</div>
		<textarea id="qtext" rows="3" class="input mb-1" bind:value={q.text} onfocus={track}></textarea>

		<div class="mb-3 flex flex-wrap items-center gap-1">
			<button type="button" class="btn-ghost !p-1.5" title="ยกกำลัง" onclick={() => replaceSelection('^{', '}')}><Superscript size={15} /></button>
			<button type="button" class="btn-ghost !p-1.5" title="ห้อย" onclick={() => replaceSelection('_{', '}')}><Subscript size={15} /></button>
			<label class="btn-ghost !p-1.5 cursor-pointer" title="แทรกรูปในข้อความ">
				<ImagePlus size={15} />
				<input type="file" accept="image/png,image/jpeg,image/gif" class="hidden" onchange={pickInlineImage} />
			</label>
			<span class="mx-1 h-4 w-px bg-slate-300"></span>
			{#each SYMBOLS as sym (sym)}
				<button type="button" class="rounded px-1.5 py-0.5 text-sm hover:bg-slate-200 dark:hover:bg-slate-700" onclick={() => insertAtCursor(sym)}>{sym}</button>
			{/each}
		</div>

		{#if q.inlineImages?.length}
			<div class="mb-3 flex flex-wrap gap-2">
				{#each q.inlineImages as im (im.id)}
					<div class="flex items-center gap-1 rounded border p-1 text-xs">
						<img src={im.dataUrl} alt="" class="h-8" />
						<button class="btn-ghost !p-1" onclick={() => removeInlineImage(im.id)} aria-label="ลบรูปในข้อความ"><Trash2 size={12} /></button>
					</div>
				{/each}
			</div>
		{/if}

		{#if kind === 'choice'}
			<div class="mb-1 text-sm font-semibold">ตัวเลือก (เลือกวงกลมเพื่อกำหนดเฉลย)</div>
			{#each q.choices as _, i}
				<div class="mb-2 flex items-center gap-2">
					<input type="radio" name="ans" checked={q.answerIndex === i} onchange={() => (q.answerIndex = i)} />
					<span class="w-5 text-sm">{labels[i]}.</span>
					<input class="input" bind:value={q.choices[i]} onfocus={track} />
					<button class="btn-ghost !p-2" onclick={() => removeChoice(i)} aria-label="ลบตัวเลือก"><Trash2 size={14} /></button>
				</div>
			{/each}
			{#if q.choices.length < 5}
				<button class="btn-ghost mb-3" onclick={() => q.choices.push('')}><Plus size={14} /> เพิ่มตัวเลือก</button>
			{/if}
		{:else}
			<label class="mb-3 block text-sm">จำนวนบรรทัดให้เขียนตอบ
				<input type="number" min="1" max="20" class="input mt-1 !w-32" bind:value={q.answerLines} />
			</label>
		{/if}

		<div class="mb-1 text-sm font-semibold">รูปภาพประกอบใต้โจทย์ (ถ้ามี)</div>
		<div class="mb-3 flex items-center gap-3">
			<input type="file" accept="image/png,image/jpeg,image/gif" onchange={pickImage} class="text-sm" />
			{#if q.image}
				<img src={q.image.dataUrl} alt="รูปประกอบ" class="h-14 rounded border" />
				<button class="btn-ghost" onclick={() => (q.image = undefined)}>ลบรูป</button>
			{/if}
		</div>

		<label class="mb-1 block text-sm font-semibold" for="exp">คำอธิบายเฉลย (ไม่แสดงในเอกสาร)</label>
		<textarea id="exp" rows="2" class="input mb-4" bind:value={q.explanation} onfocus={track}></textarea>

		<div class="flex justify-end gap-2">
			<button class="btn-ghost" onclick={oncancel}>ยกเลิก</button>
			<button class="btn-primary" disabled={!canSave} onclick={save}>บันทึก</button>
		</div>
	</div>
</div>
