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

import { useState } from "react";

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

// ── Mock data ─────────────────────────────────────────────────
const mockRounds = [
  { id:"r1", title:"Spring Equinox Swap", status:"open",     opens:"Mar 1",  closes:"Mar 22", participants:18, matched:0,  unmatched:0  },
  { id:"r2", title:"Winter Warmth Round", status:"complete", opens:"Jan 5",  closes:"Jan 26", participants:24, matched:22, unmatched:2  },
  { id:"r3", title:"Autumn Harvest Swap", status:"complete", opens:"Oct 10", closes:"Oct 31", participants:20, matched:20, unmatched:0  },
];

const mockMembers = [
  { id:"u1", name:"Maya Chen",      initials:"MC", email:"maya@studio.com",    role:"admin",  status:"active",   joined:"Jan 2024", pieces:6, swaps:3  },
  { id:"u2", name:"James Okafor",   initials:"JO", email:"james@studio.com",   role:"helper", status:"active",   joined:"Feb 2024", pieces:4, swaps:2  },
  { id:"u3", name:"Priya Nair",     initials:"PN", email:"priya@studio.com",   role:"member", status:"active",   joined:"Mar 2024", pieces:8, swaps:4  },
  { id:"u4", name:"Tom Whitfield",  initials:"TW", email:"tom@studio.com",     role:"member", status:"active",   joined:"Mar 2024", pieces:3, swaps:1  },
  { id:"u5", name:"Sara Lindqvist", initials:"SL", email:"sara@studio.com",    role:"member", status:"active",   joined:"Apr 2024", pieces:5, swaps:2  },
  { id:"u6", name:"Dev Patel",      initials:"DP", email:"dev@studio.com",     role:"member", status:"pending",  joined:"May 2024", pieces:0, swaps:0  },
  { id:"u7", name:"Chloe Morrow",   initials:"CM", email:"chloe@studio.com",   role:"member", status:"suspended",joined:"Jun 2024", pieces:2, swaps:0  },
];

const mockMatches = [
  { id:"m1", roundId:"r1", type:"random", userA:"Priya Nair",    pieceA:"Celadon Yunomi",      userB:"Tom Whitfield",  pieceB:"Ash Glaze Bowl",      status:"matched"   },
  { id:"m2", roundId:"r1", type:"choice", userA:"Sara Lindqvist",pieceA:"Raku Vase",           userB:"Maya Chen",     pieceB:"Terracotta Planter",  status:"matched"   },
  { id:"m3", roundId:"r1", type:"random", userA:"James Okafor",  pieceA:"Soda-fired Cup",      userB:"Dev Patel",     pieceB:"—",                   status:"unmatched" },
  { id:"m4", roundId:"r2", type:"choice", userA:"Priya Nair",    pieceA:"Shino Bowl",          userB:"Sara Lindqvist",pieceB:"Cobalt Mug",          status:"matched"   },
  { id:"m5", roundId:"r2", type:"random", userA:"Tom Whitfield", pieceA:"Stoneware Jug",       userB:"Maya Chen",     pieceB:"Wood-fire Plate",     status:"matched"   },
  { id:"m6", roundId:"r2", type:"choice", userA:"James Okafor",  pieceA:"Porcelain Cup",       userB:"Chloe Morrow",  pieceB:"Earthenware Vase",    status:"unmatched" },
];

