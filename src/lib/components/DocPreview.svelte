<script lang="ts">
	// ตัวอย่างเอกสารจริง: สร้าง .docx (blob) แล้วเรนเดอร์ด้วย docx-preview ให้เห็นหน้าจริง
	import { onMount } from 'svelte';
	import { app } from '$lib/state.svelte';
	import { buildExamDocx } from '$lib/docx/generateExamDocx';
	import { renderAsync } from 'docx-preview';

	let host = $state<HTMLDivElement | null>(null);
	let busy = $state(false);
	let err = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;
	let token = 0;

	// ย่อขนาดหน้าจริงให้พอดีความกว้าง พร้อมคงสัดส่วน A4
	function fit() {
		if (!host) return;
		const wrapper = host.querySelector<HTMLElement>('.docx-wrapper');
		const page = host.querySelector<HTMLElement>('.docx');
		if (!wrapper || !page) return;
		wrapper.style.zoom = '1'; // วัดขนาดจริงก่อน
		const pageW = page.offsetWidth;
		const avail = host.clientWidth - 32; // หัก padding p-4
		if (pageW > 0 && avail > 0) wrapper.style.zoom = String(Math.min(1, avail / pageW));
	}

	async function render() {
		if (!host) return;
		const mine = ++token;
		busy = true;
		err = '';
		try {
			if (app.questions.length === 0) {
				host.replaceChildren();
				return;
			}
			const blob = await buildExamDocx(
				$state.snapshot(app.questions),
				$state.snapshot(app.settings),
				$state.snapshot(app.parts)
			);
			if (mine !== token || !host) return; // มีการเรนเดอร์ใหม่กว่าแล้ว
			host.replaceChildren();
			await renderAsync(blob, host, host, {
				inWrapper: true,
				breakPages: true,
				ignoreWidth: false,
				ignoreHeight: false,
				renderHeaders: true,
				renderFooters: true,
				// docx-preview ตั้ง default = true ซึ่งบังคับให้ "ทุก section" ขึ้นหน้าใหม่
				// ทำให้ส่วนหัว (section แรก) แยกไปหน้าเดียว ปิดเพื่อให้ section CONTINUOUS
				// ต่อเนื่องกัน (ส่วนหัว + ข้อสอบหน้าแรกอยู่หน้าเดียวกัน) เหมือนใน Word
				ignoreLastRenderedPageBreak: false
			});
			fit();
		} catch (e) {
			if (mine === token) err = e instanceof Error ? e.message : 'แสดงตัวอย่างไม่สำเร็จ';
		} finally {
			if (mine === token) busy = false;
		}
	}

	// เรนเดอร์ใหม่เมื่อข้อสอบ/ตั้งค่าเปลี่ยน (หน่วงเล็กน้อยกันเรนเดอร์ถี่เกิน)
	$effect(() => {
		void app.questions;
		void app.settings;
		void app.parts;
		JSON.stringify({ q: app.questions, s: app.settings, p: app.parts });
		clearTimeout(timer);
		timer = setTimeout(render, 350);
		return () => clearTimeout(timer);
	});

	// ย่อ/ขยายตามขนาดพื้นที่เมื่อ container เปลี่ยน
	$effect(() => {
		if (!host) return;
		const ro = new ResizeObserver(() => fit());
		ro.observe(host);
		return () => ro.disconnect();
	});

	onMount(() => {
		const onWin = () => fit();
		window.addEventListener('resize', onWin);
		return () => window.removeEventListener('resize', onWin);
	});
</script>

<div class="relative overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800">
	{#if busy}
		<div class="absolute right-3 top-3 z-10 rounded-full bg-black/60 px-2 py-1 text-xs text-white">กำลังเรนเดอร์…</div>
	{/if}
	{#if err}
		<p class="p-4 text-sm text-red-600">แสดงตัวอย่างไม่สำเร็จ: {err}</p>
	{:else if app.questions.length === 0}
		<p class="p-8 text-center text-sm text-slate-400">(ยังไม่มีข้อสอบ)</p>
	{:else}
		<div bind:this={host} class="docx-host max-h-[70vh] overflow-auto p-4"></div>
	{/if}
</div>

<style>
	/* ปรับหน้าตาเอกสารที่ docx-preview เรนเดอร์ (หน้าจริงขนาด A4) */
	.docx-host :global(.docx-wrapper) {
		background: transparent;
		padding: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}
	.docx-host :global(.docx-wrapper > section.docx),
	.docx-host :global(.docx-wrapper > div.docx) {
		margin: 0;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
		background: #fff;
	}
</style>
