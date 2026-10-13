<script lang="ts">
	// หน้าหลัก: สรุปสถานะและทางลัด
	import { app } from '$lib/state.svelte';
	const missing = $derived(app.questions.filter((q) => q.answerIndex === null).length);
</script>

<h1 class="mb-4 text-2xl font-bold">ExamDoc Generator</h1>
<p class="mb-6 text-slate-600 dark:text-slate-400">สร้างข้อสอบภาษาไทยเป็นไฟล์ Word (.docx) ตามมาตรฐานราชการ</p>
<div class="grid gap-4 sm:grid-cols-3">
	<div class="card"><div class="text-3xl font-bold">{app.questions.length}</div><div class="text-sm text-slate-500">ข้อสอบในระบบ</div></div>
	<div class="card"><div class="text-3xl font-bold {missing ? 'text-amber-600' : ''}">{missing}</div><div class="text-sm text-slate-500">ข้อที่ยังไม่ระบุเฉลย</div></div>
	<div class="card"><div class="text-3xl font-bold">{app.settings.columns}</div><div class="text-sm text-slate-500">คอลัมน์ที่ตั้งไว้</div></div>
</div>
<a href="/create" class="btn-primary mt-6">เริ่มสร้างเอกสารใหม่</a>