const mockStats = {
  totalMembers: 34,
  activeMembers: 28,
  totalRounds: 6,
  totalMatches: 87,
  avgParticipation: 76,
  matchRate: 94,
  messagesSent: 412,
  monthlyGrowth: [8,12,14,18,22,28,34],
  monthLabels: ["Aug","Sep","Oct","Nov","Dec","Jan","Feb"],
  roundParticipation: [14,18,20,16,24,18],
  roundLabels: ["R1","R2","R3","R4","R5","R6"],
};

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
function RoundManagement({ isAdmin }) {
  const [rounds, setRounds] = useState(mockRounds);
  const [modal, setModal]   = useState(null); // null | 'new' | 'confirm-match' | 'confirm-close'
  const [activeRound, setActiveRound] = useState(null);
  const [toast, setToast]   = useState(null);
  const [newRound, setNewRound] = useState({ title:"", opens:"", closes:"" });

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 2500); };

  const handleAction = (action, round) => {
    setActiveRound(round);
    setModal(action);
  };

  const confirmAction = () => {
    if (modal === "confirm-match") {
      setRounds(r => r.map(rd => rd.id === activeRound.id ? {...rd, status:"matching"} : rd));
      showToast("🎲 Matching algorithm triggered!");
    }
    if (modal === "confirm-close") {
      setRounds(r => r.map(rd => rd.id === activeRound.id ? {...rd, status:"complete"} : rd));
      showToast("✅ Round closed");
    }
    if (modal === "new") {
      const newR = { id:`r${Date.now()}`, ...newRound, status:"open", participants:0, matched:0, unmatched:0 };
      setRounds(r => [newR, ...r]);
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
                {round.opens} → {round.closes} · {round.participants} participants
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
function MatchOversight({ isAdmin }) {
  const [roundFilter, setRoundFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pairModal, setPairModal]     = useState(false);
  const [toast, setToast]             = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 2500); };

  const filtered = mockMatches.filter(m => {
    if (roundFilter !== "all" && m.roundId !== roundFilter) return false;
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    return true;
  });

  const unmatched = mockMatches.filter(m => m.status === "unmatched");

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
        {["all","r1","r2"].map(f => (
          <button key={f} className={`adm-filter-btn ${roundFilter===f?"active":""}`}
            onClick={()=>setRoundFilter(f)}>
            {f==="all"?"All Rounds": mockRounds.find(r=>r.id===f)?.title.split(" ").slice(0,2).join(" ")}
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
                {mockMembers.filter(m=>m.status==="active").map(m=>(
                  <option key={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="adm-modal-field">
              <label className="adm-modal-label">Member B</label>
              <select className="adm-modal-input">
                <option>Select member…</option>
                {mockMembers.filter(m=>m.status==="active").map(m=>(
                  <option key={m.id}>{m.name}</option>
                ))}
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
function UsageStats() {
  return (
    <div className="adm-section">
      <div className="adm-heading">Usage Stats</div>
      <div className="adm-subheading">How the studio is growing and engaging with Hot—Pots.</div>

      <div className="stat-grid">
        <div className="stat-cell">
          <div className="stat-value">{mockStats.totalMembers}</div>
          <div className="stat-label">Total Members</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{mockStats.activeMembers}</div>
          <div className="stat-label">Active (30d)</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{mockStats.matchRate}%</div>
          <div className="stat-label">Match Rate</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{mockStats.avgParticipation}%</div>
          <div className="stat-label">Avg Participation</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{mockStats.totalRounds}</div>
          <div className="stat-label">Rounds Run</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{mockStats.messagesSent}</div>
          <div className="stat-label">Messages Sent</div>
        </div>
      </div>

      <BarChart
        title="Member Growth"
        labels={mockStats.monthLabels}
        values={mockStats.monthlyGrowth}
        max={40}
      />

      <BarChart
        title="Participants per Round"
        labels={mockStats.roundLabels}
        values={mockStats.roundParticipation}
        max={30}
      />

      <div className="adm-card">
        <div className="adm-card-title">Current Round Snapshot</div>
        <div style={{marginTop:10}}>
          {[
            { label:"Submissions received", value:"18 / 34 members", pct:53 },
            { label:"Piece 2 rankings done", value:"14 / 18 submitted", pct:78 },
            { label:"Push notifications enabled", value:"22 / 34 members", pct:65 },
          ].map(row => (
            <div key={row.label} style={{marginBottom:12}}>
              <div style={{display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4}}>
                <span style={{color:C.bark}}>{row.label}</span>
                <span style={{color:"#92400E"}}>{row.value}</span>
              </div>
              <div style={{height:6, background:"#FEF3C7", borderRadius:3, overflow:"hidden"}}>
                <div style={{width:`${row.pct}%`, height:"100%", borderRadius:3, background:`linear-gradient(90deg, ${C.ember}, ${C.ochre})`}} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Section: Member Management ────────────────────────────────
function MemberManagement({ isAdmin }) {
  const [members, setMembers] = useState(mockMembers);
  const [filter, setFilter]   = useState("all");
  const [modal, setModal]     = useState(null); // null | { type, member }
  const [toast, setToast]     = useState(null);
  const [inviteCode] = useState("KILN42");

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 2500); };

  const filteredMembers = members.filter(m => filter === "all" || m.status === filter || m.role === filter);

  const handleAction = (type, member) => setModal({ type, member });

  const confirmAction = () => {
    const { type, member } = modal;
    if (type === "approve") {
      setMembers(ms => ms.map(m => m.id===member.id ? {...m, status:"active"} : m));
      showToast(`✅ ${member.name} approved`);
    }
    if (type === "suspend") {
      setMembers(ms => ms.map(m => m.id===member.id ? {...m, status:"suspended"} : m));
      showToast(`⚠️ ${member.name} suspended`);
    }
    if (type === "reinstate") {
      setMembers(ms => ms.map(m => m.id===member.id ? {...m, status:"active"} : m));
      showToast(`✅ ${member.name} reinstated`);
    }
    if (type === "make-helper") {
      setMembers(ms => ms.map(m => m.id===member.id ? {...m, role:"helper"} : m));
      showToast(`🔑 ${member.name} is now a helper`);
    }
    if (type === "make-member") {
      setMembers(ms => ms.map(m => m.id===member.id ? {...m, role:"member"} : m));
      showToast(`${member.name} changed to member`);
    }
    setModal(null);
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
          <button className="btn-sm btn-ghost-sm" onClick={()=>showToast("New code generated!")}>
            Regenerate
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="adm-filter-row">
        {["all","active","pending","suspended","admin","helper"].map(f => (
          <button key={f} className={`adm-filter-btn ${filter===f?"active":""}`}
            onClick={()=>setFilter(f)}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      {filteredMembers.map(member => (
        <div className="member-row" key={member.id}>
          <div className="member-avatar">{member.initials}</div>
          <div style={{flex:1, minWidth:0}}>
            <div className="member-name">{member.name}</div>
            <div className="member-email">{member.email}</div>
            <div className="member-pills">
              <span className={`role-pill role-${member.role}`}>{member.role}</span>
              <span className={`status-pill status-${member.status}`}>{member.status}</span>
              <span style={{fontSize:10, color:"#92400E"}}>{member.swaps} swaps</span>
            </div>
          </div>
          {isAdmin && (
            <div className="member-actions">
              {member.status === "pending" && (
                <button className="btn-sm btn-success-sm" onClick={()=>handleAction("approve", member)}>Approve</button>
              )}
              {member.status === "active" && member.role === "member" && (
                <button className="btn-sm btn-ghost-sm" onClick={()=>handleAction("make-helper", member)}>→ Helper</button>
              )}
              {member.status === "active" && member.role === "helper" && (
                <button className="btn-sm btn-neutral-sm" onClick={()=>handleAction("make-member", member)}>→ Member</button>
              )}
              {member.status === "active" && member.role !== "admin" && (
                <button className="btn-sm btn-danger-sm" onClick={()=>handleAction("suspend", member)}>Suspend</button>
              )}
              {member.status === "suspended" && (
                <button className="btn-sm btn-success-sm" onClick={()=>handleAction("reinstate", member)}>Reinstate</button>
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
              {modal.type==="approve"     && "Approve Member"}
              {modal.type==="suspend"     && "Suspend Member"}
              {modal.type==="reinstate"   && "Reinstate Member"}
              {modal.type==="make-helper" && "Make Helper"}
              {modal.type==="make-member" && "Change to Member"}
            </div>
            <div className={`confirm-box ${modal.type==="suspend"?"danger":""}`}>
              <div className="confirm-box-title">{modal.member.name}</div>
              <div className="confirm-box-text">
                {modal.type==="approve"     && "They'll receive access to the app and can enter the current round."}
                {modal.type==="suspend"     && "They'll lose access to the app immediately. Their past matches won't be affected."}
                {modal.type==="reinstate"   && "Their account will be restored to active status."}
                {modal.type==="make-helper" && "They'll be able to view stats and matches, but cannot open/close rounds or change member roles."}
                {modal.type==="make-member" && "They'll revert to standard member permissions."}
              </div>
            </div>
            <div style={{display:"flex", gap:10}}>
              <button className="btn-sm btn-neutral-sm" style={{flex:1, padding:"11px"}} onClick={()=>setModal(null)}>Cancel</button>
              <button className={`btn-sm ${modal.type==="suspend"?"btn-danger-sm":"btn-primary-sm"}`}
                style={{flex:2, padding:"11px"}} onClick={confirmAction}>
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
        {section === "rounds"  && <RoundManagement isAdmin={isAdmin} />}
        {section === "matches" && <MatchOversight  isAdmin={isAdmin} />}
        {section === "stats"   && <UsageStats />}
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
