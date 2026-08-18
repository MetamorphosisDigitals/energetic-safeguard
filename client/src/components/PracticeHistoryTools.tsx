import { useMemo, useState } from "react";
import { Check, Clock3, Download, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { practices } from "@/data/practices";
import { filterPracticeHistoryNotes, summarizePracticeWeek, type PracticeHistoryNote } from "@/lib/practiceHistoryInsights";

export function PracticeHistoryTools() {
  const utils = trpc.useUtils();
  const history = trpc.library.history.useQuery({ limit: 50 }, { retry: false });
  const updateNote = trpc.library.updateHistoryNote.useMutation();
  const [keyword, setKeyword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PracticeHistoryNote | null>(null);
  const entries = (history.data ?? []) as PracticeHistoryNote[];
  const filtered = useMemo(() => filterPracticeHistoryNotes(entries, keyword, startDate, endDate), [entries, keyword, startDate, endDate]);
  const weekly = useMemo(() => summarizePracticeWeek(entries), [entries]);

  function save(entryId: number) {
    updateNote.mutate({ historyId: entryId, note: draft.trim() || null }, { onSuccess: () => { setEditingId(null); void utils.library.history.invalidate(); toast.success("Private note saved."); }, onError: () => toast.error("We could not save this note.") });
  }
  function confirmDelete() {
    if (!pendingDelete) return;
    updateNote.mutate({ historyId: pendingDelete.id, note: null }, { onSuccess: () => { setPendingDelete(null); void utils.library.history.invalidate(); toast.success("Private note deleted."); }, onError: () => toast.error("We could not delete this note.") });
  }
  function exportNotes() {
    const notes = filtered.filter((entry) => entry.note);
    if (!notes.length) { toast.message("There are no matching notes to export."); return; }
    const content = notes.map((entry) => `${practices.find((practice) => practice.id === entry.practiceId)?.displayName ?? "Practice"}\nCompleted: ${new Date(entry.completedAt).toLocaleDateString()}\n\n${entry.note}`).join("\n\n---\n\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    const link = document.createElement("a"); link.href = url; link.download = "energetic-safeguard-practice-notes.txt"; link.click(); URL.revokeObjectURL(url);
  }

  return <section className="history-tools"><div className="history-tools__card"><section className="weekly-summary"><div><p className="eyebrow">THIS WEEK</p><h2>Your practice rhythm</h2><p>{weekly.total ? `${weekly.total} completed practices across ${weekly.activeDays} active ${weekly.activeDays === 1 ? "day" : "days"}.` : "Your completed practices will begin to build a weekly rhythm here."}</p></div><div className="weekly-bars" aria-label="Practice completion count for the last seven days">{weekly.days.map((day) => <span key={day.date.toISOString()}><i style={{ height: `${Math.max(7, day.total * 28)}px` }} className={day.total ? "active" : ""} /><small>{day.date.toLocaleDateString(undefined, { weekday: "narrow" })}</small></span>)}</div></section><section className="notes-explorer"><div className="history-tools__heading"><div><p className="eyebrow">PERSONAL NOTES</p><h2>Search your reflections</h2></div><button className="history-export-button" onClick={exportNotes}><Download size={14} /> Export</button></div><div className="notes-filters"><label className="notes-search"><Search size={15} /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Search personal notes…" /></label><label>From<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>To<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div>{history.isLoading ? <p className="history-tools__status">Gathering your practice notes…</p> : filtered.length ? <div className="history-tools__list">{filtered.map((entry) => { const practice = practices.find((item) => item.id === entry.practiceId); return <article className="history-tools__item" key={entry.id}><div><b>{practice?.displayName ?? "Completed practice"}</b><small>Completed {new Date(entry.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</small>{editingId === entry.id ? <><textarea rows={3} value={draft} maxLength={1000} onChange={(event) => setDraft(event.target.value)} placeholder="A private note for yourself…" /><div className="history-tools__actions"><button onClick={() => setEditingId(null)}>Cancel</button><button className="save" disabled={updateNote.isPending} onClick={() => save(entry.id)}>Save note</button></div></> : <><p>{entry.note || "No personal note yet."}</p><div className="history-tools__actions"><button onClick={() => { setEditingId(entry.id); setDraft(entry.note ?? ""); }}>{entry.note ? "Edit note" : "Add note"}</button>{entry.note && <button className="delete" onClick={() => setPendingDelete(entry)}><Trash2 size={13} /> Delete</button>}</div></>}</div></article>; })}</div> : <div className="history-tools__empty"><Clock3 size={19} /><span>No completed practices match these filters yet.</span></div>}</section></div>{pendingDelete && <div className="note-confirm-backdrop" role="presentation"><section className="note-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="note-delete-title"><button className="note-confirm-close" onClick={() => setPendingDelete(null)} aria-label="Cancel note deletion"><X size={17} /></button><div className="note-confirm-icon"><Trash2 size={20} /></div><p className="eyebrow">DELETE PRIVATE NOTE</p><h2 id="note-delete-title">Delete this reflection?</h2><p>This removes the note permanently. Your completed-practice record will remain.</p><div><button onClick={() => setPendingDelete(null)}>Keep note</button><button className="confirm-delete" disabled={updateNote.isPending} onClick={confirmDelete}>{updateNote.isPending ? "Deleting…" : "Delete note"}</button></div></section></div>}</section>;
}
