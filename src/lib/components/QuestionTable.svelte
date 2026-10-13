<script lang="ts">
	// ตารางข้อสอบ: เพิ่ม / แก้ไข / ลบ / ย้ายลำดับ (เลื่อนได้ + แบ่งหน้า + กรองตามตอน)
	import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, ImageIcon, ChevronLeft, ChevronRight, PencilLine } from 'lucide-svelte';
	import { app, newQuestion, newWrittenQuestion } from '$lib/state.svelte';
	import { isWritten, type Question } from '$lib/types';
	import { plainText } from '$lib/richtext';
	import QuestionEditor from './QuestionEditor.svelte';

	let editing = $state<Question | null>(null);
	const labels = ['ก', 'ข', 'ค', 'ง', 'จ'];

	const partName = $derived(new Map(app.parts.map((p) => [p.id, p.title])));

	// กรองตามตอน
	let partFilter = $state<'all' | 'none' | string>('all');
	const filtered = $derived(
		partFilter === 'all'
			? app.questions
			: partFilter === 'none'
				? app.questions.filter((q) => !q.partId || !partName.has(q.partId))
				: app.questions.filter((q) => q.partId === partFilter)
	);

	// แบ่งหน้า
	let page = $state(1);
	let perPage = $state(10);
	const pageCount = $derived(Math.max(1, Math.ceil(filtered.length / perPage)));
	const current = $derived(Math.min(page, pageCount));
	const start = $derived((current - 1) * perPage);
	const pageItems = $derived(filtered.slice(start, start + perPage));

	$effect(() => {
		if (page > pageCount) page = pageCount;
		if (page < 1) page = 1;
	});

	// บันทึกจากหน้าต่างแก้ไข: ถ้า id เดิมมีอยู่ให้แทนที่ ไม่งั้นเพิ่มใหม่
	function save(q: Question) {
		const i = app.questions.findIndex((x) => x.id === q.id);
		if (i >= 0) app.questions[i] = q;
		else app.questions.push(q);
		editing = null;
	}
	function remove(q: Question) {
		const i = app.questions.indexOf(q);
		if (i >= 0 && confirm(`ลบข้อที่ ${i + 1} ?`)) app.questions.splice(i, 1);
	}
	function move(q: Question, d: -1 | 1) {
		const i = app.questions.indexOf(q);
		const j = i + d;
		if (i < 0 || j < 0 || j >= app.questions.length) return;
		[app.questions[i], app.questions[j]] = [app.questions[j], app.questions[i]];
	}
</script>

<div class="card">
	<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
		<h2 class="font-bold">ข้อสอบทั้งหมด ({app.questions.length} ข้อ)</h2>
		<div class="flex flex-wrap gap-2">
			{#if app.parts.length || app.questions.length}
				<select class="input !w-auto !py-1.5" bind:value={partFilter}>
					<option value="all">ทุกตอน</option>
					<option value="none">ไม่ระบุตอน</option>
					{#each app.parts as p (p.id)}<option value={p.id}>{p.title || '(ไม่มีชื่อตอน)'}</option>{/each}
				</select>
			{/if}
			{#if app.questions.length}
				<button class="btn-ghost" onclick={() => confirm('ล้างข้อสอบทั้งหมด?') && (app.questions = [])}>ล้างทั้งหมด</button>
			{/if}
			<button class="btn-ghost" onclick={() => (editing = newWrittenQuestion())}><PencilLine size={16} /> เพิ่มข้อเขียน</button>
			<button class="btn-primary" onclick={() => (editing = newQuestion())}><Plus size={16} /> เพิ่มข้อสอบ</button>
		</div>
	</div>

	{#if app.questions.length === 0}
		<p class="py-8 text-center text-sm text-slate-500">ยังไม่มีข้อสอบ — นำเข้าไฟล์ หรือกด "เพิ่มข้อสอบ"</p>
	{:else if filtered.length === 0}
		<p class="py-8 text-center text-sm text-slate-500">ไม่มีข้อสอบในตอนนี้</p>
	{:else}
		<div class="max-h-[420px] overflow-auto rounded-lg border border-slate-100 dark:border-slate-800">
			<table class="w-full text-left text-sm">
				<thead class="sticky top-0 z-10 border-b border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900">
					<tr><th class="p-2">ข้อ</th><th class="p-2">โจทย์</th><th class="p-2">ตอน</th><th class="p-2">เฉลย</th><th class="p-2"></th><th class="p-2"></th></tr>
				</thead>
				<tbody>
					{#each pageItems as q (q.id)}
						{@const i = app.questions.indexOf(q)}
						<tr class="border-b border-slate-100 align-top dark:border-slate-800">
							<td class="p-2">{i + 1}</td>
							<td class="max-w-md p-2">
								<div class="line-clamp-2">{plainText(q.text)}</div>
								<div class="text-xs text-slate-500">
									{#if isWritten(q)}<span class="rounded bg-amber-100 px-1 text-amber-700 dark:bg-amber-900 dark:text-amber-200">ข้อเขียน</span> {q.answerLines ?? 3} บรรทัด{:else}{q.choices.length} ตัวเลือก{/if}
								</div>
							</td>
							<td class="p-2 text-xs text-slate-500">{q.partId ? (partName.get(q.partId) || '(ไม่มีชื่อตอน)') : '—'}</td>
							<td class="p-2 font-semibold {!isWritten(q) && q.answerIndex === null ? 'text-amber-600' : ''}">
								{#if isWritten(q)}—{:else if q.answerIndex === null}ยังไม่ระบุ{:else}{labels[q.answerIndex]}{/if}
							</td>
							<td class="p-2">{#if q.image}<ImageIcon size={16} />{/if}</td>
							<td class="whitespace-nowrap p-2 text-right">
								<button class="btn-ghost !p-1.5" onclick={() => move(q, -1)} aria-label="เลื่อนขึ้น"><ArrowUp size={14} /></button>
								<button class="btn-ghost !p-1.5" onclick={() => move(q, 1)} aria-label="เลื่อนลง"><ArrowDown size={14} /></button>
								<button class="btn-ghost !p-1.5" onclick={() => (editing = q)} aria-label="แก้ไข"><Pencil size={14} /></button>
								<button class="btn-ghost !p-1.5" onclick={() => remove(q)} aria-label="ลบ"><Trash2 size={14} /></button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
			<label class="flex items-center gap-2 text-slate-500">
				แสดง
				<select class="input !w-auto !py-1" bind:value={perPage}>
					<option value={10}>10</option>
					<option value={20}>20</option>
					<option value={50}>50</option>
					<option value={100}>100</option>
				</select>
				ต่อหน้า
			</label>
			<div class="flex items-center gap-2">
				<button class="btn-ghost !p-1.5" disabled={current <= 1} onclick={() => (page = current - 1)} aria-label="ก่อนหน้า"><ChevronLeft size={16} /></button>
				<span class="px-1 text-slate-500">หน้า {current} / {pageCount}</span>
				<button class="btn-ghost !p-1.5" disabled={current >= pageCount} onclick={() => (page = current + 1)} aria-label="ถัดไป"><ChevronRight size={16} /></button>
			</div>
		</div>
	{/if}
</div>

{#if editing}
	<QuestionEditor question={editing} onsave={save} oncancel={() => (editing = null)} />
{/if}
