// ตั้งค่า SvelteKit — ใช้ adapter-static แบบ SPA เพราะแอปนี้ทำงานฝั่งเบราว์เซอร์ทั้งหมด (สร้างไฟล์ .docx บนเครื่องผู้ใช้)
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ fallback: 'index.html' }) // fallback ให้ทุกเส้นทางโหลดผ่าน SPA
	}
};
