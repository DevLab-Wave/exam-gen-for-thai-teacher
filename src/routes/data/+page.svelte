<script lang="ts">
	// หน้าจัดการข้อมูล: นำเข้า + ตารางข้อสอบ
	import DropZone from '$lib/components/DropZone.svelte';
	import QuestionTable from '$lib/components/QuestionTable.svelte';
</script>

<h1 class="mb-4 text-2xl font-bold">จัดการข้อมูล</h1>
<div class="flex flex-col gap-4"><DropZone /><QuestionTable /></div>
