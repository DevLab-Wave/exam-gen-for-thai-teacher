<script lang="ts">
	// โครงหน้าหลัก: Sidebar ซ้าย + เนื้อหาขวา
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { Home, FilePlus, Database, LayoutTemplate, History, Settings, Moon, Sun, FileText } from 'lucide-svelte';
	import { app, loadState, saveState } from '$lib/state.svelte';

	let { children } = $props();
	let ready = $state(false);

	// เมนูนำทาง
	const menu = [
		{ href: '/', label: 'หน้าหลัก', icon: Home },
		{ href: '/create', label: 'สร้างเอกสารใหม่', icon: FilePlus },
		{ href: '/data', label: 'จัดการข้อมูล', icon: Database },
		{ href: '/templates', label: 'เทมเพลต', icon: LayoutTemplate },
		{ href: '/history', label: 'ประวัติ', icon: History },
		{ href: '/settings', label: 'ตั้งค่า', icon: Settings }
	];

	onMount(() => {
		loadState();
		ready = true;
	});

	// บันทึกอัตโนมัติทุกครั้งที่ข้อมูลเปลี่ยน (หลังโหลดเสร็จเท่านั้น กันเขียนทับด้วยค่าว่าง)
	$effect(() => {
		if (!ready) return;
		JSON.stringify(app); // อ่านทุก property เพื่อให้ effect ติดตามการเปลี่ยนแปลงแบบลึก
		saveState();
	});

	// สลับโหมดมืด/สว่างด้วยการเพิ่ม class "dark" ที่ <html>
	$effect(() => {
		document.documentElement.classList.toggle('dark', app.dark);
	});

	const isActive = (href: string) => (href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href));
</script>

<div class="flex min-h-screen bg-slate-50 font-sans text-slate-800 dark:bg-slate-950 dark:text-slate-100">
	<!-- Sidebar -->
	<aside class="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:flex">
		<div class="mb-6 flex items-center gap-2 text-lg font-bold text-indigo-600">
			<FileText size={22} /> ExamDoc
		</div>
		<nav class="flex flex-1 flex-col gap-1">
			{#each menu as m}
				<a
					href={m.href}
					class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition
						{isActive(m.href) ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}"
				>
					<m.icon size={18} />
					{m.label}
				</a>
			{/each}
		</nav>
		<button class="btn-ghost" onclick={() => (app.dark = !app.dark)}>
			{#if app.dark}<Sun size={16} /> โหมดสว่าง{:else}<Moon size={16} /> โหมดมืด{/if}
		</button>
	</aside>

	<!-- เนื้อหา (มือถือ: แถบเมนูด้านบนแทน Sidebar) -->
	<div class="min-w-0 flex-1">
		<nav class="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900 md:hidden">
			{#each menu as m}
				<a href={m.href} class="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm {isActive(m.href) ? 'bg-indigo-600 text-white' : ''}">{m.label}</a>
			{/each}
		</nav>
		<main class="mx-auto max-w-7xl p-4 md:p-6">
			{@render children()}
		</main>
	</div>
</div>
