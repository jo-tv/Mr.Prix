export function isWorkingHours() {
  const now = new Date();

  // Railway يعمل غالبًا بـ UTC
  // عدّل الفرق حسب بلدك (مثلاً +1 أو +2)
  const hour = now.getUTCHours() + 1; // مثال: GMT+1

  return hour >= 8 && hour < 22;
}