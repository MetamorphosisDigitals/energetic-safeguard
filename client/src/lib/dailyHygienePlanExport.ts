import type { ArchivedDailyHygienePlan } from "./localPersistence";

export type DailyHygienePlanPrintData = {
  plan: ArchivedDailyHygienePlan;
  ritualName: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

function dateLabel(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? "—" : new Date(timestamp).toLocaleDateString();
}

export function buildDailyHygienePlanPrintHtml({ plan, ritualName }: DailyHygienePlanPrintData) {
  const notes = Object.entries(plan.completionNotes).sort(([left], [right]) => left.localeCompare(right)).map(([date, note]) => `<article><small>${escapeHtml(dateLabel(date))}</small><p>${escapeHtml(note)}</p></article>`).join("") || "<p>No day-level notes were added to this plan.</p>";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Seven-Day Daily Hygiene Plan</title><style>body{font-family:Georgia,serif;color:#352535;max-width:720px;margin:44px auto;padding:0 28px}h1{font-size:32px;margin-bottom:4px}h2{font-size:20px;margin-top:30px}.eyebrow{font:700 10px Arial;letter-spacing:.14em;color:#8f5a6d}.metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.metric{padding:14px;border:1px solid #e3d5cf;border-radius:10px}.metric b{font-size:25px}article{padding:12px 0;border-bottom:1px solid #eee2dc}article p,.reflection{white-space:pre-wrap;line-height:1.55}@media print{body{margin:0;max-width:none}}</style></head><body><p class="eyebrow">THE ENERGETIC SAFEGUARD</p><h1>Seven-Day Daily Hygiene Plan</h1><p>${escapeHtml(dateLabel(plan.startedAt))} – ${escapeHtml(dateLabel(plan.endsAt))}</p><h2>Plan summary</h2><div class="metrics"><div class="metric"><b>${plan.completedDayKeys.length}</b><br><small>completed check-ins</small></div><div class="metric"><b>${escapeHtml(ritualName)}</b><br><small>selected ritual</small></div></div><h2>What you noticed</h2>${notes}<h2>Closing reflection</h2><p class="reflection">${escapeHtml(plan.reflectionNote || "No closing reflection was added.")}</p></body></html>`;
}
