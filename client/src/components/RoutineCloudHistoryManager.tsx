import { ArrowLeft, Check, Cloud, Pin, RotateCcw, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { findCanonicalRitual } from "@/data/canonicalRituals";

export type CloudRoutinePlan = {
  id: number;
  clientArchiveKey: string;
  selectedPracticeId: string;
  archivedAt: Date | string;
  importedAt: Date | string;
  completedDayKeys: string[];
  completionNotes: Record<string, string>;
  reflectionNote: string | null;
  label: string | null;
  pinned: boolean;
};

export function RoutineCloudHistoryManager({ plans, loading, onBack, onRestore, onOrganize, onDelete }: { plans: CloudRoutinePlan[]; loading: boolean; onBack: () => void; onRestore: (archiveId: number) => void; onOrganize: (input: { archiveId: number; label: string | null; pinned: boolean }) => void; onDelete: (archiveId: number) => void }) {
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [labelDrafts, setLabelDrafts] = useState<Record<number, string>>({});
  const visiblePlans = useMemo(() => plans.filter((plan) => {
    const ritual = findCanonicalRitual(plan.selectedPracticeId);
    const searchable = `${plan.label ?? ""} ${ritual?.displayName ?? ""}`.toLowerCase();
    return searchable.includes(search.trim().toLowerCase());
  }).sort((left, right) => Number(right.pinned) - Number(left.pinned) || Date.parse(String(right.archivedAt)) - Date.parse(String(left.archivedAt))), [plans, search]);

  return <main className="flow-screen routine-cloud-history-screen"><div className="flow-topline"><button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Home</button><span>YOUR ACCOUNT</span></div><section className="settings-card routine-cloud-history-card"><span className="routine-cloud-history-card__mark"><Cloud size={25} /></span><p className="eyebrow">ROUTINE HISTORY</p><h1>Completed plans in your account.</h1><p>These cloud copies are private to your signed-in account. Restore a plan to this device whenever you want a local copy again.</p><label className="routine-cloud-history-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search a ritual or plan label" /></label>{loading ? <p className="library-status">Gathering your cloud plan history…</p> : visiblePlans.length ? <div className="routine-cloud-history-list">{visiblePlans.map((plan) => { const ritual = findCanonicalRitual(plan.selectedPracticeId); const draft = labelDrafts[plan.id] ?? plan.label ?? ""; const deleting = confirmDeleteId === plan.id; return <article key={plan.id} className={`routine-cloud-history-item ${plan.pinned ? "is-pinned" : ""}`}><div className="routine-cloud-history-item__heading"><span><Cloud size={16} /></span><div><p className="eyebrow">{plan.pinned ? "PINNED PLAN" : new Date(plan.archivedAt).toLocaleDateString()}</p><b>{plan.label?.trim() || ritual?.displayName || "Daily hygiene ritual"}</b><small>{ritual?.displayName ?? plan.selectedPracticeId} · {plan.completedDayKeys.length} check-ins{plan.reflectionNote ? " · Reflection saved" : ""}</small></div><button className={`routine-cloud-history-item__pin ${plan.pinned ? "is-pinned" : ""}`} onClick={() => onOrganize({ archiveId: plan.id, label: plan.label, pinned: !plan.pinned })} aria-label={plan.pinned ? "Unpin this cloud plan" : "Pin this cloud plan"}><Pin size={15} fill={plan.pinned ? "currentColor" : "none"} /></button></div><label className="routine-cloud-history-item__label"><span>Plan label</span><input value={draft} maxLength={120} onChange={(event) => setLabelDrafts((current) => ({ ...current, [plan.id]: event.target.value }))} onBlur={() => { const next = draft.trim() || null; if (next !== plan.label) onOrganize({ archiveId: plan.id, label: next, pinned: plan.pinned }); }} placeholder="Optional label" /></label><div className="routine-cloud-history-item__actions"><button className="secondary-button" onClick={() => onRestore(plan.id)}><RotateCcw size={15} /> Restore to this device</button>{deleting ? <><button className="secondary-button" onClick={() => setConfirmDeleteId(null)}>Keep</button><button className="routine-cloud-history-item__delete-confirm" onClick={() => onDelete(plan.id)}><Trash2 size={14} /> Delete cloud copy</button></> : <button className="text-button routine-cloud-history-item__delete" onClick={() => setConfirmDeleteId(plan.id)}><Trash2 size={14} /> Delete</button>}</div>{deleting && <p className="routine-cloud-history-item__warning"><Check size={14} /> This removes only the cloud copy; any device copy remains untouched.</p>}</article>; })}</div> : <div className="library-empty"><Cloud size={20} /><p><b>No matching cloud plans</b><span>{plans.length ? "Try a different label or ritual name." : "Back up a completed plan from the home dashboard to manage it here."}</span></p></div>}</section></main>;
}
