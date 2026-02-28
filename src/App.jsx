import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase/client";
import CameraCapture from "./components/CameraCapture";
import AdminPortal from "./components/AdminPortal";
import AuthScreens from "./components/auth-screens";
import { usePWA } from "./hooks/usePWA";

// ============================================================
// DATA MODEL (Supabase / Postgres Schema) — Updated
// ============================================================
// TABLE: profiles
//   id uuid (FK → auth.users)
//   display_name text
//   avatar_url text
//   bio text
//   created_at timestamptz
//
// TABLE: raffle_rounds
//   id uuid PK
//   title text
//   status enum('open','matching','complete')
//   opens_at timestamptz
//   closes_at timestamptz
//   created_at timestamptz
//
// TABLE: submissions
//   id uuid PK
//   round_id uuid FK → raffle_rounds
//   user_id uuid FK → profiles
//   -- Piece 1: RANDOM RAFFLE match
//   piece_1_name text
//   piece_1_photo_url text
//   piece_1_description text
//   piece_1_glaze text
//   piece_1_clay_body text
//   piece_1_method enum('hand-built','wheel-thrown')
//   -- Piece 2: CHOICE match — user picks from gallery
//   piece_2_name text
//   piece_2_photo_url text
//   piece_2_description text
//   piece_2_glaze text
//   piece_2_clay_body text
//   piece_2_method enum('hand-built','wheel-thrown')
//   piece_2_rankings jsonb  -- ordered array of [{id, rank}] submission ids user has ranked
//   status enum('pending','matched','complete')
//   created_at timestamptz
//
// TABLE: matches
//   id uuid PK
//   round_id uuid FK → raffle_rounds
//   submission_a uuid FK → submissions
//   submission_b uuid FK → submissions
//   match_type enum('random','choice')
//   rank_a int  -- rank submission_a gave to submission_b's piece (choice matches)
//   rank_b int  -- rank submission_b gave to submission_a's piece (choice matches)
//   matched_at timestamptz
//   confirmed_a bool
//   confirmed_b bool
//
// TABLE: conversations
//   id uuid PK
//   match_id uuid FK → matches (unique — one thread per match)
//   round_id uuid FK → raffle_rounds
//   participant_a uuid FK → profiles
//   participant_b uuid FK → profiles
//   expires_at timestamptz  -- = round closes_at + 30 days
//   created_at timestamptz
//
// TABLE: messages
//   id uuid PK
//   conversation_id uuid FK → conversations
//   sender_id uuid FK → profiles
//   body text
//   sent_at timestamptz
//   read_at timestamptz  -- null = unread
//
// RLS POLICIES:
//   - profiles: users can read all, write only own
//   - submissions: users can read own, insert own
//     piece_2 gallery is readable by all active-round participants
//   - matches: users can read own matches only
//   - conversations: participants only (participant_a or participant_b)
//   - messages: sender can insert; both participants can read
//     No inserts allowed after expires_at (enforced by DB check constraint)
//   - raffle_rounds: public read
//
// SUPABASE REALTIME:
//   Enable realtime on messages table so both users see new messages
//   instantly without polling. Subscribe per conversation_id.
// ============================================================

const LOGO_B64 = "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";

const C = {
  ember:    "#E8450A",   // vivid burnt orange — primary
  kiln:     "#D4380D",   // deep red-orange
  terracotta: "#C1440E", // classic terracotta
  ochre:    "#D97706",   // amber/ochre accent
  mahogany: "#7C2D12",   // deep brown
  bark:     "#44200A",   // near-black brown
  sand:     "#FEF3C7",   // warm cream bg
  parchment:"#FDF0E0",   // page bg
  blush:    "#FDE8D8",   // light card bg
  ash:      "#FDEBD0",   // input bg
  rust:     "#9A3412",   // muted red
  copper:   "#B45309",   // copper accent
  mist:     "#92400E",   // muted brown text
};

const LOGO = `data:image/png;base64,${LOGO_B64}`;

const mockUser = { name: "Maya Chen", initials: "MC", role: "admin" }; // role: "admin" | "helper" | "member"

const mockRound = {
  title: "February Fire Swap",
  status: "open",
  closes: "March 3, 2026",
  participants: 14,
  spots: 20,
};

const mockMatches = [
  { id:1, round:"January Earth Exchange", partner:"Theo R.", partnerPiece:"Raku Bowl", myPiece:"Celadon Mug", type:"random" },
  { id:2, round:"December Fire Swap", partner:"Lena K.", partnerPiece:"Salt-glazed Vase", myPiece:"Stoneware Cup", type:"choice" },
];

const mockConversations = [
  {
    id: "c1",
    matchType: "random",
    round: "February Fire Swap",
    partner: { name: "Theo R.", initials: "TR" },
    myPiece: "Celadon Mug",
    theirPiece: "Raku Bowl",
    expiresAt: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000), // 18 days left
    messages: [
      { id:"m1", sender:"them", body:"Hey! So excited about our match — your Celadon Mug looks stunning in the photos 😍", time:"2:14 PM", date:"Today" },
      { id:"m2", sender:"me",   body:"Thank you! Your Raku Bowl is gorgeous. Are you at the studio on Saturday?", time:"2:31 PM", date:"Today" },
      { id:"m3", sender:"them", body:"Yes! I'll be there around 11am for the morning open session. Does that work?", time:"2:45 PM", date:"Today" },
    ]
  },
  {
    id: "c2",
    matchType: "choice",
    round: "February Fire Swap",
    partner: { name: "Lena K.", initials: "LK" },
    myPiece: "Stoneware Cup",
    theirPiece: "Salt-glazed Vase",
    expiresAt: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000), // 22 days left
    messages: [
      { id:"m4", sender:"them", body:"Hi! I ranked your Stoneware Cup as my #1 — so happy we matched! 🏺", time:"10:02 AM", date:"Yesterday" },
    ]
  },
];

