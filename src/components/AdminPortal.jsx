// ============================================================
// AdminPortal.jsx — Hot—Pots Admin Portal
// src/components/AdminPortal.jsx
//
// A hidden tab rendered only when currentUser.role === 'admin'
// or currentUser.role === 'helper'.
//
// Helpers can: view stats, view matches, view members
// Admins can:  everything + open/close rounds, trigger matching,
//              manually pair, change member roles, suspend members
//
// INTEGRATION — in pottery-swap.jsx HotPotsApp():
//   1. Import this component
//   2. Add role to mockUser: { name, initials, role: "admin" }
//   3. Add admin tab conditionally (see bottom of this file)
//   4. Render <AdminPortal role={mockUser.role} /> when tab === "admin"
// ============================================================

import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";

// ── Shared colours (mirrors main app) ────────────────────────
const C = {
  ember:    "#E8450A",
  kiln:     "#D4380D",
  ochre:    "#D97706",
  mahogany: "#7C2D12",
  bark:     "#44200A",
  parchment:"#FDF0E0",
  sand:     "#FEF3C7",
  blush:    "#FDE8D8",
};

// ── Helpers ───────────────────────────────────────────────────
function toInitials(name) {
  return (name ?? "?").split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

// ── Styles ────────────────────────────────────────────────────
const adminStyles = `
  .adm-wrap { padding: 0 0 80px; }

  /* Section nav */
  .adm-subnav {
    display: flex; gap: 6px; padding: 14px 16px 0; overflow-x: auto;
    scrollbar-width: none; position: sticky; top: 0; z-index: 50;
    background: ${C.parchment};
  }
  .adm-subnav::-webkit-scrollbar { display: none; }
  .adm-subbtn {
    flex-shrink: 0; padding: 7px 14px; border-radius: 20px;
    border: 1.5px solid #D9770640; background: white;
    font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500;
    color: #92400E; cursor: pointer; transition: all 0.18s;
    white-space: nowrap;
  }
  .adm-subbtn.active {
    background: ${C.ember}; border-color: ${C.ember};
    color: white; font-weight: 600;
  }
  .adm-subbtn:hover:not(.active) { border-color: ${C.ember}; color: ${C.ember}; }

  .adm-section { padding: 18px 16px 0; }

  /* Page heading */
  .adm-heading {
    font-family: 'Playfair Display', serif;
    font-size: 20px; font-weight: 700; color: ${C.bark};
    margin-bottom: 4px;
  }
  .adm-subheading { font-size: 12px; color: #92400E; margin-bottom: 18px; }

  /* Role badge */
  .role-pill {
    display: inline-block; padding: 2px 9px; border-radius: 20px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase;
  }
  .role-admin   { background: ${C.ember}22; color: ${C.ember}; }
  .role-helper  { background: ${C.ochre}22; color: ${C.ochre}; }
  .role-member  { background: #D9770620;    color: #92400E;    }

  .status-pill {
    display: inline-block; padding: 2px 9px; border-radius: 20px;
    font-size: 10px; font-weight: 600;
  }
  .status-active    { background: #dcfce7; color: #16a34a; }
  .status-pending   { background: ${C.sand}; color: ${C.ochre}; }
  .status-suspended { background: #fee2e2; color: #dc2626; }
  .status-open      { background: #dcfce7; color: #16a34a; }
  .status-complete  { background: #e0e7ff; color: #4338ca; }
  .status-matched   { background: #dcfce7; color: #16a34a; }
  .status-unmatched { background: #fee2e2; color: #dc2626; }
  .status-matching  { background: ${C.sand}; color: ${C.ochre}; }

  /* Cards */
  .adm-card {
    background: white; border-radius: 16px;
    border: 1px solid #D9770628; padding: 16px;
    margin-bottom: 12px;
  }
  .adm-card-row {
    display: flex; align-items: flex-start;
    justify-content: space-between; gap: 10px;
  }
  .adm-card-title {
    font-family: 'Playfair Display', serif;
    font-size: 15px; font-weight: 700; color: ${C.bark}; margin-bottom: 4px;
  }
  .adm-card-meta {
    font-size: 11px; color: #92400E; line-height: 1.5;
  }
  .adm-card-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px; }

  /* Stat grid */
  .stat-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px;
  }
  .stat-cell {
    background: white; border-radius: 14px;
    border: 1px solid #D9770628; padding: 14px 12px;
    text-align: center;
  }
  .stat-value {
    font-family: 'Playfair Display', serif;
    font-size: 28px; font-weight: 700; color: ${C.ember};
    line-height: 1; margin-bottom: 4px;
  }
  .stat-label { font-size: 11px; color: #92400E; }

  /* Bar chart */
  .bar-chart {
    background: white; border-radius: 16px;
    border: 1px solid #D9770628; padding: 16px; margin-bottom: 12px;
  }
  .bar-chart-title {
    font-size: 13px; font-weight: 600; color: ${C.bark}; margin-bottom: 14px;
  }
  .bar-row {
    display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
  }
  .bar-label { font-size: 11px; color: #92400E; width: 32px; text-align: right; flex-shrink: 0; }
  .bar-track { flex: 1; height: 10px; background: #FEF3C7; border-radius: 5px; overflow: hidden; }
  .bar-fill  { height: 100%; border-radius: 5px; background: linear-gradient(90deg, ${C.ember}, ${C.ochre}); transition: width 0.6s ease; }
  .bar-val   { font-size: 11px; color: #92400E; width: 28px; flex-shrink: 0; }

  /* Member row */
  .member-row {
    background: white; border-radius: 14px;
    border: 1px solid #D9770628; padding: 13px 14px;
    margin-bottom: 8px; display: flex; align-items: center; gap: 12px;
  }
  .member-avatar {
    width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, ${C.ember}, ${C.mahogany});
    color: white; font-size: 13px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .member-name  { font-size: 13px; font-weight: 600; color: ${C.bark}; }
  .member-email { font-size: 11px; color: #92400E; }
  .member-pills { display: flex; gap: 5px; margin-top: 3px; flex-wrap: wrap; }
  .member-actions { display: flex; gap: 6px; flex-shrink: 0; }

  /* Buttons */
  .btn-sm {
    padding: 6px 12px; border-radius: 10px; font-size: 12px; font-weight: 600;
    cursor: pointer; border: none; font-family: 'DM Sans', sans-serif;
    transition: all 0.15s;
  }
  .btn-primary-sm {
    background: linear-gradient(135deg, ${C.ember}, ${C.kiln});
    color: white; box-shadow: 0 2px 8px ${C.ember}44;
  }
  .btn-primary-sm:hover { transform: translateY(-1px); }
  .btn-ghost-sm {
    background: white; color: ${C.ember};
    border: 1.5px solid ${C.ember}60;
  }
  .btn-ghost-sm:hover { background: ${C.ember}0a; }
  .btn-danger-sm {
    background: #fee2e2; color: #dc2626; border: 1.5px solid #fca5a5;
  }
  .btn-danger-sm:hover { background: #fecaca; }
  .btn-success-sm {
    background: #dcfce7; color: #16a34a; border: 1.5px solid #86efac;
  }
  .btn-neutral-sm {
    background: #f1f5f9; color: #64748b; border: 1.5px solid #e2e8f0;
  }

  /* Match card */
  .match-card {
    background: white; border-radius: 14px;
    border: 1px solid #D9770628; padding: 13px 14px; margin-bottom: 8px;
  }
  .match-type-pill {
    display: inline-block; padding: 2px 8px; border-radius: 10px;
    font-size: 10px; font-weight: 700; margin-bottom: 8px;
  }
  .match-random { background: ${C.ember}18; color: ${C.ember}; }
  .match-choice { background: ${C.ochre}22; color: ${C.ochre}; }
  .match-vs {
    display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
  }
  .match-side { flex: 1; }
  .match-user { font-size: 12px; font-weight: 600; color: ${C.bark}; }
  .match-piece { font-size: 11px; color: #92400E; }
  .match-arrow { font-size: 16px; color: #D9770680; flex-shrink: 0; }

  /* Round phase stepper */
  .phase-stepper {
    display: flex; align-items: center; gap: 0; margin: 12px 0;
  }
  .phase-step {
    flex: 1; text-align: center; font-size: 10px; font-weight: 600;
    padding: 6px 4px; border-radius: 0;
    background: #f1f5f9; color: #94a3b8; position: relative;
  }
  .phase-step:first-child { border-radius: 8px 0 0 8px; }
  .phase-step:last-child  { border-radius: 0 8px 8px 0; }
  .phase-step.done   { background: ${C.ember}22; color: ${C.ember}; }
  .phase-step.active { background: ${C.ember}; color: white; }

  /* Invite code display */
  .invite-code {
    background: ${C.sand}; border: 1.5px dashed ${C.ochre}80;
    border-radius: 12px; padding: 12px 16px;
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 14px;
  }
  .invite-code-val {
    font-family: monospace; font-size: 22px; font-weight: 700;
    color: ${C.bark}; letter-spacing: 4px;
  }

  /* Modal overlay */
  .adm-modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    z-index: 200; display: flex; align-items: flex-end;
  }
  .adm-modal {
    background: ${C.parchment}; border-radius: 24px 24px 0 0;
    padding: 24px 20px 48px; width: 100%; max-height: 80vh; overflow-y: auto;
  }
  .adm-modal-title {
    font-family: 'Playfair Display', serif;
    font-size: 18px; font-weight: 700; color: ${C.bark}; margin-bottom: 6px;
  }
  .adm-modal-sub { font-size: 12px; color: #92400E; margin-bottom: 20px; }
  .adm-modal-field { margin-bottom: 14px; }
  .adm-modal-label {
    display: block; font-size: 11px; font-weight: 600;
    color: #92400E; margin-bottom: 5px;
  }
  .adm-modal-input {
    width: 100%; padding: 11px 14px; border-radius: 12px;
    border: 1.5px solid #D9770650; background: white;
    font-family: 'DM Sans', sans-serif; font-size: 13px; color: ${C.bark};
    outline: none;
  }
  .adm-modal-input:focus { border-color: ${C.ember}; box-shadow: 0 0 0 3px ${C.ember}18; }
  .adm-modal-row { display: flex; gap: 10px; }
  .adm-modal-row .adm-modal-field { flex: 1; }

  /* Confirm action box */
  .confirm-box {
    background: #fff7ed; border: 1.5px solid ${C.ochre}60;
    border-radius: 14px; padding: 14px; margin-bottom: 14px;
  }
  .confirm-box.danger { background: #fff1f2; border-color: #fca5a5; }
  .confirm-box-title { font-size: 13px; font-weight: 600; color: ${C.bark}; margin-bottom: 4px; }
  .confirm-box-text  { font-size: 12px; color: #92400E; line-height: 1.55; }

  /* Empty state */
  .adm-empty {
    text-align: center; padding: 32px 20px;
    color: #92400E; font-size: 13px;
  }
  .adm-empty-icon { font-size: 36px; margin-bottom: 10px; }

  /* Filter row */
  .adm-filter-row {
    display: flex; gap: 6px; margin-bottom: 14px; overflow-x: auto;
    scrollbar-width: none;
  }
  .adm-filter-row::-webkit-scrollbar { display: none; }
  .adm-filter-btn {
    flex-shrink: 0; padding: 5px 12px; border-radius: 16px;
    border: 1.5px solid #D9770640; background: white;
    font-size: 11px; font-weight: 500; color: #92400E; cursor: pointer;
    transition: all 0.15s;
  }
  .adm-filter-btn.active { background: ${C.bark}; color: white; border-color: ${C.bark}; }

  /* Toast */
  .adm-toast {
    position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
    background: ${C.bark}; color: white; padding: 10px 20px; border-radius: 20px;
    font-size: 13px; font-weight: 500; z-index: 300;
    animation: toastIn 0.25s ease;
  }
  @keyframes toastIn { from { opacity:0; transform: translateX(-50%) translateY(8px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
`;

// ── Helpers ───────────────────────────────────────────────────
function RoundPhaseStepper({ status }) {
  const phases = ["Draft", "Open", "Matching", "Complete"];
  const idx = { draft:0, open:1, matching:2, complete:3 }[status] ?? 1;
  return (
    <div className="phase-stepper">
      {phases.map((p,i) => (
        <div key={p} className={`phase-step ${i<idx?"done":""} ${i===idx?"active":""}`}>{p}</div>
      ))}
    </div>
  );
}

function BarChart({ title, labels, values, max }) {
  const peak = max || Math.max(...values);
  return (
    <div className="bar-chart">
      <div className="bar-chart-title">{title}</div>
      {labels.map((label, i) => (
        <div className="bar-row" key={label}>
          <div className="bar-label">{label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(values[i]/peak)*100}%` }} />
          </div>
          <div className="bar-val">{values[i]}</div>
        </div>
      ))}
    </div>
  );
}

// ── Section: Round Management ─────────────────────────────────
function RoundManagement({ isAdmin, rounds, refreshRounds }) {
  const [modal, setModal]   = useState(null); // null | 'new' | 'confirm-match' | 'confirm-close'
  const [activeRound, setActiveRound] = useState(null);
  const [toast, setToast]   = useState(null);
  const [newRound, setNewRound] = useState({ title:"", opens:"", closes:"" });

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 2500); };

  const handleAction = (action, round) => {
    setActiveRound(round);
    setModal(action);
  };

  const confirmAction = async () => {
    if (modal === "confirm-match") {
      showToast("🎲 Running matching algorithm…");
      const { data, error } = await supabase.functions.invoke("run-matching", {
        body: { round_id: activeRound.id },
      });
      if (error) {
        showToast(`❌ ${error.message}`);
      } else {
        refreshRounds();
        showToast(`✅ Done — ${data.piece1Pairs} random + ${data.piece2Pairs} choice pairs`);
      }
    }
    if (modal === "confirm-close") {
      // 1. Fetch all matches for this round (not yet conversation-ified)
      const { data: roundMatches } = await supabase
        .from("matches")
        .select("id, submission_a, submission_b, submissions!submission_a(user_id), sub_b:submissions!submission_b(user_id)")
        .eq("round_id", activeRound.id);

      // 2. Create conversations for every match that doesn't have one yet
      const expiresAt = new Date(
        (activeRound.closes_at ? new Date(activeRound.closes_at).getTime() : Date.now())
        + 30 * 24 * 60 * 60 * 1000
      ).toISOString();

      const convRows = (roundMatches ?? []).map(m => ({
        match_id:      m.id,
        round_id:      activeRound.id,
        participant_a: m.submissions?.user_id,
        participant_b: m.sub_b?.user_id,
        expires_at:    expiresAt,
      }));

      if (convRows.length > 0) {
        await supabase.from("conversations").insert(convRows);
      }

      // 3. Close the round
      await supabase.from("raffle_rounds").update({ status: "complete" }).eq("id", activeRound.id);
      refreshRounds();
      showToast("✅ Results published — members can now see their matches");
    }
    if (modal === "new") {
      await supabase.from("raffle_rounds").insert({
        title:     newRound.title,
        status:    "open",
        opens_at:  newRound.opens  || null,
        closes_at: newRound.closes || null,
      });
      refreshRounds();
      showToast("🔥 New round opened!");
      setNewRound({ title:"", opens:"", closes:"" });
    }
    setModal(null);
  };

  return (
    <div className="adm-section">
      <div className="adm-heading">Round Management</div>
      <div className="adm-subheading">Open, close, and trigger matching for each swap round.</div>

      {isAdmin && (
        <button className="btn-sm btn-primary-sm" style={{marginBottom:16, width:"100%"}}
          onClick={()=>setModal("new")}>
          + Open New Round
        </button>
      )}

      {rounds.map(round => (
        <div className="adm-card" key={round.id}>
          <div className="adm-card-row">
            <div>
              <div className="adm-card-title">{round.title}</div>
              <div className="adm-card-meta">
                {fmtDate(round.opens_at)} → {fmtDate(round.closes_at)} · {round.participants} participants
              </div>
            </div>
            <span className={`status-pill status-${round.status}`}>{round.status}</span>
          </div>

          <RoundPhaseStepper status={round.status} />

          <div style={{display:"flex", gap:12, fontSize:12, color:"#92400E", marginBottom:12}}>
            <span>✅ {round.matched} matched</span>
            {round.unmatched > 0 && <span style={{color:"#dc2626"}}>⚠️ {round.unmatched} unmatched</span>}
          </div>

          {isAdmin && round.status === "open" && (
            <div className="adm-card-actions">
              <button className="btn-sm btn-primary-sm" onClick={()=>handleAction("confirm-match", round)}>
                🎲 Run Matching
              </button>
              <button className="btn-sm btn-ghost-sm" onClick={()=>handleAction("confirm-close", round)}>
                Close Round
              </button>
            </div>
          )}
          {isAdmin && round.status === "matching" && (
            <div className="adm-card-actions">
              <button className="btn-sm btn-success-sm" onClick={()=>handleAction("confirm-close", round)}>
                ✓ Publish Results
              </button>
            </div>
          )}
          {round.status === "complete" && (
            <div style={{fontSize:11, color:"#16a34a"}}>✓ Round complete · {round.matched}/{round.participants} matched</div>
          )}
        </div>
      ))}

      {/* Modals */}
      {modal === "new" && (
        <div className="adm-modal-backdrop" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="adm-modal">
            <div className="adm-modal-title">Open New Round</div>
            <div className="adm-modal-sub">A notification will be sent to all members when you open it.</div>
            <div className="adm-modal-field">
              <label className="adm-modal-label">Round Title</label>
              <input className="adm-modal-input" placeholder="e.g. Summer Solstice Swap"
                value={newRound.title} onChange={e=>setNewRound(r=>({...r, title:e.target.value}))} />
            </div>
            <div className="adm-modal-row">
              <div className="adm-modal-field">
                <label className="adm-modal-label">Opens</label>
                <input className="adm-modal-input" type="date"
                  value={newRound.opens} onChange={e=>setNewRound(r=>({...r, opens:e.target.value}))} />
              </div>
              <div className="adm-modal-field">
                <label className="adm-modal-label">Closes</label>
                <input className="adm-modal-input" type="date"
                  value={newRound.closes} onChange={e=>setNewRound(r=>({...r, closes:e.target.value}))} />
              </div>
            </div>
            <div style={{display:"flex", gap:10, marginTop:6}}>
              <button className="btn-sm btn-neutral-sm" style={{flex:1, padding:"11px"}} onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn-sm btn-primary-sm" style={{flex:2, padding:"11px"}}
                disabled={!newRound.title || !newRound.opens || !newRound.closes}
                onClick={confirmAction}>Open Round 🔥</button>
            </div>
          </div>
        </div>
      )}

      {(modal === "confirm-match" || modal === "confirm-close") && (
        <div className="adm-modal-backdrop" onClick={e=>e.target===e.currentTarget && setModal(null)}>
          <div className="adm-modal">
            <div className="adm-modal-title">
              {modal === "confirm-match" ? "Run Matching Algorithm?" : "Close Round?"}
            </div>
            <div className="confirm-box">
              <div className="confirm-box-title">{activeRound?.title}</div>
              <div className="confirm-box-text">
                {modal === "confirm-match"
                  ? `This will run the rank-weighted matching algorithm across all ${activeRound?.participants} submissions. Piece 1s will be randomly paired, Piece 2s matched by ranked choice. This cannot be undone without manual intervention.`
                  : "Results will be published to all participants. Matched pairs will receive a push notification and a new messaging thread will open."}
              </div>
            </div>
            <div style={{display:"flex", gap:10}}>
              <button className="btn-sm btn-neutral-sm" style={{flex:1, padding:"11px"}} onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn-sm btn-primary-sm" style={{flex:2, padding:"11px"}} onClick={confirmAction}>
                {modal === "confirm-match" ? "Run Matching" : "Publish Results"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="adm-toast">{toast}</div>}
    </div>
  );
}

// ── Section: Match Oversight ──────────────────────────────────
function MatchOversight({ isAdmin, rounds }) {
  const [matches, setMatches]           = useState([]);
  const [members, setMembers]           = useState([]);
  const [roundFilter, setRoundFilter]   = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pairModal, setPairModal]       = useState(false);
  const [toast, setToast]               = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 2500); };

  useEffect(() => {
    async function load() {
      const { data: matchRows } = await supabase
        .from("matches")
        .select(`
          id, match_type, submission_a, submission_b, round_id,
          round:raffle_rounds!round_id(id, title),
          sub_a:submissions!submission_a(id, piece_1_name, profiles!user_id(display_name)),
          sub_b:submissions!submission_b(id, piece_1_name, profiles!user_id(display_name))
        `);

      const { data: allSubs } = await supabase
        .from("submissions")
        .select("id, piece_1_name, round_id, profiles!user_id(display_name)");

      const matched    = matchRows ?? [];
      const matchedIds = new Set(matched.flatMap(m => [m.submission_a, m.submission_b].filter(Boolean)));

      setMatches([
        ...matched.map(m => ({
          id:      m.id,
          roundId: m.round?.id,
          type:    m.match_type,
          status:  "matched",
          userA:   m.sub_a?.profiles?.display_name ?? "—",
          userB:   m.sub_b?.profiles?.display_name ?? "—",
          pieceA:  m.sub_a?.piece_1_name ?? "—",
          pieceB:  m.sub_b?.piece_1_name ?? "—",
        })),
        ...(allSubs ?? [])
          .filter(s => !matchedIds.has(s.id))
          .map(s => ({
            id:      `unm-${s.id}`,
            roundId: s.round_id,
            type:    "random",
            status:  "unmatched",
            userA:   s.profiles?.display_name ?? "—",
            userB:   "—",
            pieceA:  s.piece_1_name ?? "—",
            pieceB:  "—",
          })),
      ]);
    }

    supabase.from("profiles").select("id, display_name")
      .then(({ data }) => setMembers(data ?? []));
    load();
  }, []);

  const filtered  = matches.filter(m => {
    if (roundFilter !== "all" && m.roundId !== roundFilter) return false;
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    return true;
  });
  const unmatched = matches.filter(m => m.status === "unmatched");

  return (
    <div className="adm-section">
      <div className="adm-heading">Match Oversight</div>
      <div className="adm-subheading">Review all matches, resolve unmatched submissions, manually pair members.</div>

      {unmatched.length > 0 && (
        <div style={{background:"#fff1f2", border:"1.5px solid #fca5a5", borderRadius:14, padding:"12px 14px", marginBottom:14}}>
          <div style={{fontWeight:600, fontSize:13, color:"#dc2626", marginBottom:4}}>
            ⚠️ {unmatched.length} unmatched submission{unmatched.length!==1?"s":""}
          </div>
          <div style={{fontSize:12, color:"#92400E", marginBottom:10}}>
            These members entered but weren't matched by the algorithm. Manually pair them or mark as unresolvable.
          </div>
          {isAdmin && (
            <button className="btn-sm btn-primary-sm" onClick={()=>setPairModal(true)}>
              Manually Pair Members
            </button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="adm-filter-row">
        {[{ id:"all", label:"All Rounds" }, ...rounds.map(r => ({ id:r.id, label:r.title.split(" ").slice(0,2).join(" ") }))].map(f => (
          <button key={f.id} className={`adm-filter-btn ${roundFilter===f.id?"active":""}`}
            onClick={()=>setRoundFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="adm-filter-row">
        {["all","matched","unmatched"].map(f => (
          <button key={f} className={`adm-filter-btn ${statusFilter===f?"active":""}`}
            onClick={()=>setStatusFilter(f)}>
            {f==="all"?"All Statuses": f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="adm-empty">
          <div className="adm-empty-icon">🏺</div>
          No matches found for these filters.
        </div>
      ) : filtered.map(m => (
        <div className="match-card" key={m.id}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6}}>
            <span className={`match-type-pill match-${m.type}`}>{m.type === "random" ? "🎲 Random" : "🏆 Choice"}</span>
            <span className={`status-pill status-${m.status}`}>{m.status}</span>
          </div>
          <div className="match-vs">
            <div className="match-side">
              <div className="match-user">{m.userA}</div>
              <div className="match-piece">{m.pieceA}</div>
            </div>
            <div className="match-arrow">⇄</div>
            <div className="match-side" style={{textAlign:"right"}}>
              <div className="match-user">{m.userB}</div>
              <div className="match-piece">{m.pieceB}</div>
            </div>
          </div>
          {m.status === "unmatched" && isAdmin && (
            <button className="btn-sm btn-ghost-sm" style={{marginTop:4}}
              onClick={()=>{ showToast("🔗 Manual pairing modal would open here"); }}>
              Manually pair →
            </button>
          )}
        </div>
      ))}

      {/* Manual pair modal */}
      {pairModal && (
        <div className="adm-modal-backdrop" onClick={e=>e.target===e.currentTarget && setPairModal(false)}>
          <div className="adm-modal">
            <div className="adm-modal-title">Manually Pair Members</div>
            <div className="adm-modal-sub">Use this to resolve unmatched submissions by hand.</div>
            <div className="adm-modal-field">
              <label className="adm-modal-label">Member A</label>
              <select className="adm-modal-input">
                <option>Select member…</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
              </select>
            </div>
            <div className="adm-modal-field">
              <label className="adm-modal-label">Member B</label>
              <select className="adm-modal-input">
                <option>Select member…</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
              </select>
            </div>
            <div className="adm-modal-field">
              <label className="adm-modal-label">Reason (internal note)</label>
              <input className="adm-modal-input" placeholder="e.g. Algorithm left both unmatched in r2" />
            </div>
            <div style={{display:"flex", gap:10, marginTop:6}}>
              <button className="btn-sm btn-neutral-sm" style={{flex:1, padding:"11px"}} onClick={()=>setPairModal(false)}>Cancel</button>
              <button className="btn-sm btn-primary-sm" style={{flex:2, padding:"11px"}}
                onClick={()=>{ setPairModal(false); showToast("🔗 Manual match created!"); }}>
                Create Match
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="adm-toast">{toast}</div>}
    </div>
  );
}

// ── Section: Usage Stats ──────────────────────────────────────
function UsageStats({ rounds }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function load() {
      const [
        { count: totalMembers },
        { count: totalMessages },
        { count: totalMatches },
        { count: totalSubs },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }),
        supabase.from("matches").select("id", { count: "exact", head: true }),
        supabase.from("submissions").select("id", { count: "exact", head: true }),
      ]);

      const matchRate = totalSubs > 0
        ? Math.round(((totalMatches ?? 0) * 2 / totalSubs) * 100)
        : 0;

      const { data: subsByRound } = await supabase
        .from("submissions").select("round_id");

      const roundCounts = {};
      (subsByRound ?? []).forEach(s => {
        roundCounts[s.round_id] = (roundCounts[s.round_id] ?? 0) + 1;
      });

      setStats({
        totalMembers: totalMembers ?? 0,
        messagesSent: totalMessages ?? 0,
        matchRate,
        totalRounds:  rounds.length,
        roundCounts,
      });
    }
    load();
  }, [rounds]);

  if (!stats) return (
    <div className="adm-section">
      <div className="adm-empty" style={{paddingTop:40}}>Loading…</div>
    </div>
  );

  const roundLabels = rounds.map(r => r.title.split(" ").slice(0, 2).join(" "));
  const roundValues = rounds.map(r => stats.roundCounts[r.id] ?? 0);

  return (
    <div className="adm-section">
      <div className="adm-heading">Usage Stats</div>
      <div className="adm-subheading">How the studio is growing and engaging with Hot—Pots.</div>

      <div className="stat-grid">
        <div className="stat-cell">
          <div className="stat-value">{stats.totalMembers}</div>
          <div className="stat-label">Total Members</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{stats.matchRate}%</div>
          <div className="stat-label">Match Rate</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{stats.totalRounds}</div>
          <div className="stat-label">Rounds Run</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{stats.messagesSent}</div>
          <div className="stat-label">Messages Sent</div>
        </div>
      </div>

      {roundLabels.length > 0 && (
        <BarChart
          title="Submissions per Round"
          labels={roundLabels}
          values={roundValues}
        />
      )}
    </div>
  );
}

// ── Section: Member Management ────────────────────────────────
function MemberManagement({ isAdmin }) {
  const [members, setMembers]           = useState([]);
  const [filter, setFilter]             = useState("all");
  const [modal, setModal]               = useState(null); // null | { type, member }
  const [toast, setToast]               = useState(null);
  const [inviteCode, setInviteCode]     = useState("—");
  const [inviteCodeId, setInviteCodeId] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 2500); };

  useEffect(() => {
    supabase.from("profiles")
      .select("id, display_name, role")
      .order("display_name")
      .then(({ data }) => {
        setMembers((data ?? []).map(m => ({
          id:       m.id,
          name:     m.display_name ?? "Unknown",
          initials: toInitials(m.display_name),
          role:     m.role ?? "member",
        })));
      });

    supabase.from("studio_codes")
      .select("id, code")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) { setInviteCode(data.code); setInviteCodeId(data.id); }
      });
  }, []);

  const filteredMembers = members.filter(m => filter === "all" || m.role === filter);

  const handleAction = (type, member) => setModal({ type, member });

  const confirmAction = async () => {
    const { type, member } = modal;
    if (type === "make-helper") {
      await supabase.from("profiles").update({ role: "helper" }).eq("id", member.id);
      setMembers(ms => ms.map(m => m.id===member.id ? {...m, role:"helper"} : m));
      showToast(`🔑 ${member.name} is now a helper`);
    }
    if (type === "make-member") {
      await supabase.from("profiles").update({ role: "member" }).eq("id", member.id);
      setMembers(ms => ms.map(m => m.id===member.id ? {...m, role:"member"} : m));
      showToast(`${member.name} changed to member`);
    }
    setModal(null);
  };

  const regenerateCode = async () => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    if (inviteCodeId) {
      await supabase.from("studio_codes").update({ code: newCode }).eq("id", inviteCodeId);
    } else {
      const { data } = await supabase.from("studio_codes").insert({ code: newCode }).select().single();
      if (data) setInviteCodeId(data.id);
    }
    setInviteCode(newCode);
    showToast("New invite code generated!");
  };

  return (
    <div className="adm-section">
      <div className="adm-heading">Members</div>
      <div className="adm-subheading">Manage studio members, roles, and access.</div>

      {/* Invite code */}
      <div className="invite-code">
        <div>
          <div style={{fontSize:10, fontWeight:600, color:"#92400E", marginBottom:2}}>STUDIO INVITE CODE</div>
          <div className="invite-code-val">{inviteCode}</div>
        </div>
        {isAdmin && (
          <button className="btn-sm btn-ghost-sm" onClick={regenerateCode}>Regenerate</button>
        )}
      </div>

      {/* Filters */}
      <div className="adm-filter-row">
        {["all","admin","helper","member"].map(f => (
          <button key={f} className={`adm-filter-btn ${filter===f?"active":""}`}
            onClick={()=>setFilter(f)}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <div className="adm-empty">
          <div className="adm-empty-icon">👥</div>
          No members found.
        </div>
      )}

      {filteredMembers.map(member => (
        <div className="member-row" key={member.id}>
          <div className="member-avatar">{member.initials}</div>
          <div style={{flex:1, minWidth:0}}>
            <div className="member-name">{member.name}</div>
            <div className="member-pills">
              <span className={`role-pill role-${member.role}`}>{member.role}</span>
            </div>
          </div>
          {isAdmin && member.role !== "admin" && (
            <div className="member-actions">
              {member.role === "member" && (
                <button className="btn-sm btn-ghost-sm" onClick={()=>handleAction("make-helper", member)}>→ Helper</button>
              )}
              {member.role === "helper" && (
                <button className="btn-sm btn-neutral-sm" onClick={()=>handleAction("make-member", member)}>→ Member</button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Confirmation modal */}
      {modal && (
        <div className="adm-modal-backdrop" onClick={e=>e.target===e.currentTarget && setModal(null)}>
          <div className="adm-modal">
            <div className="adm-modal-title">
              {modal.type==="make-helper" && "Make Helper"}
              {modal.type==="make-member" && "Change to Member"}
            </div>
            <div className="confirm-box">
              <div className="confirm-box-title">{modal.member.name}</div>
              <div className="confirm-box-text">
                {modal.type==="make-helper" && "They'll be able to view stats and matches, but cannot open/close rounds or change member roles."}
                {modal.type==="make-member" && "They'll revert to standard member permissions."}
              </div>
            </div>
            <div style={{display:"flex", gap:10}}>
              <button className="btn-sm btn-neutral-sm" style={{flex:1, padding:"11px"}} onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn-sm btn-primary-sm" style={{flex:2, padding:"11px"}} onClick={confirmAction}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="adm-toast">{toast}</div>}
    </div>
  );
}

// ── Main AdminPortal component ────────────────────────────────
export default function AdminPortal({ role = "admin" }) {
  const isAdmin  = role === "admin";
  const sections = [
    { id:"rounds",  label:"🔥 Rounds"  },
    { id:"matches", label:"🎲 Matches" },
    { id:"stats",   label:"📊 Stats"   },
    { id:"members", label:"👥 Members" },
  ];
  const [section, setSection] = useState("rounds");
  const [rounds,  setRounds]  = useState([]);

  async function fetchRounds() {
    const { data } = await supabase
      .from("raffle_rounds")
      .select("id, title, status, opens_at, closes_at")
      .order("opens_at", { ascending: false });
    if (!data) return;

    const roundIds = data.map(r => r.id);
    if (roundIds.length === 0) { setRounds([]); return; }

    const [{ data: subs }, { data: matchData }] = await Promise.all([
      supabase.from("submissions").select("round_id").in("round_id", roundIds),
      supabase.from("matches").select("id, round_id").in("round_id", roundIds),
    ]);

    const subCounts   = {};
    (subs ?? []).forEach(s => { subCounts[s.round_id]   = (subCounts[s.round_id]   ?? 0) + 1; });
    const matchCounts = {};
    (matchData ?? []).forEach(m => { matchCounts[m.round_id] = (matchCounts[m.round_id] ?? 0) + 1; });

    setRounds(data.map(r => ({
      ...r,
      participants: subCounts[r.id]   ?? 0,
      matched:      (matchCounts[r.id] ?? 0) * 2,
      unmatched:    Math.max(0, (subCounts[r.id] ?? 0) - (matchCounts[r.id] ?? 0) * 2),
    })));
  }

  useEffect(() => { fetchRounds(); }, []);

  return (
    <>
      <style>{adminStyles}</style>
      <div className="adm-wrap">

        {/* Section header */}
        <div style={{padding:"16px 16px 0", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:C.bark}}>
              Admin
            </div>
            <div style={{fontSize:11, color:"#92400E"}}>
              Signed in as <span style={{fontWeight:600}}>{role}</span>
              {!isAdmin && " · Some actions are restricted to admins"}
            </div>
          </div>
          <span className={`role-pill role-${role}`}>{role}</span>
        </div>

        {/* Sub-navigation */}
        <div className="adm-subnav">
          {sections.map(s => (
            <button key={s.id} className={`adm-subbtn ${section===s.id?"active":""}`}
              onClick={()=>setSection(s.id)}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Sections */}
        {section === "rounds"  && <RoundManagement isAdmin={isAdmin} rounds={rounds} refreshRounds={fetchRounds} />}
        {section === "matches" && <MatchOversight  isAdmin={isAdmin} rounds={rounds} />}
        {section === "stats"   && <UsageStats rounds={rounds} />}
        {section === "members" && <MemberManagement isAdmin={isAdmin} />}
      </div>
    </>
  );
}

// ============================================================
// INTEGRATION INSTRUCTIONS — pottery-swap.jsx
// ============================================================
//
// 1. Import at top of pottery-swap.jsx:
//    import AdminPortal from "./components/AdminPortal";
//
// 2. Add role to mockUser (line ~107):
//    const mockUser = { name: "Maya Chen", initials: "MC", role: "admin" };
//    // role: "admin" | "helper" | "member"
//    // In production, read this from Supabase: profiles.role
//
// 3. Add admin tab conditionally to the top tab bar (line ~1376):
//    { id:"home", label:"Home" },
//    ...existing tabs...
//    ...(["admin","helper"].includes(mockUser.role) ? [{ id:"admin", label:"⚙️ Admin" }] : []),
//
// 4. Add to bottom nav (line ~1750):
//    ...(["admin","helper"].includes(mockUser.role)
//       ? [{ id:"admin", icon:"⚙️", label:"Admin" }]
//       : []),
//
// 5. Add tab content (after profile tab, line ~1745):
//    {tab === "admin" && ["admin","helper"].includes(mockUser.role) && (
//      <AdminPortal role={mockUser.role} />
//    )}
//
// 6. Add "admin" to validTabs array (line ~1290):
//    const validTabs = ["home","enter","history","messages","profile","admin"];
// ============================================================
