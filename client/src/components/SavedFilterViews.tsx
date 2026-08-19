import { useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export type HistoryFilterValues = { keyword: string; customTag: string | "all"; startDate: string; endDate: string };

export function SavedFilterViews({ values, onApply }: { values: HistoryFilterValues; onApply: (values: HistoryFilterValues) => void }) {
  const utils = trpc.useUtils();
  const views = trpc.library.savedFilterViews.useQuery(undefined, { retry: false });
  const defaultView = trpc.library.defaultFilterView.useQuery(undefined, { retry: false });
  const saveView = trpc.library.saveFilterView.useMutation();
  const deleteView = trpc.library.deleteFilterView.useMutation();
  const setDefaultView = trpc.library.setDefaultFilterView.useMutation();
  const [name, setName] = useState("");
  const hasAppliedDefault = useRef(false);
  useEffect(() => {
    if (hasAppliedDefault.current || defaultView.isLoading) return;
    if (defaultView.data) onApply({ keyword: defaultView.data.keyword ?? "", customTag: defaultView.data.customTag ?? "all", startDate: defaultView.data.startDate ?? "", endDate: defaultView.data.endDate ?? "" });
    hasAppliedDefault.current = true;
  }, [defaultView.data, defaultView.isLoading, onApply]);
  function refresh() { void utils.library.savedFilterViews.invalidate(); void utils.library.defaultFilterView.invalidate(); }
  function saveCurrentView() {
    if (!name.trim()) { toast.message("Name this filter view first."); return; }
    saveView.mutate({ name: name.trim(), keyword: values.keyword.trim() || null, customTag: values.customTag === "all" ? null : values.customTag, startDate: values.startDate || null, endDate: values.endDate || null }, { onSuccess: () => { setName(""); refresh(); toast.success("Filter view saved."); }, onError: () => toast.error("We could not save this filter view.") });
  }
  function updateDefault(viewId: number | null) { setDefaultView.mutate({ viewId }, { onSuccess: () => { refresh(); toast.success(viewId ? "Default landing view updated." : "Default landing view cleared."); }, onError: () => toast.error("We could not update the default view.") }); }
  return <section className="saved-filter-views"><div><p className="eyebrow">SAVED FILTER VIEWS</p><h2>Return to a reflection set</h2></div><div className="saved-filter-views__save"><input value={name} maxLength={64} onChange={(event) => setName(event.target.value)} placeholder="Name this view, e.g. Workday notes" /><button onClick={saveCurrentView} disabled={saveView.isPending}><Bookmark size={13} /> Save current</button></div>{defaultView.data && <div className="saved-filter-views__default"><span><BookmarkCheck size={13} /> Default: <b>{defaultView.data.name}</b></span><button onClick={() => updateDefault(null)} aria-label="Clear default landing view"><X size={13} /> Clear</button></div>}{views.data?.length ? <div className="saved-filter-views__list">{views.data.map((view) => { const isDefault = defaultView.data?.id === view.id; return <article key={view.id}><button onClick={() => onApply({ keyword: view.keyword ?? "", customTag: view.customTag ?? "all", startDate: view.startDate ?? "", endDate: view.endDate ?? "" })}><b>{view.name}{isDefault && " · Default"}</b><small>{[view.keyword && `“${view.keyword}”`, view.customTag, view.startDate && `from ${view.startDate}`, view.endDate && `to ${view.endDate}`].filter(Boolean).join(" · ") || "All reflections"}</small></button><div className="saved-filter-views__actions"><button className={isDefault ? "is-default" : ""} onClick={() => updateDefault(isDefault ? null : view.id)} aria-label={`${isDefault ? "Clear" : "Set"} ${view.name} as default landing view`}><BookmarkCheck size={13} /></button><button className="saved-filter-views__delete" onClick={() => deleteView.mutate({ viewId: view.id }, { onSuccess: () => { refresh(); toast.success("Filter view deleted."); }, onError: () => toast.error("We could not delete this filter view.") })} aria-label={`Delete ${view.name}`}><Trash2 size={14} /></button></div></article>; })}</div> : <p className="saved-filter-views__empty">Save a useful combination of keyword, tag, and date filters for quick access.</p>}</section>;
}
