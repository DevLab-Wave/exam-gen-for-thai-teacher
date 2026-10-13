/** Tailwind — เปิดโหมดมืดแบบ class (สลับด้วยปุ่มใน Sidebar) */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			fontFamily: {
				// ฟอนต์ UI ภาษาไทย (Sarabun จาก Google Fonts ใน app.html)
				sans: ['Sarabun', 'TH Sarabun New', 'system-ui', 'sans-serif']
			}
		}
	},
	plugins: []
};
