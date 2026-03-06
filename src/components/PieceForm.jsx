import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import CameraCapture from "./CameraCapture";

const PieceForm = forwardRef(function PieceForm({ label, typeLabel, typeColor, storageKey }, ref) {
  const saved = storageKey ? JSON.parse(localStorage.getItem(storageKey) || "{}") : {};

  const [photoFile, setPhotoFile] = useState(null);
  const [photoUrl,  setPhotoUrl]  = useState(null);
  const [name,        setName]        = useState(saved.name        ?? "");
  const [clayBody,    setClayBody]    = useState(saved.clayBody    ?? "");
  const [method,      setMethod]      = useState(saved.method      ?? "");
  const [glaze,       setGlaze]       = useState(saved.glaze       ?? "");
  const [description, setDescription] = useState(saved.description ?? "");

  // Persist text fields to localStorage on every change
  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify({ name, clayBody, method, glaze, description }));
  }, [storageKey, name, clayBody, method, glaze, description]);

  useImperativeHandle(ref, () => ({
    getValue: () => ({ photoFile, name, clayBody, method, glaze, description }),
    clearDraft: () => { if (storageKey) localStorage.removeItem(storageKey); },
  }));

  return (
    <div className="piece-section">
      <div className="piece-label">
        {label}
        <span className="piece-type-pill" style={{ background: typeColor + "22", color: typeColor }}>
          {typeLabel}
        </span>
      </div>
      <CameraCapture
        label={`${label} Photo`}
        existingUrl={photoUrl}
        onCapture={(file, url) => { setPhotoFile(file); setPhotoUrl(url); }}
        onClear={() => { setPhotoFile(null); setPhotoUrl(null); }}
      />
      <div className="form-field">
        <label className="form-label">Piece Name</label>
        <input className="form-input" placeholder="e.g. Celadon Yunomi Cup"
          value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="form-row">
        <div className="form-field" style={{marginBottom:0}}>
          <label className="form-label">Clay Body</label>
          <input className="form-input" placeholder="e.g. Stoneware"
            value={clayBody} onChange={e => setClayBody(e.target.value)} />
        </div>
        <div className="form-field" style={{marginBottom:0}}>
          <label className="form-label">Method</label>
          <select className="form-input" value={method} onChange={e => setMethod(e.target.value)}>
            <option value="">Select…</option>
            <option value="wheel-thrown">Wheel-thrown</option>
            <option value="hand-built">Hand-built</option>
          </select>
        </div>
      </div>
      <div className="form-field" style={{marginTop:10}}>
        <label className="form-label">Glaze / Technique</label>
        <input className="form-input" placeholder="e.g. Soda-fired, cone 10"
          value={glaze} onChange={e => setGlaze(e.target.value)} />
      </div>
      <div className="form-field">
        <label className="form-label">Description</label>
        <textarea className="form-input form-textarea" placeholder="Tell us about this piece…"
          value={description} onChange={e => setDescription(e.target.value)} />
      </div>
    </div>
  );
});

export default PieceForm;
