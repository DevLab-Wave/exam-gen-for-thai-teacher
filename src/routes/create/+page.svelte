<script lang="ts">
	// หน้าสร้างเอกสาร: นำเข้า → ตาราง → ตั้งค่า → ตัวอย่าง → ดาวน์โหลด
	import { FileDown, Loader } from 'lucide-svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import QuestionTable from '$lib/components/QuestionTable.svelte';
	import PartsPanel from '$lib/components/PartsPanel.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import DocPreview from '$lib/components/DocPreview.svelte';
	import { app } from '$lib/state.svelte';
	import { downloadExamDocx } from '$lib/docx/generateExamDocx';

	let busy = $state(false);
	let err = $state('');

	// สร้างและดาวน์โหลดไฟล์ .docx (ส่ง snapshot เพื่อไม่ส่ง proxy ของ Svelte เข้าไลบรารี)
	async function generate() {
		busy = true;
		err = '';
		try {
			await downloadExamDocx($state.snapshot(app.questions), $state.snapshot(app.settings), $state.snapshot(app.parts));
		} catch (e) {
			err = e instanceof Error ? e.message : 'สร้างเอกสารไม่สำเร็จ';
		} finally {
			busy = false;
		}
	}
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
	<h1 class="text-2xl font-bold">สร้างเอกสารใหม่</h1>
	<button class="btn-primary" disabled={busy || app.questions.length === 0} onclick={generate}>
		{#if busy}<Loader size={16} class="animate-spin" />{:else}<FileDown size={16} />{/if} สร้างและดาวน์โหลด .docx
	</button>
</div>
{#if err}<p class="mb-3 text-sm text-red-600">{err}</p>{/if}

<div class="grid gap-4 lg:grid-cols-2">
	<div class="flex flex-col gap-4">
		<DropZone />
		<SettingsPanel />
		<PartsPanel />
	</div>
	<div class="flex flex-col gap-4">
		<QuestionTable />
		<div>
			<h2 class="mb-2 font-bold">3. ตัวอย่างเอกสาร <span class="text-sm font-normal text-muted-foreground">(เป็นเพียงการแสดงตัวอย่างเบื้องต้น กรุณาสร้างเอกสารเพื่อดูตัวอย่างที่แท้จริง)</span> </h2>
			<DocPreview />
		</div>
	</div>
</div>
