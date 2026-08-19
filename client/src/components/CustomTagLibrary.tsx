import { useMemo, useState } from "react";
import { GitMerge, Pencil, Pin, Tag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export function CustomTagLibrary({ selectedTag, onSelectTag }: { selectedTag: string | "all"; onSelectTag: (tag: string | "all") => void }) {
  const utils = trpc.useUtils();
  const tags = trpc.library.customTags.useQuery(undefined, { retry: false });
  const pinnedTags = trpc.library.pinnedCustomTags.useQuery(undefined, { retry: false });
  const replaceTag = trpc.library.replaceCustomTag.useMutation();
  const setPinnedTags = trpc.library.setPinnedCustomTags.useMutation();
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [targetTag, setTargetTag] = useState("");
  const availableTags = tags.data ?? [];
  const pinned = pinnedTags.data ?? [];
  const orderedTags = useMemo(() => [...availableTags].sort((left, right) => { const leftPinned = pinned.some((tag) => tag.toLocaleLowerCase() === left.toLocaleLowerCase()); const rightPinned = pinned.some((tag) => tag.toLocaleLowerCase() === right.toLocaleLowerCase()); return Number(rightPinned) - Number(leftPinned) || left.localeCompare(right); }), [availableTags, pinned]);

  function refresh() { void utils.library.customTags.invalidate(); void utils.library.pinnedCustomTags.invalidate(); void utils.library.history.invalidate(); }
  function renameOrMerge() {
    if (!activeTag || !targetTag.trim()) return;
    replaceTag.mutate({ sourceTag: activeTag, targetTag: targetTag.trim() }, { onSuccess: () => { toast.success(targetTag.trim().toLocaleLowerCase() === activeTag.toLocaleLowerCase() ? "Tag updated." : "Tags merged."); onSelectTag("all"); setActiveTag(null); setTargetTag(""); refresh(); }, onError: () => toast.error("We could not update this tag.") });
  }
  function deleteTag(tag: string) {
    if (!window.confirm(`Delete “${tag}” from every private reflection? This cannot be undone.`)) return;
    replaceTag.mutate({ sourceTag: tag, targetTag: null }, { onSuccess: () => { toast.success("Custom tag deleted."); if (selectedTag === tag) onSelectTag("all"); refresh(); }, onError: () => toast.error("We could not delete this tag.") });
  }
  function togglePin(tag: string) {
    const alreadyPinned = pinned.some((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase());
    const next = alreadyPinned ? pinned.filter((item) => item.toLocaleLowerCase() !== tag.toLocaleLowerCase()) : [...pinned, tag];
    setPinnedTags.mutate({ tags: next }, { onSuccess: () => { toast.success(alreadyPinned ? "Tag unpinned." : "Tag pinned to the top."); refresh(); }, onError: () => toast.error("We could not update pinned tags.") });
  }

  return <section className="custom-tag-library"><div><p className="eyebrow">CUSTOM TAG LIBRARY</p><h2>Organize your reflections</h2><p>Pin your most-used tags, then rename, merge, or remove them across your private notes.</p></div>{pinned.length ? <div className="custom-tag-library__pinned"><span><Pin size={12} /> Pinned</span>{pinned.map((tag) => <button key={tag} className={selectedTag === tag ? "active" : ""} onClick={() => onSelectTag(tag)}>{tag}</button>)}</div> : null}<div className="custom-tag-library__filters"><button className={selectedTag === "all" ? "active" : ""} onClick={() => onSelectTag("all")}>All tags</button>{orderedTags.map((tag) => <button key={tag} className={selectedTag === tag ? "active" : ""} onClick={() => onSelectTag(tag)}><Tag size={12} /> {tag}</button>)}</div>{orderedTags.length ? <div className="custom-tag-library__list">{orderedTags.map((tag) => { const isPinned = pinned.some((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase()); return <article key={tag} className={isPinned ? "pinned" : ""}><span>{isPinned && <Pin size={13} fill="currentColor" />}<Tag size={14} /> {tag}</span><div><button className={isPinned ? "pin-active" : ""} onClick={() => togglePin(tag)} aria-label={`${isPinned ? "Unpin" : "Pin"} ${tag}`}><Pin size={13} fill={isPinned ? "currentColor" : "none"} /></button><button onClick={() => { setActiveTag(tag); setTargetTag(tag); }} aria-label={`Edit or merge ${tag}`}><Pencil size={13} /></button><button onClick={() => deleteTag(tag)} aria-label={`Delete ${tag}`}><Trash2 size={13} /></button></div></article>; })}</div> : <p className="custom-tag-library__empty">Custom tags you add to reflections will appear here.</p>}{activeTag && <div className="tag-library-dialog-backdrop"><section className="tag-library-dialog" role="dialog" aria-modal="true" aria-labelledby="tag-library-title"><button className="tag-library-dialog__close" onClick={() => setActiveTag(null)} aria-label="Close tag editor"><X size={17} /></button><p className="eyebrow">EDIT OR MERGE TAG</p><h2 id="tag-library-title">{activeTag}</h2><p>Enter a new name to edit this tag, or use an existing tag name to merge them.</p><input value={targetTag} maxLength={32} onChange={(event) => setTargetTag(event.target.value)} placeholder="New or existing tag name" /><div><button onClick={() => setActiveTag(null)}>Cancel</button><button className="tag-library-dialog__save" disabled={replaceTag.isPending} onClick={renameOrMerge}><GitMerge size={14} /> Save changes</button></div></section></div>}</section>;
}
