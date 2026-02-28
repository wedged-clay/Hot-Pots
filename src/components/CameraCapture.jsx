// ============================================================
// CameraCapture.jsx — Hot—Pots pottery photo component
// src/components/CameraCapture.jsx
//
// Features:
//   - Live camera viewfinder (rear camera preferred)
//   - Front/rear camera toggle
//   - Tap-to-capture with countdown option
//   - Photo review with retake / confirm
//   - Automatic fallback to file upload if camera unavailable
//   - Image compression before upload (keeps Supabase Storage lean)
//
// Usage:
//   <CameraCapture
//     onCapture={(file, previewUrl) => handlePhoto(file, previewUrl)}
//     onClear={() => handleClearPhoto()}
//     existingUrl={piece.photoUrl}   // optional — show existing photo
//     label="Piece 1 Photo"
//   />
// ============================================================

import { useState, useRef, useEffect, useCallback } from "react";

// Max dimension for compressed image (px). Keeps uploads under ~300KB.
const MAX_DIMENSION = 1200;
const JPEG_QUALITY  = 0.82;

const styles = `
  .cam-wrap {
    width: 100%;
    margin-bottom: 14px;
  }

  /* ── Idle / empty state ── */
  .cam-trigger {
    width: 100%; height: 160px;
    border: 2px dashed #D9770660; border-radius: 16px;
    background: #FEF3C7;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 8px; cursor: pointer;
    transition: all 0.2s;
    position: relative; overflow: hidden;
  }
  .cam-trigger:hover { border-color: #E8450A; background: #E8450A08; }
  .cam-trigger-icon { font-size: 32px; }
  .cam-trigger-label { font-size: 13px; font-weight: 600; color: #44200A; }
  .cam-trigger-sub   { font-size: 11px; color: #92400E; }

  /* ── Viewfinder ── */
  .cam-modal-backdrop {
    position: fixed; inset: 0;
    background: #000; z-index: 1000;
    display: flex; flex-direction: column;
  }
  .cam-video-wrap {
    flex: 1; position: relative; overflow: hidden;
  }
  .cam-video {
    width: 100%; height: 100%;
    object-fit: cover;
    transform: scaleX(var(--mirror, 1)); /* mirror front camera */
  }
  /* Viewfinder overlay guides */
  .cam-overlay {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    pointer-events: none;
  }
  .cam-guide {
    width: 72%; aspect-ratio: 1;
    border: 2px solid rgba(255,255,255,0.45);
    border-radius: 20px;
    box-shadow: 0 0 0 9999px rgba(0,0,0,0.3);
  }
  /* Corner accent lines */
  .cam-guide::before, .cam-guide::after {
    content: '';
    position: absolute;
    width: 24px; height: 24px;
    border-color: #E8450A; border-style: solid;
  }
  .cam-guide::before {
    top: -2px; left: -2px;
    border-width: 3px 0 0 3px; border-radius: 4px 0 0 0;
  }
  .cam-guide::after {
    bottom: -2px; right: -2px;
    border-width: 0 3px 3px 0; border-radius: 0 0 4px 0;
  }

  .cam-label-overlay {
    position: absolute; top: 20px; left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.55); color: white;
    font-size: 13px; font-weight: 500; padding: 5px 16px;
    border-radius: 20px; backdrop-filter: blur(4px);
    white-space: nowrap;
  }

  /* Controls bar at bottom */
  .cam-controls {
    padding: 24px 32px 44px;
    display: flex; align-items: center; justify-content: space-between;
    background: linear-gradient(to top, rgba(0,0,0,0.85), transparent 100%);
    position: absolute; bottom: 0; left: 0; right: 0;
  }
  .cam-btn-round {
    width: 48px; height: 48px; border-radius: 50%;
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; transition: all 0.18s;
    -webkit-tap-highlight-color: transparent;
  }
  .cam-btn-cancel {
    background: rgba(255,255,255,0.18);
    color: white; font-size: 14px; font-weight: 500;
  }
  .cam-btn-cancel:hover { background: rgba(255,255,255,0.28); }

  .cam-shutter {
    width: 72px; height: 72px; border-radius: 50%;
    background: white; border: 5px solid rgba(255,255,255,0.4);
    cursor: pointer; transition: all 0.12s;
    -webkit-tap-highlight-color: transparent;
    position: relative;
  }
  .cam-shutter::after {
    content: '';
    position: absolute; inset: 4px;
    border-radius: 50%; background: white;
    transition: all 0.12s;
  }
  .cam-shutter:active { transform: scale(0.92); }
  .cam-shutter:active::after { background: #E8450A; }

  .cam-btn-flip {
    background: rgba(255,255,255,0.18); color: white;
  }
  .cam-btn-flip:hover { background: rgba(255,255,255,0.28); }

  /* Flash animation on capture */
  .cam-flash {
    position: absolute; inset: 0;
    background: white; opacity: 0;
    pointer-events: none; z-index: 10;
    animation: camFlash 0.25s ease-out forwards;
  }
  @keyframes camFlash {
    0%   { opacity: 0.85; }
    100% { opacity: 0; }
  }

  /* ── Review screen ── */
  .cam-review {
    position: fixed; inset: 0;
    background: #000; z-index: 1000;
    display: flex; flex-direction: column;
  }
  .cam-preview-img {
    flex: 1; object-fit: contain; width: 100%;
  }
  .cam-review-controls {
    padding: 20px 24px 44px;
    display: flex; gap: 12px;
    background: rgba(0,0,0,0.85);
  }
  .cam-review-btn {
    flex: 1; padding: 14px; border-radius: 14px;
    font-size: 14px; font-weight: 600; cursor: pointer;
    border: none; transition: all 0.18s;
  }
  .cam-review-retake {
    background: rgba(255,255,255,0.12); color: white;
  }
  .cam-review-retake:hover { background: rgba(255,255,255,0.22); }
  .cam-review-use {
    background: linear-gradient(135deg, #E8450A, #D4380D);
    color: white; box-shadow: 0 4px 14px #E8450A55;
  }
  .cam-review-use:hover { transform: translateY(-1px); }

  /* ── Captured thumbnail (confirmed state) ── */
  .cam-confirmed {
    width: 100%; height: 160px; border-radius: 16px;
    position: relative; overflow: hidden;
    border: 2px solid #E8450A44;
  }
  .cam-confirmed img {
    width: 100%; height: 100%; object-fit: cover;
  }
  .cam-confirmed-bar {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.72), transparent);
    padding: 10px 12px 8px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .cam-confirmed-label {
    color: white; font-size: 12px; font-weight: 500;
  }
  .cam-confirmed-clear {
    background: rgba(255,255,255,0.2); color: white;
    border: none; border-radius: 8px;
    padding: 4px 10px; font-size: 11px; font-weight: 600;
    cursor: pointer; backdrop-filter: blur(4px);
    transition: background 0.15s;
  }
  .cam-confirmed-clear:hover { background: rgba(255,255,255,0.35); }

  /* ── Error state ── */
  .cam-error {
    background: #FDE8D8; border: 1.5px solid #E8450A44;
    border-radius: 14px; padding: 14px 16px;
    display: flex; gap: 10px; align-items: flex-start;
    margin-bottom: 10px;
  }
  .cam-error-icon { font-size: 18px; flex-shrink: 0; }
  .cam-error-text { font-size: 12px; color: #C1440E; line-height: 1.55; }

  /* Hidden file input */
  .cam-file-input { display: none; }
`;

