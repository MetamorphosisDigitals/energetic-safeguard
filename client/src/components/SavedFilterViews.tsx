import { useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export type HistoryFilterValues = { keyword: string; customTag: string | "all"; startDate: string; endDate: string };

export function SavedFilterViews({ values, onApply }: { values: HistoryFilterValues; onApply: (values: HistoryFilterValues) => void }) {
  const utils = trpc.useUtils();
  const views = trpc.library.savedFilterViews.useQuery(undefined, { retry: false });
  const saveView = trpc.library.saveFilterView.useMutation();
  const deleteView = trpc.library.deleteFilterView.useMutation();
  const [name, setName] = useState("");
  function refresh() { void utils.library.savedFilterViews.invalidate(); }
  function saveCurrentView() {
    if (!name.trim()) { toast.message("Name this filter view first."); return; }
    saveView.mutate({ name: name.trim(), keyword: values.keyword.trim() || null, customTag: values.customTag === "all" ? null : values.customTag, startDate: values.startDate || null, endDate: values.endDate || null }, { onSuccess: () => { setName(""); refresh(); toast.success("Filter view saved."); }, onError: () => toast.error("We could not save this filter view.") });
  }
  return <section className="saved-filter-views"><div><p className="eyebrow">SAVED FILTER VIEWS</p><h2>Return to a reflection set</h2></div><div className="saved-filter-views__save"><input value={name} maxLength={64} onChange={(event) => setName(event.target.value)} placeholder="Name this view, e.g. Workday notes" /><button onClick={saveCurrentView} disabled={saveView.isPending}><Bookmark size={13} /> Save current</button></div>{views.data?.length ? <div className="saved-filter-views__list">{views.data.map((view) => <article key={view.id}><button onClick={() => onApply({ keyword: view.keyword ?? "", customTag: view.customTag ?? "all", startDate: view.startDate ?? "", endDate: view.endDate ?? "" })}><b>{view.name}</b><small>{[view.keyword && `“${view.keyword}”`, view.customTag, view.startDate && `from ${view.startDate}`, view.endDate && `to ${view.endDate}`].filter(Boolean).join(" · ") || "All reflections"}</small></button><button className="saved-filter-views__delete" onClick={() => deleteView.mutate({ viewId: view.id }, { onSuccess: () => { refresh(); toast.success("Filter view deleted."); }, onError: () => toast.error("We could not delete this filter view.") })} aria-label={`Delete ${view.name}`}><Trash2 size={14} /></button></article>)}</div> : <p className="saved-filter-views__empty">Save a useful combination of keyword, tag, and date filters for quick access.</p>}</section>;
}

