<script lang="ts">
	// ส่วนตั้งค่ารูปแบบเอกสาร: ข้อมูลโรงเรียน/วิชา, คอลัมน์, ฟอนต์, รูปแบบตัวเลือก
	import { app } from '$lib/state.svelte';
	const s = app.settings; // อ้างถึง object เดียวกับใน state (reactive)
</script>

<div class="card">
	<h2 class="mb-3 font-bold">2. ตั้งค่ารูปแบบเอกสาร</h2>
	<div class="grid gap-3 sm:grid-cols-2">
		<label class="sm:col-span-2 text-sm">ชื่อโรงเรียน<input class="input mt-1" bind:value={s.school} placeholder="โรงเรียน..." /></label>
		<label class="sm:col-span-2 text-sm">หัวข้อหลัก (ตัวใหญ่สุด)<input class="input mt-1" bind:value={s.mainHeading} placeholder="แบบทดสอบวัดผลสัมฤทธิ์ทางการเรียน" /></label>
		<label class="sm:col-span-2 text-sm">หัวข้อการสอบ<input class="input mt-1" bind:value={s.examTitle} placeholder="ข้อสอบปลายภาคเรียนที่ 1 ปีการศึกษา 2569" /></label>
		<label class="sm:col-span-2 text-sm">คำชี้แจงรายวิชา<textarea rows="2" class="input mt-1" bind:value={s.instructions} placeholder="ให้เลือกคำตอบที่ถูกต้องที่สุดเพียงข้อเดียว แล้วกาคำตอบลงในกระดาษคำตอบ"></textarea></label>
		<label class="text-sm">วิชา<input class="input mt-1" bind:value={s.subject} /></label>
		<label class="text-sm">รหัสวิชา<input class="input mt-1" bind:value={s.subjectCode} /></label>
		<label class="text-sm">ระดับชั้น<input class="input mt-1" bind:value={s.classLevel} placeholder="มัธยมศึกษาปีที่ 1" /></label>
		<div class="grid grid-cols-2 gap-3">
			<label class="text-sm">เวลา (นาที)<input type="number" min="0" class="input mt-1" bind:value={s.durationMin} /></label>
			<label class="text-sm">คะแนนเต็ม<input type="number" min="0" class="input mt-1" bind:value={s.totalScore} /></label>
		</div>

		<label class="text-sm">จำนวนคอลัมน์
			<select class="input mt-1" bind:value={s.columns}>
				<option value={1}>1 คอลัมน์</option>
				<option value={2}>2 คอลัมน์ (ประหยัดกระดาษ)</option>
			</select>
		</label>
		<label class="text-sm">ฟอนต์
			<select class="input mt-1" bind:value={s.fontName}>
				<option>TH Sarabun New</option>
				<option>TH SarabunPSK</option>
			</select>
		</label>
		<label class="text-sm">ขนาดฟอนต์ (pt)<input type="number" min="12" max="20" class="input mt-1" bind:value={s.fontSize} /></label>
		<label class="text-sm">ระยะห่างบรรทัด
			<select class="input mt-1" bind:value={s.lineSpacing}>
				<option value={1}>เดี่ยว (1.0)</option>
				<option value={1.15}>1.15</option>
				<option value={1.3}>1.3</option>
			</select>
		</label>
		<label class="text-sm">รูปแบบตัวเลือก
			<select class="input mt-1" bind:value={s.choiceStyle}>
				<option value="thai">ก. ข. ค. ง.</option>
				<option value="latin">A. B. C. D.</option>
				<option value="number">1) 2) 3) 4)</option>
			</select>
		</label>
		<label class="text-sm">การจัดตัวเลือก
			<select class="input mt-1" bind:value={s.choiceLayout}>
				<option value="vertical">เรียงแนวตั้ง</option>
				<option value="inline" disabled={s.columns === 2}>เรียงบรรทัดเดียว (1 คอลัมน์)</option>
				<option value="double">เรียง 2 ตัวต่อบรรทัด (เฉพาะตัวเลือกสั้น)</option>
			</select>
		</label>
		<label class="text-sm">เฉลย
			<select class="input mt-1" bind:value={s.answerKey}>
				<option value="end">แนบท้ายเอกสาร</option>
				<option value="none">ไม่แนบ</option>
			</select>
		</label>
		<div class="flex flex-col justify-end gap-2 text-sm">
			<label class="flex items-center gap-2"><input type="checkbox" bind:checked={s.showStudentInfo} /> แสดงช่อง ชื่อ-สกุล / เลขที่</label>
			<label class="flex items-center gap-2" title="ใช้เมื่อ Word ตัดคำภาษาไทยผิดตำแหน่ง"><input type="checkbox" bind:checked={s.insertZwsp} /> แทรก Zero-Width Space ระหว่างคำ</label>
		</div>
	</div>
</div>
