import type { PracticeHistoryNote } from "./practiceHistoryInsights";

export type MonthlyReflectionExportData = {
  monthLabel: string;
  total: number;
  activeDays: number;
  practiceTypes: number;
  comparison: { totalDifference: number; activeDayDifference: number };
  entries: readonly PracticeHistoryNote[];
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

function signed(value: number) { return value > 0 ? `+${value}` : String(value); }

export function buildMonthlyReflectionText(data: MonthlyReflectionExportData) {
  const reflections = data.entries.filter((entry) => entry.note).map((entry) => `• ${new Date(entry.completedAt).toLocaleDateString()}: ${entry.note}`).join("\n") || "No private notes recorded this month.";
  return `The Energetic Safeguard — Monthly Reflection\n${data.monthLabel}\n\nPractice summary\n• ${data.total} completed practices\n• ${data.activeDays} active days\n• ${data.practiceTypes} practice types\n• ${signed(data.comparison.totalDifference)} practices compared with last month\n• ${signed(data.comparison.activeDayDifference)} active days compared with last month\n\nPrivate reflections\n${reflections}`;
}

export function buildMonthlyReflectionPrintHtml(data: MonthlyReflectionExportData) {
  const reflectionRows = data.entries.filter((entry) => entry.note).map((entry) => `<article><small>${escapeHtml(new Date(entry.completedAt).toLocaleDateString())}</small><p>${escapeHtml(entry.note ?? "")}</p></article>`).join("") || "<p>No private notes recorded this month.</p>";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Monthly Reflection</title><style>body{font-family:Georgia,serif;color:#352535;max-width:720px;margin:44px auto;padding:0 28px}h1{font-size:32px;margin-bottom:4px}h2{font-size:20px;margin-top:30px}.eyebrow{font:700 10px Arial;letter-spacing:.14em;color:#8f5a6d}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.metric{padding:14px;border:1px solid #e3d5cf;border-radius:10px}.metric b{font-size:25px}article{padding:12px 0;border-bottom:1px solid #eee2dc}article p{white-space:pre-wrap;line-height:1.55}@media print{body{margin:0;max-width:none}}</style></head><body><p class="eyebrow">THE ENERGETIC SAFEGUARD</p><h1>Monthly Reflection</h1><p>${escapeHtml(data.monthLabel)}</p><h2>Practice summary</h2><div class="metrics"><div class="metric"><b>${data.total}</b><br><small>practices</small></div><div class="metric"><b>${data.activeDays}</b><br><small>active days</small></div><div class="metric"><b>${data.practiceTypes}</b><br><small>practice types</small></div></div><p>${signed(data.comparison.totalDifference)} practices and ${signed(data.comparison.activeDayDifference)} active days compared with last month.</p><h2>Private reflections</h2>${reflectionRows}</body></html>`;
}