const mockGallery = [
  { id:"g1", name:"Wheel-thrown Planter", maker:"Tomas W.", glaze:"Matte Teal", clay:"Stoneware", method:"wheel-thrown", img:"🪴" },
  { id:"g2", name:"Yunomi Cup", maker:"Priya S.", glaze:"Wood Ash", clay:"Porcelain", method:"wheel-thrown", img:"🍵" },
  { id:"g3", name:"Serving Bowl", maker:"Alex B.", glaze:"Speckled White", clay:"Earthenware", method:"hand-built", img:"🥣" },
  { id:"g4", name:"Bud Vase", maker:"Lena K.", glaze:"Cobalt Blue", clay:"Stoneware", method:"wheel-thrown", img:"🏺" },
  { id:"g5", name:"Espresso Set", maker:"Tomas W.", glaze:"Iron Red", clay:"Porcelain", method:"wheel-thrown", img:"☕" },
  { id:"g6", name:"Pinch Pot", maker:"Mei L.", glaze:"Celadon", clay:"Earthenware", method:"hand-built", img:"🫙" },
  { id:"g7", name:"Slab Plate", maker:"Jordan R.", glaze:"Rutile Blue", clay:"Stoneware", method:"hand-built", img:"🫓" },
  { id:"g8", name:"Faceted Mug", maker:"Priya S.", glaze:"Shino", clay:"Stoneware", method:"wheel-thrown", img:"🧉" },
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: #FDF0E0;
    color: #44200A;
    min-height: 100vh;
  }

  .app {
    max-width: 420px;
    margin: 0 auto;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: #FDF0E0;
    position: relative;
  }

  .app::before {
    content: '';
    position: fixed;
    top: -80px; right: -80px;
    width: 300px; height: 300px;
    border-radius: 60% 40% 70% 30% / 50% 60% 40% 50%;
    background: radial-gradient(ellipse, #E8450A28, transparent 70%);
    pointer-events: none; z-index: 0;
  }
  .app::after {
    content: '';
    position: fixed;
    bottom: 60px; left: -60px;
    width: 240px; height: 240px;
    border-radius: 40% 60% 30% 70% / 60% 40% 70% 30%;
    background: radial-gradient(ellipse, #D9770620, transparent 70%);
    pointer-events: none; z-index: 0;
  }

  /* ── HEADER ── */
  .header {
    padding: 18px 22px 14px;
    display: flex; align-items: center; justify-content: space-between;
    position: relative; z-index: 10;
  }
  .wordmark {
    display: flex; align-items: center; gap: 8px;
  }
  .wordmark img { width: 30px; height: 30px; object-fit: contain; }
  .wordmark-text {
    font-family: 'Playfair Display', serif;
    font-size: 21px; font-weight: 700;
    color: #44200A; letter-spacing: -0.3px;
  }
  .wordmark-text em {
    font-style: italic; color: #E8450A;
  }
  .avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, #E8450A, #7C2D12);
    color: white; font-size: 12px; font-weight: 600;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: transform 0.2s;
  }
  .avatar:hover { transform: scale(1.08); }

  /* ── TABS ── */
  .tabs {
    display: flex; padding: 0 22px; gap: 2px;
    border-bottom: 1.5px solid #D9770644;
    position: relative; z-index: 10;
    overflow-x: auto; scrollbar-width: none;
  }
  .tabs::-webkit-scrollbar { display: none; }
  .tab {
    padding: 9px 12px;
    font-size: 12px; font-weight: 500;
    color: #92400E; cursor: pointer;
    border: none; background: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1.5px;
    transition: all 0.18s; white-space: nowrap; flex-shrink: 0;
  }
  .tab.active { color: #E8450A; border-bottom-color: #E8450A; font-weight: 600; }
  .tab:hover:not(.active) { color: #44200A; }

  /* ── CONTENT ── */
  .content {
    flex: 1; overflow-y: auto;
    padding: 0 22px 90px;
    position: relative; z-index: 10;
  }

  /* ── ROUND BANNER ── */
  .round-banner {
    margin: 18px 0 0;
    background: linear-gradient(140deg, #7C2D12 0%, #44200A 100%);
    border-radius: 20px; padding: 22px;
    color: white; position: relative; overflow: hidden;
  }
  .round-banner::before {
    content: '🏺';
    position: absolute; right: 16px; top: 50%;
    transform: translateY(-50%);
    font-size: 60px; opacity: 0.12;
  }
  .round-status {
    display: inline-block;
    background: #E8450A; color: white;
    font-size: 10px; font-weight: 600;
    padding: 3px 10px; border-radius: 20px;
    letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 10px;
  }
  .round-title {
    font-family: 'Playfair Display', serif;
    font-size: 20px; margin-bottom: 5px; line-height: 1.2;
  }
  .round-meta { font-size: 12px; opacity: 0.65; margin-bottom: 14px; }
  .round-progress {
    background: rgba(255,255,255,0.15); border-radius: 20px;
    height: 5px; margin-bottom: 5px; overflow: hidden;
  }
  .round-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #E8450A, #D97706);
    border-radius: 20px;
  }
  .round-progress-label { font-size: 11px; opacity: 0.6; }

  /* ── BUTTONS ── */
  .btn-primary {
    display: block; width: 100%; margin-top: 16px;
    padding: 13px;
    background: linear-gradient(135deg, #E8450A, #D4380D);
    color: white; border: none; border-radius: 14px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px; font-weight: 600; cursor: pointer;
    letter-spacing: 0.2px;
    transition: all 0.2s;
    box-shadow: 0 4px 14px #E8450A44;
  }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 18px #E8450A55; }
  .btn-primary:active { transform: translateY(0); }

  .btn-secondary {
    display: block; width: 100%; padding: 12px;
    background: transparent; color: #E8450A;
    border: 1.5px solid #E8450A; border-radius: 14px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px; font-weight: 500; cursor: pointer;
    transition: all 0.2s; margin-top: 10px;
  }
  .btn-secondary:hover { background: #E8450A0f; }

  .btn-coffee {
    display: flex; align-items: center; justify-content: center;
    gap: 8px; width: 100%; padding: 13px;
    background: linear-gradient(135deg, #D97706, #B45309);
    color: white; border: none; border-radius: 14px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px; font-weight: 600; cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 14px #D9770640;
    text-decoration: none;
  }
  .btn-coffee:hover { transform: translateY(-2px); box-shadow: 0 6px 18px #D9770655; }

  /* ── SECTIONS ── */
  .section-header {
    display: flex; align-items: center; justify-content: space-between;
    margin: 26px 0 12px;
  }
  .section-title {
    font-family: 'Playfair Display', serif;
    font-size: 16px; color: #44200A;
  }
  .section-link { font-size: 12px; color: #E8450A; cursor: pointer; }

  /* ── HOW IT WORKS ── */
  .how-card {
    background: white; border-radius: 18px; padding: 18px;
    margin-bottom: 12px; border: 1px solid #D9770630;
  }
  .step { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 15px; }
  .step:last-child { margin-bottom: 0; }
  .step-num {
    width: 26px; height: 26px; border-radius: 50%;
    background: linear-gradient(135deg, #E8450A, #D4380D);
    color: white; font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-top: 1px;
  }
  .step-title { font-size: 13px; font-weight: 600; color: #44200A; margin-bottom: 3px; }
  .step-desc { font-size: 12px; color: #92400E; line-height: 1.55; }

  /* ── MATCH CARDS ── */
  .match-card {
    background: white; border-radius: 16px; padding: 15px;
    margin-bottom: 10px; border: 1px solid #D9770630;
    display: flex; align-items: center; gap: 12px;
    cursor: pointer; transition: all 0.2s;
  }
  .match-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px #44200A10; }
  .match-emoji {
    width: 46px; height: 46px; background: #FEF3C7;
    border-radius: 12px; display: flex; align-items: center;
    justify-content: center; font-size: 22px; flex-shrink: 0;
  }
  .match-info { flex: 1; min-width: 0; }
  .match-round { font-size: 11px; color: #92400E; margin-bottom: 3px; }
  .match-pieces { font-size: 13px; font-weight: 500; color: #44200A; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .match-partner { font-size: 12px; color: #92400E; }
  .match-type-badge {
    font-size: 10px; padding: 3px 8px; border-radius: 20px; flex-shrink: 0; font-weight: 500;
  }
  .badge-random { background: #FEF3C7; color: #B45309; }
  .badge-choice { background: #FDE8D8; color: #C1440E; }

  /* ── GALLERY / RANKING ── */
  .gallery-intro {
    background: linear-gradient(120deg, #7C2D12, #44200A);
    border-radius: 16px; padding: 16px; margin-bottom: 14px; color: white;
  }
  .gallery-intro-title { font-family: 'Playfair Display', serif; font-size: 15px; margin-bottom: 5px; }
  .gallery-intro-text { font-size: 12px; opacity: 0.75; line-height: 1.5; }

  /* Unranked pool — 2-col grid */
  .gallery-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .gallery-card {
    background: white; border-radius: 16px; padding: 14px;
    border: 2px solid #D9770630; cursor: pointer;
    transition: all 0.18s; position: relative;
  }
  .gallery-card:hover { transform: translateY(-2px); box-shadow: 0 5px 14px #44200A10; border-color: #E8450A66; }
  .gallery-emoji { font-size: 30px; margin-bottom: 8px; display: block; }
  .gallery-name { font-size: 12px; font-weight: 600; color: #44200A; margin-bottom: 2px; line-height: 1.3; }
  .gallery-maker { font-size: 11px; color: #92400E; margin-bottom: 4px; }
  .gallery-tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .gallery-tag { font-size: 10px; padding: 2px 7px; border-radius: 10px; background: #FEF3C7; color: #B45309; }
  .add-rank-btn {
    margin-top: 10px; width: 100%; padding: 6px;
    background: #E8450A12; color: #E8450A; border: 1.5px dashed #E8450A55;
    border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer;
    transition: all 0.18s;
  }
  .add-rank-btn:hover { background: #E8450A22; border-color: #E8450A; }

  /* Ranked list — full-width rows */
  .rank-list { margin-bottom: 14px; }
  .rank-row {
    background: white; border-radius: 14px; padding: 12px 14px;
    margin-bottom: 8px; border: 2px solid #E8450A33;
    display: flex; align-items: center; gap: 12px;
    transition: all 0.18s;
  }
  .rank-row:hover { border-color: #E8450A77; box-shadow: 0 3px 10px #E8450A12; }
  .rank-badge {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #E8450A, #D4380D);
    color: white; font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .rank-badge.rank-1 { background: linear-gradient(135deg, #D97706, #B45309); }
  .rank-badge.rank-2 { background: linear-gradient(135deg, #92400E, #7C2D12); }
  .rank-info { flex: 1; min-width: 0; }
  .rank-name { font-size: 13px; font-weight: 600; color: #44200A; margin-bottom: 1px; }
  .rank-sub { font-size: 11px; color: #92400E; }
  .rank-emoji { font-size: 22px; flex-shrink: 0; }
  .rank-actions { display: flex; gap: 4px; flex-shrink: 0; }
  .rank-btn {
    width: 26px; height: 26px; border-radius: 8px;
    background: #FEF3C7; color: #B45309; border: none;
    font-size: 13px; cursor: pointer; display: flex;
    align-items: center; justify-content: center; transition: all 0.15s;
  }
  .rank-btn:hover { background: #FDE8D8; color: #E8450A; }
  .rank-btn.remove { background: #FDE8D8; color: #C1440E; }
  .rank-btn.remove:hover { background: #E8450A; color: white; }

  .rank-summary {
    background: #FEF3C7; border-radius: 14px; padding: 12px 14px;
    margin-bottom: 14px; display: flex; align-items: center; gap: 10px;
    border: 1px solid #D9770640;
  }
  .rank-summary-icon { font-size: 20px; }
  .rank-summary-text { font-size: 12px; color: #92400E; line-height: 1.5; }
  .rank-summary-count { font-weight: 700; color: #E8450A; }

  /* ── MESSAGES ── */
  .convo-list { padding-top: 16px; }
  .convo-card {
    background: white; border-radius: 16px; padding: 15px;
    margin-bottom: 10px; border: 1px solid #D9770630;
    display: flex; align-items: center; gap: 12px;
    cursor: pointer; transition: all 0.18s;
  }
  .convo-card:hover { transform: translateY(-2px); box-shadow: 0 5px 16px #44200A0f; }
  .convo-card.unread { border-color: #E8450A44; background: #FFF8F5; }
  .convo-avatar {
    width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #E8450A, #7C2D12);
    color: white; font-size: 13px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .convo-info { flex: 1; min-width: 0; }
  .convo-name { font-size: 14px; font-weight: 600; color: #44200A; margin-bottom: 2px; }
  .convo-preview { font-size: 12px; color: #92400E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .convo-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex-shrink: 0; }
  .convo-time { font-size: 11px; color: #92400E; }
  .convo-unread-dot {
    width: 8px; height: 8px; border-radius: 50%; background: #E8450A;
  }
  .convo-expires {
    font-size: 10px; padding: 2px 8px; border-radius: 20px;
    background: #FEF3C7; color: #B45309; font-weight: 500;
  }
  .convo-expires.urgent { background: #FDE8D8; color: #C1440E; }

  /* Thread view */
  .thread-header {
    background: white; border-bottom: 1px solid #D9770630;
    padding: 14px 22px; display: flex; align-items: center; gap: 12px;
    position: sticky; top: 0; z-index: 20;
  }
  .thread-back {
    background: none; border: none; font-size: 18px; cursor: pointer;
    color: #E8450A; padding: 2px 6px 2px 0; flex-shrink: 0;
  }
  .thread-avatar {
    width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #E8450A, #7C2D12);
    color: white; font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .thread-info { flex: 1; min-width: 0; }
  .thread-name { font-size: 14px; font-weight: 600; color: #44200A; }
  .thread-sub { font-size: 11px; color: #92400E; }

  .thread-expiry-banner {
    margin: 12px 0 4px; padding: 9px 14px; border-radius: 12px;
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; line-height: 1.4;
  }
  .thread-expiry-banner.ok { background: #FEF3C7; color: #92400E; border: 1px solid #D9770630; }
  .thread-expiry-banner.urgent { background: #FDE8D8; color: #C1440E; border: 1px solid #E8450A30; }

  .messages-scroll { padding: 4px 0 12px; }
  .msg-row { display: flex; margin-bottom: 10px; }
  .msg-row.me { justify-content: flex-end; }
  .msg-row.them { justify-content: flex-start; }
  .msg-bubble {
    max-width: 78%; padding: 10px 14px; border-radius: 18px;
    font-size: 13px; line-height: 1.5;
  }
  .msg-row.me .msg-bubble {
    background: linear-gradient(135deg, #E8450A, #D4380D);
    color: white; border-bottom-right-radius: 5px;
  }
  .msg-row.them .msg-bubble {
    background: white; color: #44200A;
    border: 1px solid #D9770630; border-bottom-left-radius: 5px;
  }
  .msg-time { font-size: 10px; margin-top: 3px; color: #92400E; }
  .msg-row.me .msg-time { text-align: right; }

  .msg-date-divider {
    text-align: center; font-size: 11px; color: #92400E;
    margin: 10px 0 8px; font-weight: 500;
  }

  .msg-swap-card {
    background: #FEF3C7; border-radius: 14px; padding: 12px 14px;
    margin: 0 0 16px; border: 1px solid #D9770640;
    display: flex; gap: 10px; align-items: flex-start;
  }
  .msg-swap-icon { font-size: 20px; flex-shrink: 0; }
  .msg-swap-title { font-size: 12px; font-weight: 600; color: #44200A; margin-bottom: 2px; }
  .msg-swap-sub { font-size: 11px; color: #92400E; }

  .compose-bar {
    position: sticky; bottom: 0;
    background: rgba(253,240,224,0.96); backdrop-filter: blur(10px);
    border-top: 1px solid #D9770630;
    padding: 10px 22px 24px;
    display: flex; gap: 10px; align-items: flex-end;
  }
  .compose-input {
    flex: 1; padding: 10px 14px; border-radius: 22px;
    border: 1.5px solid #D9770650; background: white;
    font-family: 'DM Sans', sans-serif; font-size: 13px; color: #44200A;
    outline: none; resize: none; line-height: 1.4; max-height: 100px;
    transition: border-color 0.2s;
  }
  .compose-input:focus { border-color: #E8450A; }
  .compose-send {
    width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #E8450A, #D4380D);
    color: white; border: none; font-size: 16px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.18s; box-shadow: 0 3px 10px #E8450A44;
  }
  .compose-send:hover { transform: scale(1.08); }
  .compose-send:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .expired-notice {
    text-align: center; padding: 16px; background: #FDE8D8;
    border-radius: 14px; margin: 8px 0;
    font-size: 12px; color: #C1440E; line-height: 1.6;
  }

  /* ── SUBMIT FORM ── */
  .form-intro {
    background: #FEF3C7; border-radius: 16px; padding: 16px;
    margin-bottom: 20px; border-left: 3px solid #E8450A;
  }
  .form-intro-title { font-family: 'Playfair Display', serif; font-size: 15px; margin-bottom: 5px; }
  .form-intro-text { font-size: 12px; color: #92400E; line-height: 1.6; }

  .piece-section {
    background: white; border-radius: 18px; padding: 18px;
    margin-bottom: 12px; border: 1px solid #D9770630;
  }
  .piece-label {
    font-size: 11px; font-weight: 700; color: #E8450A;
    text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px;
    display: flex; align-items: center; gap: 8px;
  }
  .piece-type-pill {
    font-size: 10px; padding: 2px 8px; border-radius: 20px;
    background: #FEF3C7; color: #B45309; font-weight: 600; letter-spacing: 0;
    text-transform: none;
  }

  .photo-upload {
    width: 100%; height: 110px;
    border: 2px dashed #D9770660; border-radius: 14px;
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 6px; cursor: pointer;
    margin-bottom: 14px; background: #FEF3C7;
    transition: all 0.2s;
  }
  .photo-upload:hover { border-color: #E8450A; background: #E8450A08; }
  .photo-upload-icon { font-size: 26px; }
  .photo-upload-text { font-size: 12px; color: #92400E; }

  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
  .form-field { margin-bottom: 10px; }
  .form-label { display: block; font-size: 12px; font-weight: 500; color: #92400E; margin-bottom: 5px; }
  .form-input {
    width: 100%; padding: 10px 13px;
    border: 1.5px solid #D9770650; border-radius: 12px;
    font-family: 'DM Sans', sans-serif; font-size: 13px;
    color: #44200A; background: #FDF0E0; outline: none;
    transition: border-color 0.2s; appearance: none;
  }
  .form-input:focus { border-color: #E8450A; }
  .form-textarea { resize: none; height: 68px; }
  select.form-input { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23E8450A' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }

  /* ── DONATE ── */
  .donate-hero {
    background: linear-gradient(140deg, #44200A, #7C2D12);
    border-radius: 20px; padding: 24px; color: white;
    text-align: center; margin-top: 20px; margin-bottom: 16px;
    position: relative; overflow: hidden;
  }
  .donate-hero::before {
    content: '☕'; position: absolute; font-size: 80px; opacity: 0.08;
    bottom: -10px; right: 10px;
  }
  .donate-hero-icon { font-size: 38px; margin-bottom: 10px; }
  .donate-hero-title { font-family: 'Playfair Display', serif; font-size: 20px; margin-bottom: 8px; }
  .donate-hero-text { font-size: 13px; opacity: 0.8; line-height: 1.6; margin-bottom: 20px; }
  .donate-amounts { display: flex; gap: 8px; justify-content: center; margin-bottom: 18px; }
  .donate-amount {
    padding: 8px 16px; border-radius: 20px;
    background: rgba(255,255,255,0.12); color: white;
    font-size: 13px; font-weight: 600; cursor: pointer;
    border: 1.5px solid rgba(255,255,255,0.2); transition: all 0.2s;
  }
  .donate-amount.selected { background: #E8450A; border-color: #E8450A; }
  .donate-amount:hover:not(.selected) { background: rgba(255,255,255,0.2); }

  .donate-note {
    background: #FEF3C7; border-radius: 14px; padding: 14px;
    margin-top: 14px; display: flex; gap: 10px; align-items: flex-start;
    border: 1px solid #D9770630;
  }
  .donate-note-icon { font-size: 18px; flex-shrink: 0; }
  .donate-note-text { font-size: 12px; color: #92400E; line-height: 1.6; }
  .donate-note-title { font-size: 13px; font-weight: 600; color: #44200A; margin-bottom: 3px; }

  /* ── PROFILE ── */
  .profile-header { padding-top: 24px; text-align: center; margin-bottom: 20px; }
  .profile-avatar {
    width: 68px; height: 68px; border-radius: 50%;
    background: linear-gradient(135deg, #E8450A, #7C2D12);
    color: white; font-size: 22px; font-weight: 600;
    display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;
  }
  .profile-name { font-family: 'Playfair Display', serif; font-size: 21px; margin-bottom: 3px; }
  .profile-stats { display: flex; gap: 20px; justify-content: center; margin-top: 18px; }
  .stat { text-align: center; }
  .stat-num { font-family: 'Playfair Display', serif; font-size: 24px; color: #E8450A; }
  .stat-label { font-size: 11px; color: #92400E; margin-top: 2px; }

  /* ── BOTTOM NAV ── */
  .bottom-nav {
    position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
    width: 100%; max-width: 420px;
    background: rgba(253,240,224,0.94); backdrop-filter: blur(12px);
    border-top: 1px solid #D9770640;
    padding: 10px 0 20px;
    display: flex; justify-content: space-around; z-index: 100;
  }
  .nav-btn {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    background: none; border: none; cursor: pointer;
    padding: 4px 18px; transition: all 0.2s;
  }
  .nav-icon { font-size: 20px; transition: transform 0.2s; }
  .nav-btn:active .nav-icon { transform: scale(0.88); }
  .nav-label { font-size: 10px; font-weight: 500; color: #92400E; transition: color 0.2s; }
  .nav-btn.active .nav-label { color: #E8450A; font-weight: 700; }
`;

// ─── PieceForm component ───────────────────────────────────────
function PieceForm({ label, typeLabel, typeColor }) {
  const [photoFile, setPhotoFile] = useState(null); // eslint-disable-line no-unused-vars
  const [photoUrl,  setPhotoUrl]  = useState(null);

  return (
    <div className="piece-section">
      <div className="piece-label">
        {label}
        <span className="piece-type-pill" style={{ background: typeColor + "22", color: typeColor }}>
          {typeLabel}
        </span>
      </div>
      {/* CameraCapture replaces the dummy photo-upload div.
          onCapture → upload file to Supabase Storage, store returned URL in form state. */}
      <CameraCapture
        label={`${label} Photo`}
        existingUrl={photoUrl}
        onCapture={(file, url) => { setPhotoFile(file); setPhotoUrl(url); }}
        onClear={() => { setPhotoFile(null); setPhotoUrl(null); }}
      />
      <div className="form-field">
        <label className="form-label">Piece Name</label>
        <input className="form-input" placeholder="e.g. Celadon Yunomi Cup" />
      </div>
      <div className="form-row">
        <div className="form-field" style={{marginBottom:0}}>
          <label className="form-label">Clay Body</label>
          <input className="form-input" placeholder="e.g. Stoneware" />
        </div>
        <div className="form-field" style={{marginBottom:0}}>
          <label className="form-label">Method</label>
          <select className="form-input">
            <option value="">Select…</option>
            <option value="wheel-thrown">Wheel-thrown</option>
            <option value="hand-built">Hand-built</option>
          </select>
        </div>
      </div>
      <div className="form-field" style={{marginTop:10}}>
        <label className="form-label">Glaze / Technique</label>
        <input className="form-input" placeholder="e.g. Soda-fired, cone 10" />
      </div>
      <div className="form-field">
        <label className="form-label">Description</label>
        <textarea className="form-input form-textarea" placeholder="Tell us about this piece…" />
      </div>
    </div>
  );
}


// ─── Main App ─────────────────────────────────────────────────
export default function HotPotsApp() {
  // Auth gate — real Supabase session
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // PWA — SW registration, install prompt, update detection, online status
  const { canInstall, installApp, updateAvailable, applyUpdate, isOnline } = usePWA();

  if (session === undefined) return null; // brief loading — avoid flash of auth screen
  if (!session) {
    return <AuthScreens onAuthComplete={() => {}} />;
  }

  // Read initial tab from URL param — enables deep links from push notifications
  // and manifest shortcuts (e.g. /?tab=messages&convo=abc or /?tab=enter)
  // Safe URL param reading — window.location may not be available in sandboxed previews
  const urlParams = (() => { try { return new URLSearchParams(window.location.search); } catch { return new URLSearchParams(''); } })();
  const urlTab = urlParams.get("tab");
  const validTabs = ["home", "enter", "history", "messages", "profile", "admin"];
  const initialTab = validTabs.includes(urlTab) ? urlTab : "home";
  const initialConvo = urlParams.get("convo") || null;

  const [tab, setTab] = useState(initialTab);
  const [submitted, setSubmitted] = useState(false);
  const [rankings, setRankings] = useState([]); // ordered array of piece ids, index 0 = rank 1
  const [donateAmt, setDonateAmt] = useState("$3");
  const [submitStep, setSubmitStep] = useState(1); // 1=piece1, 2=piece2/gallery, 3=done
  const [activeConvo, setActiveConvo] = useState(initialConvo);

  // ── Buy Me a Coffee widget ───────────────────────────────────
  // Loads the floating BMC button once on mount.
  // The widget ignores data-color if already initialised, so we
  // remove any stale instance before re-injecting in dev hot-reload.
  useEffect(() => {
    const SCRIPT_ID = "bmc-widget-script";
    if (document.getElementById(SCRIPT_ID)) return; // already loaded

    const script = document.createElement("script");
    script.id               = SCRIPT_ID;
    script.src              = "https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js";
    script.setAttribute("data-name",        "BMC-Widget");
    script.setAttribute("data-cfasync",     "false");
    script.setAttribute("data-id",          "wedged");
    script.setAttribute("data-description", "Support the app");
    script.setAttribute("data-message",     "");
    script.setAttribute("data-color",       "#E8450A"); // matched to Hot—Pots ember orange
    script.setAttribute("data-position",    "Right");
    script.setAttribute("data-x_margin",    "18");
    script.setAttribute("data-y_margin",    "18");
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount (dev only) — remove script and widget DOM node
      document.getElementById(SCRIPT_ID)?.remove();
      document.getElementById("bmc-wbtn")?.remove();
    };
  }, []);
 // conversation id or null (list view)
  const [conversations, setConversations] = useState(mockConversations);
  const [draft, setDraft] = useState("");

  const progress = (mockRound.participants / mockRound.spots) * 100;

  const daysLeft = (expiresAt) => {
    const diff = Math.ceil((new Date(expiresAt) - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const sendMessage = (convoId) => {
    if (!draft.trim()) return;
    setConversations(prev => prev.map(c => {
      if (c.id !== convoId) return c;
      return {
        ...c,
        messages: [...c.messages, {
          id: "m" + Date.now(),
          sender: "me",
          body: draft.trim(),
          time: new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}),
          date: "Today"
        }]
      };
    }));
    setDraft("");
  };

  const totalUnread = conversations.reduce((n, c) => {
    return n + c.messages.filter(m => m.sender === "them").length > 0 ? n + 1 : n;
  }, 0);



  return (
    <>
      <style>{styles}</style>
      <div className="app">

        {/* ── Offline banner ── */}
        {!isOnline && (
          <div style={{
            background: C.mahogany, color: "white",
            padding: "8px 16px", textAlign: "center",
            fontSize: 13, position: "sticky", top: 0, zIndex: 9999,
          }}>
            📡 You're offline — some features may be unavailable
          </div>
        )}

        {/* ── Update available banner ── */}
        {updateAvailable && (
          <div style={{
            background: C.ember, color: "white",
            padding: "10px 16px", fontSize: 13,
            position: "sticky", top: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
          }}>
            🏺 A new version of Hot—Pots is ready!
            <button onClick={applyUpdate} style={{
              background: "white", color: C.ember,
              border: "none", borderRadius: 8,
              padding: "4px 12px", fontWeight: 600, cursor: "pointer",
            }}>
              Update now
            </button>
          </div>
        )}

        {/* ── Install prompt banner ── */}
        {canInstall && (
          <div style={{
            background: C.sand, borderBottom: `1px solid ${C.ochre}44`,
            padding: "10px 16px", fontSize: 13,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ color: C.bark }}>📲 Add Hot—Pots to your home screen</span>
            <button onClick={installApp} style={{
              background: C.ember, color: "white",
              border: "none", borderRadius: 8,
              padding: "5px 14px", fontWeight: 600, cursor: "pointer", fontSize: 12,
            }}>
              Install
            </button>
          </div>
        )}

        {/* HEADER */}
        <div className="header">
          <div className="wordmark">
            <img src={LOGO} alt="Hot—Pots logo" />
            <span className="wordmark-text">Hot—<em>Pots</em></span>
          </div>
          <div className="avatar">{mockUser.initials}</div>
        </div>

        {/* TABS */}
        <div className="tabs">
          {[
            { id:"home",    label:"Home"      },
            { id:"enter",   label:"Enter Raffle" },
            { id:"history", label:"My Swaps"  },
            { id:"messages",label:"Messages"  },
            { id:"profile", label:"Profile"   },
            ...(["admin","helper"].includes(mockUser.role) ? [{ id:"admin", label:"⚙️ Admin" }] : []),
          ].map(t => (
            <button key={t.id} className={`tab ${tab===t.id?"active":""}`} onClick={()=>{ setTab(t.id); if(t.id!=="messages") setActiveConvo(null); }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="content">

          {/* ── HOME ── */}
          {tab==="home" && (
            <>
              <div className="round-banner">
                <div className="round-status">● Open Now</div>
                <div className="round-title">{mockRound.title}</div>
                <div className="round-meta">Closes {mockRound.closes}</div>
                <div className="round-progress">
                  <div className="round-progress-fill" style={{width:`${progress}%`}} />
                </div>
                <div className="round-progress-label">{mockRound.participants} of {mockRound.spots} spots filled</div>
                <button className="btn-primary" onClick={()=>setTab("enter")}>Enter This Round →</button>
              </div>

              <div className="section-header">
                <div className="section-title">How It Works</div>
              </div>
              <div className="how-card">
                {[
                  { n:1, t:"Submit 2 Pieces", d:"Register two pottery pieces you're willing to trade. Add photos, clay body, method, and a description for each." },
                  { n:2, t:"Piece 1 — Random Raffle", d:"Your first piece enters the raffle draw. You'll be randomly matched with another member's piece — a fun surprise!" },
                  { n:3, t:"Piece 2 — Your Choice", d:"Browse the gallery of other members' second pieces. Heart the ones you love. You'll only receive a piece you chose." },
                  { n:4, t:"Meet & Exchange", d:"After matching, arrange your swap at the studio. Admire each other's work!" },
                ].map(s=>(
                  <div className="step" key={s.n}>
                    <div className="step-num">{s.n}</div>
                    <div>
                      <div className="step-title">{s.t}</div>
                      <div className="step-desc">{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="section-header">
                <div className="section-title">Recent Pieces</div>
                <span className="section-link">See all</span>
              </div>
              <div className="gallery-grid">
                {mockGallery.slice(0,4).map(p=>(
                  <div className="gallery-card" key={p.id}>
                    <span className="gallery-emoji">{p.img}</span>
                    <div className="gallery-name">{p.name}</div>
                    <div className="gallery-maker">{p.maker}</div>
                    <div className="gallery-tags">
                      <span className="gallery-tag">{p.clay}</span>
                      <span className="gallery-tag">{p.method}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── SUPPORT ── */}
              <div className="donate-hero" style={{marginTop:28}}>
                <div className="donate-hero-icon">☕</div>
                <div className="donate-hero-title">Keep Hot—Pots Fired Up</div>
                <div className="donate-hero-text">
                  This app is free for our studio community. If you love using it, a small contribution helps cover hosting and keeps new features coming.
                </div>
                <div style={{fontSize:13, color:"#92400E", marginTop:4, lineHeight:1.6}}>
                  Tap the <strong style={{color:"#E8450A"}}>☕</strong> button in the bottom-right corner — any amount helps!
                </div>
              </div>
            </>
          )}

          {/* ── ENTER RAFFLE ── */}
          {tab==="enter" && (
            <div style={{paddingTop:20}}>
              {submitted ? (
                <div style={{textAlign:"center", paddingTop:40}}>
                  <div style={{fontSize:60, marginBottom:18}}>🎉</div>
                  <div style={{fontFamily:"'Playfair Display',serif", fontSize:22, marginBottom:10}}>You're in!</div>
                  <div style={{fontSize:14, color:"#92400E", lineHeight:1.6, marginBottom:28}}>
                    Both pieces submitted for <strong>{mockRound.title}</strong>. Your random raffle match will be drawn on {mockRound.closes}. Your ranked choice match will be optimised across the whole studio.
                  </div>
                  <button className="btn-secondary" onClick={()=>{setSubmitted(false);setSubmitStep(1);setTab("home");}}>Back to Home</button>
                </div>
              ) : submitStep===1 ? (
                <>
                  <div className="form-intro">
                    <div className="form-intro-title">Step 1 of 2 — Random Raffle Piece</div>
                    <div className="form-intro-text">This piece will be randomly matched with another member. You won't know who you'll get — that's part of the fun!</div>
                  </div>
                  <PieceForm label="Piece 1" typeLabel="Random Raffle" typeColor="#E8450A" />
                  <button className="btn-primary" onClick={()=>setSubmitStep(2)}>Continue to Piece 2 →</button>
                </>
              ) : (
                <>
                  <div className="form-intro">
                    <div className="form-intro-title">Step 2 of 2 — Choice Piece</div>
                    <div className="form-intro-text">Submit your second piece, then rank the pieces you'd love to receive. The algorithm maximises matches using everyone's rank order — the more you rank, the better your odds!</div>
                  </div>
                  <PieceForm label="Piece 2" typeLabel="Choice Match" typeColor="#D97706" />

                  <div className="gallery-intro">
                    <div className="gallery-intro-title">🏆 Rank the Pieces You Want</div>
                    <div className="gallery-intro-text">Tap "Add to ranking" on any pieces you'd be happy to receive. Drag to reorder. Rank 1 = your top pick. The more you rank, the higher your chance of a match.</div>
                  </div>

                  {/* Ranked list */}
                  {rankings.length > 0 && (
                    <>
                      <div className="rank-summary">
                        <span className="rank-summary-icon">🏆</span>
                        <div className="rank-summary-text">
                          You've ranked <span className="rank-summary-count">{rankings.length} piece{rankings.length!==1?"s":""}</span>. Drag rows to reorder. The algorithm will try your top picks first.
                        </div>
                      </div>
                      <div className="rank-list">
                        {rankings.map((id, idx) => {
                          const p = mockGallery.find(g=>g.id===id);
                          if (!p) return null;
                          return (
                            <div className="rank-row" key={id}>
                              <div className={`rank-badge rank-${idx}`}>#{idx+1}</div>
                              <span className="rank-emoji">{p.img}</span>
                              <div className="rank-info">
                                <div className="rank-name">{p.name}</div>
                                <div className="rank-sub">{p.maker} · {p.clay} · {p.method}</div>
                              </div>
                              <div className="rank-actions">
                                <button className="rank-btn" disabled={idx===0}
                                  onClick={()=>setRankings(r=>{ const a=[...r]; [a[idx-1],a[idx]]=[a[idx],a[idx-1]]; return a; })}>↑</button>
                                <button className="rank-btn" disabled={idx===rankings.length-1}
                                  onClick={()=>setRankings(r=>{ const a=[...r]; [a[idx+1],a[idx]]=[a[idx],a[idx+1]]; return a; })}>↓</button>
                                <button className="rank-btn remove"
                                  onClick={()=>setRankings(r=>r.filter(x=>x!==id))}>✕</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Unranked pool */}
                  {mockGallery.filter(p=>!rankings.includes(p.id)).length > 0 && (
                    <>
                      <div style={{fontSize:12, color:"#92400E", marginBottom:10, fontWeight:500}}>
                        {rankings.length > 0 ? "Add more pieces to your ranking:" : "Tap a piece to add it to your ranking:"}
                      </div>
                      <div className="gallery-grid" style={{marginBottom:20}}>
                        {mockGallery.filter(p=>!rankings.includes(p.id)).map(p=>(
                          <div className="gallery-card" key={p.id}>
                            <span className="gallery-emoji">{p.img}</span>
                            <div className="gallery-name">{p.name}</div>
                            <div className="gallery-maker">{p.maker}</div>
                            <div className="gallery-tags">
                              <span className="gallery-tag">{p.clay}</span>
                              <span className="gallery-tag">{p.method}</span>
                            </div>
                            <button className="add-rank-btn" onClick={()=>setRankings(r=>[...r, p.id])}>
                              + Add to ranking
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <button className="btn-primary"
                    disabled={rankings.length===0}
                    style={{opacity: rankings.length===0 ? 0.5 : 1, cursor: rankings.length===0?"not-allowed":"pointer"}}
                    onClick={()=>{ if(rankings.length>0) setSubmitted(true); }}>
                    Submit Both Pieces 🏺
                  </button>
                  {rankings.length===0 && (
                    <div style={{textAlign:"center", fontSize:12, color:"#92400E", marginTop:8}}>
                      Rank at least one piece to continue
                    </div>
                  )}
                  <button className="btn-secondary" onClick={()=>setSubmitStep(1)}>← Back to Piece 1</button>
                </>
              )}
            </div>
          )}

          {/* ── HISTORY ── */}
          {tab==="history" && (
            <>
              <div className="section-header" style={{marginTop:20}}>
                <div className="section-title">Past Swaps</div>
                <span className="section-link">{mockMatches.length} completed</span>
              </div>
              {mockMatches.map(m=>(
                <div className="match-card" key={m.id}>
                  <div className="match-emoji">🤝</div>
                  <div className="match-info">
                    <div className="match-round">{m.round}</div>
                    <div className="match-pieces">{m.myPiece} ↔ {m.partnerPiece}</div>
                    <div className="match-partner">with {m.partner}</div>
                  </div>
                  <div className={`match-type-badge ${m.type==="random"?"badge-random":"badge-choice"}`}>
                    {m.type==="random"?"🎲 Raffle":"💛 Choice"}
                  </div>
                </div>
              ))}
              <div style={{textAlign:"center", padding:"28px 0", color:"#92400E", fontSize:13}}>
                More swaps appear after each round closes 🏺
              </div>
            </>
          )}

          {/* ── DONATE ── */}
          {/* ── MESSAGES ── */}
          {tab==="messages" && (() => {
            // ── Thread view ──
            if (activeConvo) {
              const convo = conversations.find(c=>c.id===activeConvo);
              const days = daysLeft(convo.expiresAt);
              const isExpired = days <= 0;
              const isUrgent = days <= 5 && days > 0;
              // Group messages by date
              const grouped = convo.messages.reduce((acc, m) => {
                const last = acc[acc.length-1];
                if (!last || last.date !== m.date) acc.push({date: m.date, msgs: [m]});
                else last.msgs.push(m);
                return acc;
              }, []);
              return (
                <div style={{margin:"0 -22px", display:"flex", flexDirection:"column", minHeight:"calc(100vh - 120px)"}}>
                  <div className="thread-header">
                    <button className="thread-back" onClick={()=>setActiveConvo(null)}>←</button>
                    <div className="thread-avatar">{convo.partner.initials}</div>
                    <div className="thread-info">
                      <div className="thread-name">{convo.partner.name}</div>
                      <div className="thread-sub">{convo.round}</div>
                    </div>
                  </div>

                  <div style={{padding:"0 22px", flex:1, overflowY:"auto", paddingBottom: isExpired ? "20px" : "80px"}}>
                    <div className={`thread-expiry-banner ${isUrgent?"urgent":"ok"}`}>
                      <span>{isExpired ? "🔒" : isUrgent ? "⚠️" : "⏳"}</span>
                      <span>
                        {isExpired
                          ? "This conversation has closed. Messages were available for 30 days after the round."
                          : `Messaging closes in ${days} day${days!==1?"s":""} · ${convo.round}`}
                      </span>
                    </div>

                    <div className="msg-swap-card">
                      <span className="msg-swap-icon">🤝</span>
                      <div>
                        <div className="msg-swap-title">Your swap: {convo.myPiece} ↔ {convo.theirPiece}</div>
                        <div className="msg-swap-sub">{convo.matchType === "random" ? "🎲 Random raffle match" : "💛 Choice match"} · {convo.round}</div>
                      </div>
                    </div>

                    <div className="messages-scroll">
                      {grouped.map((group, gi) => (
                        <div key={gi}>
                          <div className="msg-date-divider">{group.date}</div>
                          {group.msgs.map(m => (
                            <div key={m.id} className={`msg-row ${m.sender}`}>
                              <div>
                                <div className="msg-bubble">{m.body}</div>
                                <div className="msg-time">{m.time}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {isExpired ? (
                    <div style={{padding:"0 22px 24px"}}>
                      <div className="expired-notice">
                        🔒 This conversation closed 30 days after the round ended.<br/>
                        Hope you made a great swap!
                      </div>
                    </div>
                  ) : (
                    <div className="compose-bar" style={{position:"sticky", bottom:0}}>
                      <textarea
                        className="compose-input"
                        rows={1}
                        placeholder="Message Theo…"
                        value={draft}
                        onChange={e=>setDraft(e.target.value)}
                        onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendMessage(convo.id); }}}
                      />
                      <button className="compose-send" disabled={!draft.trim()} onClick={()=>sendMessage(convo.id)}>↑</button>
                    </div>
                  )}
                </div>
              );
            }

            // ── Conversation list view ──
            return (
              <div className="convo-list">
                <div className="section-header" style={{marginTop:4}}>
                  <div className="section-title">Your Matches</div>
                  <span style={{fontSize:12, color:"#92400E"}}>{conversations.length} active</span>
                </div>

                <div style={{background:"#FEF3C7", borderRadius:14, padding:"11px 14px", marginBottom:16, fontSize:12, color:"#92400E", lineHeight:1.55, border:"1px solid #D9770630"}}>
                  💬 You can message your matched partners for <strong>30 days</strong> after the round closes to arrange your pottery exchange.
                </div>

                {conversations.map(c => {
                  const days = daysLeft(c.expiresAt);
                  const lastMsg = c.messages[c.messages.length - 1];
                  const hasUnread = c.messages.some(m => m.sender === "them");
                  return (
                    <div key={c.id} className={`convo-card ${hasUnread?"unread":""}`} onClick={()=>setActiveConvo(c.id)}>
                      <div className="convo-avatar">{c.partner.initials}</div>
                      <div className="convo-info">
                        <div className="convo-name">{c.partner.name}</div>
                        <div className="convo-preview">{lastMsg ? lastMsg.body : "No messages yet — say hi!"}</div>
                      </div>
                      <div className="convo-meta">
                        <span className="convo-time">{lastMsg?.time || ""}</span>
                        <span className={`convo-expires ${days<=5?"urgent":""}`}>
                          {days > 0 ? `${days}d left` : "Closed"}
                        </span>
                        {hasUnread && <div className="convo-unread-dot" />}
                      </div>
                    </div>
                  );
                })}

                <div style={{textAlign:"center", padding:"20px 0 10px", color:"#92400E", fontSize:12}}>
                  New conversations appear here when matches are made 🏺
                </div>
              </div>
            );
          })()}

          {/* ── PROFILE ── */}
          {tab==="profile" && (
            <>
              <div className="profile-header">
                <div className="profile-avatar">{mockUser.initials}</div>
                <div className="profile-name">{mockUser.name}</div>
                <div style={{fontSize:13, color:"#92400E"}}>Studio Member since 2024</div>
                <div className="profile-stats">
                  <div className="stat"><div className="stat-num">8</div><div className="stat-label">Swaps</div></div>
                  <div className="stat"><div className="stat-num">5</div><div className="stat-label">Rounds</div></div>
                  <div className="stat"><div className="stat-num">12</div><div className="stat-label">Pieces Given</div></div>
                </div>
              </div>
              <button className="btn-secondary">Edit Profile</button>

              <div style={{marginTop:20, background:"white", borderRadius:18, padding:18, border:"1px solid #D9770630"}}>
                <div style={{fontFamily:"'Playfair Display',serif", fontSize:15, marginBottom:12, color:"#44200A"}}>🔒 Your Privacy</div>
                <div style={{fontSize:12, color:"#92400E", lineHeight:1.6}}>
                  Supabase row-level security ensures your submissions are only visible to your matched partner — never to other members browsing the gallery. The studio admin sees round stats only.
                </div>
              </div>
            </>
          )}

        </div>{/* end content */}


          {/* ── ADMIN ── */}
          {tab==="admin" && ["admin","helper"].includes(mockUser.role) && (
            <AdminPortal role={mockUser.role} />
          )}

        {/* BOTTOM NAV */}
        <div className="bottom-nav">
          {[
            {id:"home",    icon:"🏠", label:"Home"},
            {id:"enter",   icon:"🏺", label:"Enter"},
            {id:"history", icon:"🤝", label:"Swaps"},
            {id:"messages",icon:"💬", label:"Messages"},
            {id:"profile", icon:"👤", label:"Profile"},
            ...(["admin","helper"].includes(mockUser.role) ? [{id:"admin", icon:"⚙️", label:"Admin"}] : []),
          ].map(n=>(
            <button key={n.id} className={`nav-btn ${tab===n.id?"active":""}`} onClick={()=>{ setTab(n.id); if(n.id!=="messages") setActiveConvo(null); }}>
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </button>
          ))}
        </div>

      </div>
    </>
  );
}
