import { useMemo } from "react";
import { type PracticeHistoryNote, summarizeThreeMonthTrend } from "@/lib/practiceHistoryInsights";

export function ThreeMonthTrend({ entries }: { entries: PracticeHistoryNote[] }) {
  const trend = useMemo(() => summarizeThreeMonthTrend(entries), [entries]);
  const maximum = Math.max(1, ...trend.map((month) => month.total));
  return <section className="three-month-trend"><div><p className="eyebrow">THREE-MONTH VIEW</p><h2>Consistency over time</h2><p>See the gentle pattern your completed practices are forming.</p></div><div className="three-month-trend__bars" aria-label="Completed practice counts over the last three months">{trend.map((month) => <span key={month.label}><i style={{ height: `${Math.max(8, (month.total / maximum) * 72)}px` }} className={month.total ? "active" : ""} /><b>{month.total}</b><small>{month.label}</small></span>)}</div></section>;
}
