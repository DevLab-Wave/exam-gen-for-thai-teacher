<script lang="ts">
	// ส่วนนำเข้าข้อมูล: ลากวางหรือเลือกไฟล์ CSV / XLSX
	import { Upload, Download } from 'lucide-svelte';
	import { importQuestions } from '$lib/importers';
	import { app, mergeImport, sampleQuestions } from '$lib/state.svelte';

	let over = $state(false);
	let msg = $state('');
	let error = $state(false);

	// อ่านไฟล์แล้วต่อท้ายรายการข้อสอบเดิม (รวมตอนที่พบในไฟล์ด้วย)
	async function handle(file?: File) {
		if (!file) return;
		try {
			const result = await importQuestions(file);
			mergeImport(result);
			error = false;
			msg = `นำเข้า ${result.questions.length} ข้อจาก ${file.name}`;
		} catch (e) {
			error = true;
			msg = e instanceof Error ? e.message : 'นำเข้าไฟล์ไม่สำเร็จ';
		}
	}
</script>

<div class="card">
	<h2 class="mb-3 font-bold">1. นำเข้าข้อมูล</h2>
	<label
		class="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center text-sm transition
			{over ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950' : 'border-slate-300 dark:border-slate-600'}"
		ondragover={(e) => { e.preventDefault(); over = true; }}
		ondragleave={() => (over = false)}
		ondrop={(e) => { e.preventDefault(); over = false; handle(e.dataTransfer?.files[0]); }}
	>
		<Upload />
		<span>ลากไฟล์ .csv / .xlsx มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</span>
		<input type="file" accept=".csv,.xlsx" class="hidden" onchange={(e) => { handle(e.currentTarget.files?.[0]); e.currentTarget.value = ''; }} />
	</label>
	<div class="mt-3 flex flex-wrap gap-2">
		<a href="/template.csv" download class="btn-ghost"><Download size={16} /> ดาวน์โหลดไฟล์ตัวอย่าง CSV</a>
		<button class="btn-ghost" onclick={() => app.questions.push(...sampleQuestions())}>เพิ่มข้อสอบตัวอย่าง</button>
	</div>
	{#if msg}<p class="mt-2 text-sm {error ? 'text-red-600' : 'text-emerald-600'}">{msg}</p>{/if}
</div>
