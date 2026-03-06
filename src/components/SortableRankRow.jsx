import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { C } from "../constants/colours";

export default function SortableRankRow({ id, idx, totalCount, p, onRemove, onUp, onDown }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} className="rank-row"
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      <div {...listeners} {...attributes}
        style={{ cursor: "grab", padding: "0 6px 0 0", color: C.mahogany, fontSize: 18, touchAction: "none", userSelect: "none" }}>
        ⠿
      </div>
      <div className={`rank-badge rank-${idx}`}>#{idx + 1}</div>
      {p.photoUrl
        ? <img src={p.photoUrl} alt={p.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
        : <span className="rank-emoji">🏺</span>}
      <div className="rank-info">
        <div className="rank-name">{p.name}</div>
        <div className="rank-sub">{p.maker} · {p.clay} · {p.method}</div>
      </div>
      <div className="rank-actions">
        <button className="rank-btn" disabled={idx === 0} onClick={() => onUp?.()}>↑</button>
        <button className="rank-btn" disabled={idx === totalCount - 1} onClick={() => onDown?.()}>↓</button>
        <button className="rank-btn remove" onClick={onRemove}>✕</button>
      </div>
    </div>
  );
}
