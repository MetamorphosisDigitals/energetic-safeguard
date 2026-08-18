import { useMemo, useState } from "react";
import { Check, Clock3, Download, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { practices } from "@/data/practices";
import { filterPracticeHistoryNotes, summarizePracticeMonth, summarizePracticeWeek, type PracticeHistoryNote } from "@/lib/practiceHistoryInsights";
import { defaultReflectionReminderPreference, isWeeklyReflectionDue, type ReflectionReminderPreference } from "@/lib/reflectionReminder";

const REMINDER_STORAGE_KEY = "energetic-safeguard:weekly-reflection-reminder:v1";
const moods = ["Calm", "Grounded", "Tender", "Hopeful", "Restless"];
const intentions = ["Return to myself", "Protect my peace", "Rest and restore", "Move with clarity", "Hold a boundary"];

function loadReminderPreference(): ReflectionReminderPreference {
  try {
    const raw = window.localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return defaultReflectionReminderPreference;
    const parsed = JSON.parse(raw) as Partial<ReflectionReminderPreference>;
    return { enabled: Boolean(parsed.enabled), lastPromptedAt: typeof parsed.lastPromptedAt === "string" ? parsed.lastPromptedAt : null };
  } catch { return defaultReflectionReminderPreference; }
}

function persistReminderPreference(preference: ReflectionReminderPreference) {
  try { window.localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(preference)); } catch { /* Local storage may be unavailable in privacy-focused browsing modes. */ }
}

