<script lang="ts">
	// หน้าตั้งค่าแอป: ล้างข้อมูลที่บันทึกในเบราว์เซอร์
	function reset() {
		if (confirm('ล้างข้อมูลทั้งหมดที่บันทึกไว้ในเบราว์เซอร์นี้?')) {
			localStorage.removeItem('examdoc:v1');
			location.href = '/';
		}
	}
</script>

<h1 class="mb-4 text-2xl font-bold">ตั้งค่า</h1>
<button class="btn-ghost" onclick={reset}>ล้างข้อมูลที่บันทึกไว้</button>
