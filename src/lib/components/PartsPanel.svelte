<script lang="ts">
	// จัดการ "ตอน" ของข้อสอบ: ชื่อตอน + คำชี้แจง และจำนวนข้อในแต่ละตอน
	import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-svelte';
	import { app, newPart } from '$lib/state.svelte';

	const countIn = (id: string) => app.questions.filter((q) => q.partId === id).length;

	function remove(id: string) {
		if (!confirm('ลบตอนนี้? ข้อที่อยู่ในตอนนี้จะกลายเป็นข้อที่ไม่ระบุตอน')) return;
		app.parts = app.parts.filter((p) => p.id !== id);
		for (const q of app.questions) if (q.partId === id) q.partId = undefined;
	}
	function move(i: number, d: -1 | 1) {
		const j = i + d;
		if (j < 0 || j >= app.parts.length) return;
		[app.parts[i], app.parts[j]] = [app.parts[j], app.parts[i]];
	}
</script>

<div class="card">
	<div class="mb-3 flex items-center justify-between gap-2">
		<h2 class="font-bold">ตอน / ส่วนของข้อสอบ ({app.parts.length})</h2>
		<button class="btn-ghost" onclick={() => app.parts.push(newPart())}><Plus size={16} /> เพิ่มตอน</button>
	</div>

	{#if app.parts.length === 0}
		<p class="text-sm text-slate-500">ยังไม่มีตอน — เพิ่มตอนเพื่อจัดกลุ่มข้อสอบ (เช่น ตอนที่ 1 ปรนัย / ตอนที่ 2 อัตนัย)</p>
	{:else}
		<div class="flex flex-col gap-3">
			{#each app.parts as p, i (p.id)}
				<div class="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
					<div class="mb-2 flex items-center gap-2">
						<input class="input" bind:value={p.title} placeholder="ชื่อตอน เช่น ตอนที่ 1 ปรนัย" />
						<span class="whitespace-nowrap text-xs text-slate-500">{countIn(p.id)} ข้อ</span>
						<button class="btn-ghost !p-1.5" disabled={i === 0} onclick={() => move(i, -1)} aria-label="เลื่อนขึ้น"><ArrowUp size={14} /></button>
						<button class="btn-ghost !p-1.5" disabled={i === app.parts.length - 1} onclick={() => move(i, 1)} aria-label="เลื่อนลง"><ArrowDown size={14} /></button>
						<button class="btn-ghost !p-1.5" onclick={() => remove(p.id)} aria-label="ลบตอน"><Trash2 size={14} /></button>
					</div>
					<textarea rows="2" class="input" bind:value={p.instructions} placeholder="คำชี้แจงของตอน (ถ้ามี)"></textarea>
				</div>
			{/each}
		</div>
	{/if}
</div>