export function PracticeHistoryTools() {
  const utils = trpc.useUtils();
  const history = trpc.library.history.useQuery({ limit: 50 }, { retry: false });
  const updateReflection = trpc.library.updateHistoryReflection.useMutation();
  const [keyword, setKeyword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [summaryRange, setSummaryRange] = useState<"week" | "month">("week");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [moodTag, setMoodTag] = useState("");
  const [intentionTag, setIntentionTag] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PracticeHistoryNote | null>(null);
  const [reminderPreference, setReminderPreference] = useState<ReflectionReminderPreference>(loadReminderPreference);
  const [showReflectionPrompt, setShowReflectionPrompt] = useState(() => isWeeklyReflectionDue(loadReminderPreference()));
  const entries = (history.data ?? []) as PracticeHistoryNote[];
  const filtered = useMemo(() => filterPracticeHistoryNotes(entries, keyword, startDate, endDate), [entries, keyword, startDate, endDate]);
  const weekly = useMemo(() => summarizePracticeWeek(entries), [entries]);
  const monthly = useMemo(() => summarizePracticeMonth(entries), [entries]);
  const currentSummary = summaryRange === "week" ? weekly : monthly;

  function save(entryId: number) {
    updateReflection.mutate({ historyId: entryId, note: draft.trim() || null, moodTag: moodTag || null, intentionTag: intentionTag || null }, { onSuccess: () => { setEditingId(null); void utils.library.history.invalidate(); toast.success("Private reflection saved."); }, onError: () => toast.error("We could not save this reflection.") });
  }
  function confirmDelete() {
    if (!pendingDelete) return;
    updateReflection.mutate({ historyId: pendingDelete.id, note: null, moodTag: null, intentionTag: null }, { onSuccess: () => { setPendingDelete(null); void utils.library.history.invalidate(); toast.success("Private note deleted."); }, onError: () => toast.error("We could not delete this note.") });
  }
  function exportNotes() {
    const notes = filtered.filter((entry) => entry.note);
    if (!notes.length) { toast.message("There are no matching notes to export."); return; }
    const content = notes.map((entry) => `${practices.find((practice) => practice.id === entry.practiceId)?.displayName ?? "Practice"}\nCompleted: ${new Date(entry.completedAt).toLocaleDateString()}\nMood: ${entry.moodTag ?? "—"}\nIntention: ${entry.intentionTag ?? "—"}\n\n${entry.note}`).join("\n\n---\n\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain" })); const link = document.createElement("a"); link.href = url; link.download = "energetic-safeguard-practice-notes.txt"; link.click(); URL.revokeObjectURL(url);
  }
  function beginEditing(entry: PracticeHistoryNote) { setEditingId(entry.id); setDraft(entry.note ?? ""); setMoodTag(entry.moodTag ?? ""); setIntentionTag(entry.intentionTag ?? ""); }
  function updateReminder(enabled: boolean) { const next = { ...reminderPreference, enabled }; setReminderPreference(next); persistReminderPreference(next); if (enabled && isWeeklyReflectionDue(next)) setShowReflectionPrompt(true); }
  function dismissReflectionPrompt() { const next = { ...reminderPreference, lastPromptedAt: new Date().toISOString() }; setReminderPreference(next); persistReminderPreference(next); setShowReflectionPrompt(false); }

  return <section className="history-tools"><div className="history-tools__card">{showReflectionPrompt && <section className="reflection-prompt"><div><p className="eyebrow">WEEKLY REFLECTION</p><h2>Take a gentle look back.</h2><p>Review your practice rhythm and private notes from the past week, in whatever way feels useful.</p></div><div><button onClick={dismissReflectionPrompt}>Not now</button><button className="reflection-prompt__primary" onClick={dismissReflectionPrompt}>Review my week <Check size={15} /></button></div></section>}<section className="summary-tabs"><div><p className="eyebrow">YOUR PRACTICE RHYTHM</p><h2>{summaryRange === "week" ? "This week" : "This month"}</h2><p>{currentSummary.total ? summaryRange === "week" ? `${weekly.total} completed practices across ${weekly.activeDays} active ${weekly.activeDays === 1 ? "day" : "days"}.` : `${monthly.total} completed practices across ${monthly.activeDays} active ${monthly.activeDays === 1 ? "day" : "days"}, across ${monthly.practiceCount} practice ${monthly.practiceCount === 1 ? "type" : "types"}.` : "Your completed practices will begin to build a rhythm here."}</p></div><div className="summary-tabs__controls"><button className={summaryRange === "week" ? "active" : ""} onClick={() => setSummaryRange("week")}>Week</button><button className={summaryRange === "month" ? "active" : ""} onClick={() => setSummaryRange("month")}>Month</button></div></section>{summaryRange === "week" ? <div className="weekly-bars" aria-label="Practice completion count for the last seven days">{weekly.days.map((day) => <span key={day.date.toISOString()}><i style={{ height: `${Math.max(7, day.total * 28)}px` }} className={day.total ? "active" : ""} /><small>{day.date.toLocaleDateString(undefined, { weekday: "narrow" })}</small></span>)}</div> : <div className="monthly-metrics"><span><b>{monthly.total}</b><small>practices</small></span><span><b>{monthly.activeDays}</b><small>active days</small></span><span><b>{monthly.practiceCount}</b><small>practice types</small></span></div>}<label className="reflection-toggle"><span><b>Weekly reflection prompt</b><small>Show an optional check-in the next time you return after a week.</small></span><input type="checkbox" checked={reminderPreference.enabled} onChange={(event) => updateReminder(event.target.checked)} /><i /></label><section className="notes-explorer"><div className="history-tools__heading"><div><p className="eyebrow">PERSONAL NOTES</p><h2>Search your reflections</h2></div><button className="history-export-button" onClick={exportNotes}><Download size={14} /> Export</button></div><div className="notes-filters"><label className="notes-search"><Search size={15} /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Search personal notes…" /></label><label>From<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>To<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div>{history.isLoading ? <p className="history-tools__status">Gathering your practice notes…</p> : filtered.length ? <div className="history-tools__list">{filtered.map((entry) => { const practice = practices.find((item) => item.id === entry.practiceId); return <article className="history-tools__item" key={entry.id}><div><b>{practice?.displayName ?? "Completed practice"}</b><small>Completed {new Date(entry.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</small>{editingId === entry.id ? <><textarea rows={3} value={draft} maxLength={1000} onChange={(event) => setDraft(event.target.value)} placeholder="A private note for yourself…" /><div className="reflection-tag-selects"><label>Mood<select value={moodTag} onChange={(event) => setMoodTag(event.target.value)}><option value="">No mood tag</option>{moods.map((mood) => <option key={mood} value={mood}>{mood}</option>)}</select></label><label>Intention<select value={intentionTag} onChange={(event) => setIntentionTag(event.target.value)}><option value="">No intention tag</option>{intentions.map((intention) => <option key={intention} value={intention}>{intention}</option>)}</select></label></div><div className="history-tools__actions"><button onClick={() => setEditingId(null)}>Cancel</button><button className="save" disabled={updateReflection.isPending} onClick={() => save(entry.id)}>Save reflection</button></div></> : <><p>{entry.note || "No personal note yet."}</p>{(entry.moodTag || entry.intentionTag) && <div className="reflection-tags">{entry.moodTag && <span>{entry.moodTag}</span>}{entry.intentionTag && <span>{entry.intentionTag}</span>}</div>}<div className="history-tools__actions"><button onClick={() => beginEditing(entry)}>{entry.note || entry.moodTag || entry.intentionTag ? "Edit reflection" : "Add reflection"}</button>{entry.note && <button className="delete" onClick={() => setPendingDelete(entry)}><Trash2 size={13} /> Delete note</button>}</div></>}</div></article>; })}</div> : <div className="history-tools__empty"><Clock3 size={19} /><span>No completed practices match these filters yet.</span></div>}</section></div>{pendingDelete && <div className="note-confirm-backdrop" role="presentation"><section className="note-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="note-delete-title"><button className="note-confirm-close" onClick={() => setPendingDelete(null)} aria-label="Cancel note deletion"><X size={17} /></button><div className="note-confirm-icon"><Trash2 size={20} /></div><p className="eyebrow">DELETE PRIVATE NOTE</p><h2 id="note-delete-title">Delete this reflection?</h2><p>This removes the note and its tags permanently. Your completed-practice record will remain.</p><div><button onClick={() => setPendingDelete(null)}>Keep note</button><button className="confirm-delete" disabled={updateReflection.isPending} onClick={confirmDelete}>{updateReflection.isPending ? "Deleting…" : "Delete note"}</button></div></section></div>}</section>;
}