// ── Image compression helper ──────────────────────────────────
async function compressImage(source) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          const file = new File([blob], "pottery-photo.jpg", { type: "image/jpeg" });
          const url  = URL.createObjectURL(blob);
          resolve({ file, url });
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };
    if (typeof source === "string") {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.readAsDataURL(source);
    }
  });
}

// ── Main component ────────────────────────────────────────────
export default function CameraCapture({ onCapture, onClear, existingUrl, label = "Photo" }) {
  const [phase, setPhase]           = useState(existingUrl ? "confirmed" : "idle");
  // phases: idle | viewfinder | review | confirmed | error
  const [previewUrl, setPreviewUrl] = useState(existingUrl || null);
  const [facingMode, setFacingMode] = useState("environment"); // rear camera default
  const [flash, setFlash]           = useState(false);
  const [errorMsg, setErrorMsg]     = useState("");
  const [cameraAvailable, setCameraAvailable] = useState(true);

  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const canvasRef   = useRef(document.createElement("canvas"));
  const fileInputRef = useRef(null);

  // ── Start camera ─────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setErrorMsg("");
    // Check API availability
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraAvailable(false);
      // Fall straight through to file picker
      fileInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width:  { ideal: 1920 },
          height: { ideal: 1920 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setPhase("viewfinder");
    } catch (err) {
      console.error("[Camera]", err.name, err.message);
      if (err.name === "NotAllowedError") {
        setErrorMsg("Camera permission denied. Please allow camera access in your browser settings, or use the file picker below.");
      } else if (err.name === "NotFoundError") {
        setErrorMsg("No camera found on this device.");
      } else {
        setErrorMsg("Could not start the camera. You can upload a photo instead.");
      }
      setCameraAvailable(false);
      setPhase("error");
    }
  }, [facingMode]);

  // Attach stream to video element when entering viewfinder
  useEffect(() => {
    if (phase === "viewfinder" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [phase]);

  // ── Stop camera ──────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Stop stream when unmounted
  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Flip camera ──────────────────────────────────────────────
  const flipCamera = useCallback(async () => {
    stopCamera();
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: next, width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("[Camera flip]", err);
    }
  }, [facingMode, stopCamera]);

  // ── Capture frame ────────────────────────────────────────────
  const capture = useCallback(async () => {
    if (!videoRef.current) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 300);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    // Mirror front camera horizontally (matches preview)
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    stopCamera();

    const { file, url } = await compressImage(dataUrl);
    setPreviewUrl(url);
    setPhase("review");

    // Keep compressed file ready for review confirmation
    canvasRef._pendingFile = file;
    canvasRef._pendingUrl  = url;
  }, [facingMode, stopCamera]);

  // ── Confirm captured photo ────────────────────────────────────
  const confirmPhoto = useCallback(() => {
    setPhase("confirmed");
    onCapture?.(canvasRef._pendingFile, canvasRef._pendingUrl);
  }, [onCapture]);

  // ── Retake ───────────────────────────────────────────────────
  const retake = useCallback(() => {
    setPreviewUrl(null);
    startCamera();
  }, [startCamera]);

  // ── Clear / reset ────────────────────────────────────────────
  const clear = useCallback(() => {
    setPreviewUrl(null);
    setPhase("idle");
    setCameraAvailable(true);
    setErrorMsg("");
    onClear?.();
  }, [onClear]);

  // ── File upload fallback ──────────────────────────────────────
  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file: compressed, url } = await compressImage(file);
    canvasRef._pendingFile = compressed;
    canvasRef._pendingUrl  = url;
    setPreviewUrl(url);
    setPhase("review");
    // Reset input so same file can be re-selected
    e.target.value = "";
  }, []);

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>

      {/* Hidden file input — always in DOM for fallback */}
      <input
        ref={fileInputRef}
        className="cam-file-input"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />

      <div className="cam-wrap">

        {/* ── IDLE ── */}
        {phase === "idle" && (
          <div className="cam-trigger" onClick={startCamera}>
            <span className="cam-trigger-icon">📷</span>
            <span className="cam-trigger-label">Add {label}</span>
            <span className="cam-trigger-sub">Tap to take a photo</span>
          </div>
        )}

        {/* ── ERROR — fallback to file upload ── */}
        {phase === "error" && (
          <>
            <div className="cam-error">
              <span className="cam-error-icon">⚠️</span>
              <div className="cam-error-text">{errorMsg}</div>
            </div>
            <div
              className="cam-trigger"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="cam-trigger-icon">🖼️</span>
              <span className="cam-trigger-label">Upload from Library</span>
              <span className="cam-trigger-sub">Choose a photo from your device</span>
            </div>
          </>
        )}

        {/* ── CONFIRMED thumbnail ── */}
        {phase === "confirmed" && previewUrl && (
          <div className="cam-confirmed">
            <img src={previewUrl} alt={label} />
            <div className="cam-confirmed-bar">
              <span className="cam-confirmed-label">📷 {label}</span>
              <button className="cam-confirmed-clear" onClick={clear}>
                Retake
              </button>
            </div>
          </div>
        )}

        {/* ── VIEWFINDER (full-screen modal) ── */}
        {phase === "viewfinder" && (
          <div className="cam-modal-backdrop">
            <div className="cam-video-wrap">
              <video
                ref={videoRef}
                className="cam-video"
                style={{ "--mirror": facingMode === "user" ? -1 : 1 }}
                autoPlay
                playsInline
                muted
              />
              {flash && <div className="cam-flash" />}
              <div className="cam-overlay">
                <div className="cam-guide" />
              </div>
              <div className="cam-label-overlay">{label}</div>
            </div>

            <div className="cam-controls">
              {/* Cancel */}
              <button
                className="cam-btn-round cam-btn-cancel"
                onClick={() => { stopCamera(); setPhase("idle"); }}
              >
                ✕
              </button>

              {/* Shutter */}
              <button className="cam-shutter" onClick={capture} aria-label="Take photo" />

              {/* Flip camera */}
              <button
                className="cam-btn-round cam-btn-flip"
                onClick={flipCamera}
                aria-label="Flip camera"
              >
                🔄
              </button>
            </div>
          </div>
        )}

        {/* ── REVIEW ── */}
        {phase === "review" && previewUrl && (
          <div className="cam-review">
            <img src={previewUrl} alt="Preview" className="cam-preview-img" />
            <div className="cam-review-controls">
              <button className="cam-review-btn cam-review-retake" onClick={retake}>
                ↩ Retake
              </button>
              <button className="cam-review-btn cam-review-use" onClick={confirmPhoto}>
                Use Photo ✓
              </button>
            </div>
          </div>
        )}

        {/* Upload from library link — shown in idle state as secondary option */}
        {phase === "idle" && (
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: "#92400E", marginTop: 6,
              textDecoration: "underline", textUnderlineOffset: 2,
              display: "block", width: "100%", textAlign: "center",
            }}
          >
            or upload from library
          </button>
        )}
      </div>
    </>
  );
}
