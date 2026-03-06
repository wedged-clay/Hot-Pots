import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase/client";
import AdminPortal from "./components/AdminPortal";
import AuthScreens from "./components/auth-screens";
import ErrorBoundary from "./components/ErrorBoundary";
import PieceForm from "./components/PieceForm";
import SortableRankRow from "./components/SortableRankRow";
import { usePWA } from "./hooks/usePWA";
import { useAuth } from "./hooks/useAuth";
import { useProfileStats } from "./hooks/useProfileStats";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { C } from "./constants/colours";
import { LOGO } from "./constants/logo";
import { styles } from "./styles/appStyles";
import { formatMsgDate, toInitials, formatCountdown, daysLeft } from "./utils/formatters";

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



// ─── Main App ─────────────────────────────────────────────────
export default function HotPotsApp() {
  // ── Read URL params first (stable between renders, safe to read unconditionally) ──
  const urlParams = (() => { try { return new URLSearchParams(window.location.search); } catch { return new URLSearchParams(""); } })();
  const urlTab    = urlParams.get("tab");
  const validTabs = ["home", "enter", "history", "messages", "profile", "admin"];

  // ── ALL hooks before any early returns (Rules of Hooks) ──────
  const { session } = useAuth();
  const [profile,       setProfile]       = useState(null);
  const [round,         setRound]         = useState(null);
  const [gallery,       setGallery]       = useState([]);
  const [matches,       setMatches]       = useState([]);
  const profileStats = useProfileStats(profile);
  const [tab,           setTab]           = useState(validTabs.includes(urlTab) ? urlTab : "home");
  const [submitted,     setSubmitted]     = useState(false);
  const [rankings,      setRankings]      = useState([]);
  const [donateAmt,     setDonateAmt]     = useState("$3");
  const [submitStep,    setSubmitStep]    = useState(1);
  const [activeConvo,   setActiveConvo]   = useState(urlParams.get("convo") || null);
  const [conversations, setConversations] = useState([]);
  const [draft,         setDraft]         = useState("");
  const [isSending,     setIsSending]     = useState(false);
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [submitError,   setSubmitError]   = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName,       setEditName]       = useState("");
  const [editBio,        setEditBio]        = useState("");
  const [savingProfile,  setSavingProfile]  = useState(false);
  const [studioCode,     setStudioCode]     = useState("");
  const [linkCopied,     setLinkCopied]     = useState(false);
  const [revealMatch,    setRevealMatch]    = useState(null);
  const [avatarFile,     setAvatarFile]     = useState(null);
  const [avatarPreview,  setAvatarPreview]  = useState(null);
  const piece1Ref = useRef();
  const piece2Ref = useRef();
  const activeConvoRef = useRef(null); // mirrors activeConvo for Realtime closure

  // PWA — SW registration, install prompt, update detection, online status
  const { canInstall, installApp, updateAvailable, applyUpdate, isOnline } = usePWA();

  // ── Fetch profile when session changes ───────────────────────
  useEffect(() => {
    if (!session) { setProfile(null); return; }
    supabase.from("profiles")
      .select("id, display_name, role, bio, avatar_url, created_at")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data); });
    // Fetch active studio code for invite link
    supabase.from("studio_codes").select("code").eq("active", true).limit(1).single()
      .then(({ data }) => { if (data) setStudioCode(data.code); });
  }, [session]);

  // ── Fetch open round + gallery + matches when profile loads ──
  useEffect(() => {
    if (!profile) return;
    // Open round
    supabase.from("raffle_rounds")
      .select("id, title, status, closes_at")
      .eq("status", "open")
      .order("closes_at", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(async ({ data: r }) => {
        if (!r) { setRound(null); return; }
        // Count participants (submissions) for this round
        const { count } = await supabase.from("submissions")
          .select("id", { count: "exact", head: true })
          .eq("round_id", r.id);
        setRound({ ...r, participants: count ?? 0 });

        // Gallery: other members' piece 2 for this round
        const { data: subs } = await supabase.from("submissions")
          .select("id, piece_2_name, piece_2_photo_url, piece_2_glaze, piece_2_clay_body, piece_2_method, profiles!user_id(display_name)")
          .eq("round_id", r.id)
          .neq("user_id", profile.id)
          .not("piece_2_name", "is", null);
        setGallery((subs ?? []).map(s => ({
          id:     s.id,
          name:   s.piece_2_name,
          maker:  s.profiles?.display_name ?? "Member",
          glaze:  s.piece_2_glaze ?? "",
          clay:   s.piece_2_clay_body ?? "",
          method: s.piece_2_method ?? "",
          photoUrl: s.piece_2_photo_url,
        })));
      });

    // Match history
    supabase.from("matches")
      .select(`id, match_type, matched_at,
        sub_a:submissions!submission_a(user_id, piece_1_name, piece_2_name, piece_1_photo_url, piece_2_photo_url, profiles!user_id(display_name)),
        sub_b:submissions!submission_b(user_id, piece_1_name, piece_2_name, piece_1_photo_url, piece_2_photo_url, profiles!user_id(display_name)),
        raffle_rounds!round_id(title)`)
      .or(`submission_a.in.(select id from submissions where user_id='${profile.id}'),submission_b.in.(select id from submissions where user_id='${profile.id}')`)
      .then(({ data }) => {
        if (!data) return;
        const mapped = data.map(m => {
          const mine = m.sub_a?.user_id === profile.id ? m.sub_a : m.sub_b;
          const theirs = m.sub_a?.user_id === profile.id ? m.sub_b : m.sub_a;
          const isRandom = m.match_type === "random";
          return {
            id:               m.id,
            round:            m.raffle_rounds?.title ?? "Past Round",
            partner:          theirs?.profiles?.display_name ?? "Member",
            myPiece:          isRandom ? mine?.piece_1_name       : mine?.piece_2_name,
            partnerPiece:     isRandom ? theirs?.piece_1_name     : theirs?.piece_2_name,
            myPhotoUrl:       isRandom ? mine?.piece_1_photo_url  : mine?.piece_2_photo_url,
            partnerPhotoUrl:  isRandom ? theirs?.piece_1_photo_url : theirs?.piece_2_photo_url,
            type:             m.match_type,
          };
        });
        setMatches(mapped);
        // Reveal the first match the user hasn't seen yet
        const seenKey = `hotpots_seen_matches_${profile.id}`;
        const seen = JSON.parse(localStorage.getItem(seenKey) || "[]");
        const firstNew = mapped.find(m => !seen.includes(m.id));
        if (firstNew) setRevealMatch(firstNew);
      });
  }, [profile]);

  // ── Fetch conversations when profile loads ───────────────────
  useEffect(() => {
    if (!profile) { setConversations([]); return; }
    supabase
      .from("conversations")
      .select(`
        id, expires_at,
        match:matches!match_id(
          id, match_type,
          sub_a:submissions!submission_a(user_id, piece_1_name, profiles!user_id(id, display_name)),
          sub_b:submissions!submission_b(user_id, piece_1_name, profiles!user_id(id, display_name)),
          round:raffle_rounds!round_id(title)
        ),
        messages(id, sender_id, body, sent_at, read_at)
      `)
      .then(({ data }) => {
        if (!data) return;
        setConversations(data.map(c => {
          const match = c.match;
          const isA = match?.sub_a?.user_id === profile.id;
          const mySub    = isA ? match.sub_a : match.sub_b;
          const theirSub = isA ? match.sub_b : match.sub_a;
          const partner  = theirSub?.profiles;
          const msgs = [...(c.messages ?? [])]
            .sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at))
            .map(m => ({
              id:     m.id,
              sender: m.sender_id === profile.id ? "me" : "them",
              body:   m.body,
              time:   new Date(m.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              date:   formatMsgDate(m.sent_at),
              readAt: m.read_at ?? null,
            }));
          return {
            id:         c.id,
            partner:    { id: partner?.id ?? null, name: partner?.display_name ?? "Partner", initials: toInitials(partner?.display_name) },
            round:      match?.round?.title ?? "",
            myPiece:    mySub?.piece_1_name ?? "",
            theirPiece: theirSub?.piece_1_name ?? "",
            matchType:  match?.match_type ?? "random",
            expiresAt:  c.expires_at,
            messages:   msgs,
            unreadCount: msgs.filter(m => m.sender === "them" && !m.readAt).length,
          };
        }));
      });
  }, [profile]);


  // ── Keep activeConvoRef in sync (for Realtime closure) ───────
  useEffect(() => { activeConvoRef.current = activeConvo; }, [activeConvo]);

  // ── Realtime: subscribe to incoming messages ─────────────────
  // Requires Realtime enabled on the messages table in Supabase dashboard
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel(`messages:${profile.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new;
          if (msg.sender_id === profile.id) return; // skip own (already optimistic)
          const formatted = {
            id:     msg.id,
            sender: "them",
            body:   msg.body,
            time:   new Date(msg.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            date:   formatMsgDate(msg.sent_at),
          };
          setConversations(prev => prev.map(c =>
            c.id !== msg.conversation_id ? c : {
              ...c,
              messages:    [...c.messages, formatted],
              unreadCount: activeConvoRef.current === c.id ? c.unreadCount : c.unreadCount + 1,
            }
          ));
          if (activeConvoRef.current === msg.conversation_id) {
            markConversationRead(msg.conversation_id);
          }
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [profile, markConversationRead]);

  // ── Buy Me a Coffee widget ───────────────────────────────────
  useEffect(() => {
    const SCRIPT_ID = "bmc-widget-script";
    if (document.getElementById(SCRIPT_ID)) return;
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js";
    script.setAttribute("data-name",        "BMC-Widget");
    script.setAttribute("data-cfasync",     "false");
    script.setAttribute("data-id",          "wedged");
    script.setAttribute("data-description", "Support the app");
    script.setAttribute("data-message",     "");
    script.setAttribute("data-color",       "#E8450A");
    script.setAttribute("data-position",    "Right");
    script.setAttribute("data-x_margin",    "18");
    script.setAttribute("data-y_margin",    "18");
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.getElementById(SCRIPT_ID)?.remove();
      document.getElementById("bmc-wbtn")?.remove();
    };
  }, []);

  // ── Early returns (after all hooks) ─────────────────────────
  if (session === undefined) return null;
  if (!session) return <AuthScreens onAuthComplete={() => {}} />;

  // ── Derived values ───────────────────────────────────────────
  const profileInitials = profile?.display_name
    ? profile.display_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const progress = round ? Math.min(((round.participants ?? 0) / 20) * 100, 100) : 0;


  // ── Piece submission ─────────────────────────────────────────
  const handleSubmitPieces = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError("");
    const p1 = piece1Ref.current?.getValue();
    const p2 = piece2Ref.current?.getValue();
    if (!round?.id || !profile?.id || !p1 || !p2) { setIsSubmitting(false); return; }

    // Upload photos to Supabase Storage
    const uploadPhoto = async (file, prefix) => {
      if (!file) return null;
      const path = `${profile.id}/${prefix}_${Date.now()}`;
      const { data, error } = await supabase.storage.from("pottery-photos").upload(path, file);
      if (error || !data) throw new Error(`Photo upload failed: ${error?.message ?? "unknown error"}`);
      return supabase.storage.from("pottery-photos").getPublicUrl(data.path).data.publicUrl;
    };

    let p1Url, p2Url;
    try {
      [p1Url, p2Url] = await Promise.all([
        uploadPhoto(p1.photoFile, "p1"),
        uploadPhoto(p2.photoFile, "p2"),
      ]);
    } catch (uploadErr) {
      setSubmitError(uploadErr.message);
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from("submissions").insert({
      round_id:            round.id,
      user_id:             profile.id,
      piece_1_name:        p1.name,
      piece_1_photo_url:   p1Url,
      piece_1_clay_body:   p1.clayBody,
      piece_1_method:      p1.method || null,
      piece_1_glaze:       p1.glaze,
      piece_1_description: p1.description,
      piece_2_name:        p2.name,
      piece_2_photo_url:   p2Url,
      piece_2_clay_body:   p2.clayBody,
      piece_2_method:      p2.method || null,
      piece_2_glaze:       p2.glaze,
      piece_2_description: p2.description,
      piece_2_rankings:    rankings.map((id, idx) => ({ id, rank: idx + 1 })),
    });

    if (error) { setSubmitError(error.message); setIsSubmitting(false); return; }
    piece1Ref.current?.clearDraft();
    piece2Ref.current?.clearDraft();
    setSubmitted(true);
    setIsSubmitting(false);
    // Fire-and-forget confirmation email
    supabase.functions.invoke("send-email", {
      body: {
        userId: profile.id,
        type: "submission_confirmed",
        data: { roundTitle: round?.title ?? "the current round", piece1Name: p1.name, piece2Name: p2.name, closesAt: round?.closes_at },
      },
    }).catch(() => {}); // non-blocking
  };

  // ── Edit Profile ─────────────────────────────────────────────
  const saveProfile = async () => {
    if (!editName.trim()) return;
    setSavingProfile(true);
    let avatarUrl = profile.avatar_url ?? null;
    if (avatarFile) {
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(profile.id, avatarFile, { upsert: true, contentType: avatarFile.type });
      if (upErr) {
        setSavingProfile(false);
        alert(`Photo upload failed: ${upErr.message}`);
        return;
      }
      avatarUrl = supabase.storage.from("avatars").getPublicUrl(profile.id).data.publicUrl
        + `?t=${Date.now()}`;
    }
    const updates = { display_name: editName.trim(), bio: editBio.trim() };
    if (avatarUrl !== (profile.avatar_url ?? null)) updates.avatar_url = avatarUrl;
    const { error } = await supabase.from("profiles").update(updates).eq("id", profile.id);
    if (error) {
      setSavingProfile(false);
      alert(`Save failed: ${error.message}`);
      return;
    }
    setProfile(p => ({ ...p, display_name: editName.trim(), bio: editBio.trim(), avatar_url: avatarUrl }));
    setEditingProfile(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    setSavingProfile(false);
  };

  const dismissReveal = () => {
    if (!revealMatch || !profile?.id) return;
    const seenKey = `hotpots_seen_matches_${profile.id}`;
    const seen = JSON.parse(localStorage.getItem(seenKey) || "[]");
    localStorage.setItem(seenKey, JSON.stringify([...seen, revealMatch.id]));
    setRevealMatch(null);
  };

  // ── Messaging ────────────────────────────────────────────────
  const sendMessage = async (convoId) => {
    if (!draft.trim() || isSending) return;
    const body = draft.trim();
    const tempId = "m" + Date.now();
    setDraft("");
    setIsSending(true);
    // Optimistic update
    setConversations(prev => prev.map(c => {
      if (c.id !== convoId) return c;
      return {
        ...c,
        messages: [...c.messages, {
          id:     tempId,
          sender: "me",
          body,
          time:   new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          date:   "Today",
        }],
      };
    }));
    // Persist
    const { error } = await supabase.from("messages").insert({
      conversation_id: convoId,
      sender_id:       profile.id,
      body,
    });
    if (error) {
      // Rollback optimistic update and restore draft
      setConversations(prev => prev.map(c => {
        if (c.id !== convoId) return c;
        return { ...c, messages: c.messages.filter(m => m.id !== tempId) };
      }));
      setDraft(body);
    }
    setIsSending(false);
  };

  const markConversationRead = useCallback(async (convoId) => {
    setConversations(prev => prev.map(c =>
      c.id !== convoId ? c : { ...c, unreadCount: 0 }
    ));
    await supabase.from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", convoId)
      .neq("sender_id", profile.id)
      .is("read_at", null);
  }, [profile]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);



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
          <div className="avatar" style={{ padding: 0, overflow: "hidden" }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={profileInitials} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : profileInitials}
          </div>
        </div>

        {/* TABS */}
        <div className="tabs">
          {[
            { id:"home",    label:"Home"      },
            { id:"enter",   label:"Enter Raffle" },
            { id:"history", label:"My Swaps"  },
            { id:"messages",label:"Messages"  },
            { id:"profile", label:"Profile"   },
            ...(["admin","helper"].includes(profile?.role) ? [{ id:"admin", label:"⚙️ Admin" }] : []),
          ].map(t => (
            <button key={t.id} className={`tab ${tab===t.id?"active":""}`} onClick={()=>{ setTab(t.id); if(t.id!=="messages") setActiveConvo(null); }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <ErrorBoundary label={`the ${tab} tab`}>
        <div className="content">

          {/* ── HOME ── */}
          {tab==="home" && (
            <>
              <div className="round-banner">
                <div className="round-status">● Open Now</div>
                <div className="round-title">{round?.title ?? "Loading…"}</div>
                {(() => {
                  const cd = round ? formatCountdown(round.closes_at) : null;
                  return (
                    <div className="round-meta" style={cd?.urgent ? { color: "#C1440E", fontWeight: 600 } : {}}>
                      {cd ? cd.label : "…"}
                      {" · "}{round ? new Date(round.closes_at).toLocaleDateString("en-US", {month:"long", day:"numeric", year:"numeric"}) : ""}
                    </div>
                  );
                })()}
                <div className="round-progress">
                  <div className="round-progress-fill" style={{width:`${progress}%`}} />
                </div>
                <div className="round-progress-label">{round?.participants ?? 0} participants so far</div>
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
                {gallery.slice(0,4).map(p=>(
                  <div className="gallery-card" key={p.id}>
                    {p.photoUrl
                      ? <img src={p.photoUrl} alt={p.name} style={{width:"100%",height:80,objectFit:"cover",borderRadius:10,marginBottom:6}} />
                      : <span className="gallery-emoji">🏺</span>}
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
              {round?.closes_at && (() => {
                const cd = formatCountdown(round.closes_at);
                return (
                  <div style={{
                    textAlign: "center", padding: "8px 16px", borderRadius: 10, marginBottom: 16,
                    background: cd.urgent ? "#FEF2F2" : C.sand,
                    border: `1px solid ${cd.urgent ? "#FCA5A5" : C.ochre + "44"}`,
                    fontSize: 13, fontWeight: 600,
                    color: cd.urgent ? "#C1440E" : C.bark,
                  }}>
                    {cd.label}
                  </div>
                );
              })()}
              {submitted ? (
                <div style={{textAlign:"center", paddingTop:40}}>
                  <div style={{fontSize:60, marginBottom:18}}>🎉</div>
                  <div style={{fontFamily:"'Playfair Display',serif", fontSize:22, marginBottom:10}}>You're in!</div>
                  <div style={{fontSize:14, color:"#92400E", lineHeight:1.6, marginBottom:28}}>
                    Both pieces submitted for <strong>{round?.title}</strong>. Your random raffle match will be drawn on {round ? new Date(round.closes_at).toLocaleDateString("en-US",{month:"long",day:"numeric"}) : "…"}. Your ranked choice match will be optimised across the whole studio.
                  </div>
                  <button className="btn-secondary" onClick={()=>{setSubmitted(false);setSubmitStep(1);setTab("home");}}>Back to Home</button>
                </div>
              ) : submitStep===1 ? (
                <>
                  <div className="form-intro">
                    <div className="form-intro-title">Step 1 of 2 — Random Raffle Piece</div>
                    <div className="form-intro-text">This piece will be randomly matched with another member. You won't know who you'll get — that's part of the fun!</div>
                  </div>
                  <PieceForm ref={piece1Ref} label="Piece 1" typeLabel="Random Raffle" typeColor="#E8450A" storageKey="draft_piece1" />
                  <button className="btn-primary" onClick={()=>setSubmitStep(2)}>Continue to Piece 2 →</button>
                </>
              ) : (
                <>
                  <div className="form-intro">
                    <div className="form-intro-title">Step 2 of 2 — Choice Piece</div>
                    <div className="form-intro-text">Submit your second piece, then rank the pieces you'd love to receive. The algorithm maximises matches using everyone's rank order — the more you rank, the better your odds!</div>
                  </div>
                  <PieceForm ref={piece2Ref} label="Piece 2" typeLabel="Choice Match" typeColor="#D97706" storageKey="draft_piece2" />

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
                          You've ranked <span className="rank-summary-count">{rankings.length} piece{rankings.length!==1?"s":""}</span>. Drag to reorder. The algorithm will try your top picks first.
                        </div>
                      </div>
                      <DndContext collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
                        if (over && active.id !== over.id) {
                          setRankings(r => {
                            const oldIdx = r.indexOf(active.id);
                            const newIdx = r.indexOf(over.id);
                            return arrayMove(r, oldIdx, newIdx);
                          });
                        }
                      }}>
                        <SortableContext items={rankings} strategy={verticalListSortingStrategy}>
                          <div className="rank-list">
                            {rankings.map((id, idx) => {
                              const p = gallery.find(g => g.id === id);
                              if (!p) return null;
                              return (
                                <SortableRankRow
                                  key={id} id={id} idx={idx} totalCount={rankings.length} p={p}
                                  onRemove={() => setRankings(r => r.filter(x => x !== id))}
                                  onUp={idx === 0 ? null : () => setRankings(r => { const a=[...r]; [a[idx-1],a[idx]]=[a[idx],a[idx-1]]; return a; })}
                                  onDown={idx === rankings.length-1 ? null : () => setRankings(r => { const a=[...r]; [a[idx+1],a[idx]]=[a[idx],a[idx+1]]; return a; })}
                                />
                              );
                            })}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </>
                  )}

                  {/* Unranked pool */}
                  {gallery.filter(p=>!rankings.includes(p.id)).length > 0 && (
                    <>
                      <div style={{fontSize:12, color:"#92400E", marginBottom:10, fontWeight:500}}>
                        {rankings.length > 0 ? "Add more pieces to your ranking:" : "Tap a piece to add it to your ranking:"}
                      </div>
                      <div className="gallery-grid" style={{marginBottom:20}}>
                        {gallery.filter(p=>!rankings.includes(p.id)).map(p=>(
                          <div className="gallery-card" key={p.id}>
                            {p.photoUrl
                              ? <img src={p.photoUrl} alt={p.name} style={{width:"100%",height:80,objectFit:"cover",borderRadius:10,marginBottom:6}} />
                              : <span className="gallery-emoji">🏺</span>}
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

                  {submitError && <div style={{color:"#C1440E",fontSize:12,marginBottom:8}}>⚠ {submitError}</div>}
                  <button className="btn-primary"
                    disabled={rankings.length===0 || isSubmitting}
                    style={{opacity: (rankings.length===0 || isSubmitting) ? 0.5 : 1, cursor: (rankings.length===0 || isSubmitting)?"not-allowed":"pointer"}}
                    onClick={handleSubmitPieces}>
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
                <span className="section-link">{matches.length} completed</span>
              </div>
              {matches.length === 0 && <div style={{textAlign:"center",color:"#92400E",fontSize:13,padding:"32px 0"}}>No swaps yet — enter a round to get started!</div>}
              {matches.map(m=>(
                <div className="match-card" key={m.id} style={{flexDirection:"column", gap:12}}>
                  <div style={{display:"flex", alignItems:"center", gap:10}}>
                    <div className="match-emoji">🤝</div>
                    <div className="match-info" style={{flex:1}}>
                      <div className="match-round">{m.round}</div>
                      <div className="match-partner">with {m.partner}</div>
                    </div>
                    <div className={`match-type-badge ${m.type==="random"?"badge-random":"badge-choice"}`}>
                      {m.type==="random"?"🎲 Raffle":"💛 Choice"}
                    </div>
                  </div>
                  <div style={{display:"flex", gap:8}}>
                    {[{label:"Your piece", name:m.myPiece, url:m.myPhotoUrl}, {label:"Their piece", name:m.partnerPiece, url:m.partnerPhotoUrl}].map(p=>(
                      <div key={p.label} style={{flex:1, borderRadius:12, overflow:"hidden", background:C.sand, border:`1px solid ${C.ochre}33`}}>
                        {p.url
                          ? <img src={p.url} alt={p.name} style={{width:"100%", aspectRatio:"1", objectFit:"cover", display:"block"}} />
                          : <div style={{width:"100%", aspectRatio:"1", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28}}>🏺</div>
                        }
                        <div style={{padding:"6px 8px"}}>
                          <div style={{fontSize:10, color:C.mahogany, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em"}}>{p.label}</div>
                          <div style={{fontSize:12, color:C.bark, fontWeight:500, marginTop:2}}>{p.name || "—"}</div>
                        </div>
                      </div>
                    ))}
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
                      <div className="thread-sub">
                        {convo.myPiece && convo.theirPiece
                          ? `${convo.myPiece} ↔ ${convo.theirPiece}`
                          : convo.round}
                      </div>
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
                  const hasUnread = (c.unreadCount ?? 0) > 0;
                  return (
                    <div key={c.id} className={`convo-card ${hasUnread?"unread":""}`} onClick={()=>{ setActiveConvo(c.id); markConversationRead(c.id); }}>
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
                <div className="profile-avatar" style={{ padding: 0, overflow: "hidden" }}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt={profileInitials} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : profileInitials}
                </div>
                <div className="profile-name">{profile?.display_name ?? "…"}</div>
                <div style={{fontSize:13, color:"#92400E"}}>Studio Member since {profile ? new Date(profile.created_at).getFullYear() : "…"}</div>
                {profile?.bio && (
                  <div style={{ fontSize: 13, color: C.bark, marginTop: 6, textAlign: "center", lineHeight: 1.5 }}>
                    {profile.bio}
                  </div>
                )}
                <div className="profile-stats">
                  <div className="stat"><div className="stat-num">{matches.length}</div><div className="stat-label">Swaps</div></div>
                  <div className="stat"><div className="stat-num">{profileStats.rounds}</div><div className="stat-label">Rounds</div></div>
                  <div className="stat"><div className="stat-num">{profileStats.piecesGiven}</div><div className="stat-label">Pieces Given</div></div>
                </div>
              </div>
              <button className="btn-secondary" onClick={() => {
                setEditName(profile?.display_name ?? "");
                setEditBio(profile?.bio ?? "");
                setAvatarFile(null);
                setAvatarPreview(null);
                setEditingProfile(true);
              }}>Edit Profile</button>

              {studioCode && (
                <div style={{marginTop:16, background:"white", borderRadius:18, padding:18, border:`1px solid ${C.ochre}44`}}>
                  <div style={{fontFamily:"'Playfair Display',serif", fontSize:15, marginBottom:4, color:C.bark}}>Invite a Friend</div>
                  <div style={{fontSize:12, color:C.mahogany, marginBottom:12, lineHeight:1.5}}>
                    Share this link with someone from the studio — it takes them straight to signup with the code pre-filled.
                  </div>
                  <div style={{
                    background: C.sand, borderRadius: 10, padding: "10px 14px",
                    fontSize: 13, color: C.bark, fontFamily: "monospace",
                    letterSpacing: "0.05em", marginBottom: 10, wordBreak: "break-all",
                  }}>
                    {`${window.location.origin}/?code=${studioCode}`}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/?code=${studioCode}`);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2500);
                    }}
                    style={{
                      width: "100%", padding: "10px 0", borderRadius: 12, border: "none",
                      background: linkCopied ? C.mahogany : C.ember, color: "white",
                      fontWeight: 600, cursor: "pointer", fontSize: 13, transition: "background 0.2s",
                    }}
                  >
                    {linkCopied ? "✓ Link copied!" : "Copy invite link"}
                  </button>
                </div>
              )}

              <div style={{marginTop:16, background:"white", borderRadius:18, padding:18, border:"1px solid #D9770630"}}>
                <div style={{fontFamily:"'Playfair Display',serif", fontSize:15, marginBottom:12, color:"#44200A"}}>🔒 Your Privacy</div>
                <div style={{fontSize:12, color:"#92400E", lineHeight:1.6}}>
                  Supabase row-level security ensures your submissions are only visible to your matched partner — never to other members browsing the gallery. The studio admin sees round stats only.
                </div>
              </div>
            </>
          )}

        </div>{/* end content */}


          {/* ── ADMIN ── */}
          {tab==="admin" && ["admin","helper"].includes(profile?.role) && (
            <AdminPortal role={profile.role} />
          )}

        </ErrorBoundary>

        {/* BOTTOM NAV */}
        <div className="bottom-nav">
          {[
            {id:"home",    icon:"🏠", label:"Home"},
            {id:"enter",   icon:"🏺", label:"Enter"},
            {id:"history", icon:"🤝", label:"Swaps"},
            {id:"messages",icon:"💬", label:"Messages"},
            {id:"profile", icon:"👤", label:"Profile"},
            ...(["admin","helper"].includes(profile?.role) ? [{id:"admin", icon:"⚙️", label:"Admin"}] : []),
          ].map(n=>(
            <button key={n.id} className={`nav-btn ${tab===n.id?"active":""}`} onClick={()=>{ setTab(n.id); if(n.id!=="messages") setActiveConvo(null); }}>
              <span className="nav-icon" style={{ position:"relative", display:"inline-block" }}>
                {n.icon}
                {n.id==="messages" && totalUnread > 0 && (
                  <span style={{
                    position:"absolute", top:-4, right:-8,
                    background:"#E8450A", color:"white",
                    borderRadius:"50%", minWidth:16, height:16,
                    fontSize:9, fontWeight:700,
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>{totalUnread > 9 ? "9+" : totalUnread}</span>
                )}
              </span>
              <span className="nav-label">{n.label}</span>
            </button>
          ))}
        </div>

        {/* ── Match reveal overlay ── */}
        {revealMatch && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
            zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }} onClick={dismissReveal}>
            <div style={{
              background: C.sand, borderRadius: 24, padding: 32, width: "100%", maxWidth: 360,
              textAlign: "center", boxShadow: "0 12px 48px rgba(0,0,0,0.35)",
            }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 56, marginBottom: 12, lineHeight: 1 }}>🏺</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: C.bark, marginBottom: 6 }}>
                You have a new swap!
              </div>
              <div style={{ fontSize: 14, color: C.mahogany, marginBottom: 20 }}>
                Matched with <strong>{revealMatch.partner}</strong>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                {[
                  { label: "Your piece",   name: revealMatch.myPiece,      url: revealMatch.myPhotoUrl },
                  { label: "Their piece",  name: revealMatch.partnerPiece,  url: revealMatch.partnerPhotoUrl },
                ].map(p => (
                  <div key={p.label} style={{ flex: 1, borderRadius: 12, overflow: "hidden", background: "white", border: `1px solid ${C.ochre}33` }}>
                    {p.url
                      ? <img src={p.url} alt={p.name} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                      : <div style={{ width: "100%", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🏺</div>
                    }
                    <div style={{ padding: "6px 8px" }}>
                      <div style={{ fontSize: 10, color: C.mahogany, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{p.label}</div>
                      <div style={{ fontSize: 12, color: C.bark, fontWeight: 500, marginTop: 2 }}>{p.name || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => { dismissReveal(); setTab("messages"); }} style={{
                width: "100%", padding: "13px 0", borderRadius: 14, border: "none",
                background: C.ember, color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer",
                marginBottom: 10,
              }}>Open Conversation 💬</button>
              <button onClick={dismissReveal} style={{
                background: "none", border: "none", color: C.mahogany, fontSize: 13, cursor: "pointer", padding: 6,
              }}>Dismiss</button>
            </div>
          </div>
        )}

        {/* ── Edit Profile modal ── */}
        {editingProfile && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }} onClick={() => setEditingProfile(false)}>
            <div style={{
              background: C.sand, borderRadius: 20, padding: 24, width: "100%", maxWidth: 400,
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }} onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color: C.bark, marginBottom: 18 }}>
                Edit Profile
              </div>

              {/* Avatar picker */}
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div
                  onClick={() => document.getElementById("avatar-file-input").click()}
                  style={{
                    width: 72, height: 72, borderRadius: "50%", margin: "0 auto 8px",
                    background: (avatarPreview || profile?.avatar_url)
                      ? "none"
                      : `linear-gradient(135deg, ${C.ember}, ${C.mahogany})`,
                    overflow: "hidden", cursor: "pointer", position: "relative",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}>
                  {(avatarPreview || profile?.avatar_url)
                    ? <img src={avatarPreview || profile.avatar_url} alt="avatar"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ color: "white", fontSize: 22, fontWeight: 600 }}>{profileInitials}</span>
                  }
                  <div style={{
                    position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}>📷</div>
                </div>
                <input id="avatar-file-input" type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setAvatarPreview(prev => {
                      if (prev) URL.revokeObjectURL(prev);
                      return URL.createObjectURL(f);
                    });
                    setAvatarFile(f);
                  }} />
                <div style={{ fontSize: 11, color: C.mahogany }}>Tap to change photo</div>
              </div>

              <label style={{ fontSize: 12, fontWeight: 600, color: C.bark, display: "block", marginBottom: 4 }}>
                Display Name
              </label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.ochre}66`,
                  fontSize: 14, background: "white", color: C.bark, marginBottom: 14, boxSizing: "border-box",
                }}
              />
              <label style={{ fontSize: 12, fontWeight: 600, color: C.bark, display: "block", marginBottom: 4 }}>
                Bio <span style={{ fontWeight: 400, color: C.mahogany }}>(optional)</span>
              </label>
              <textarea
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
                rows={3}
                placeholder="Tell the studio a bit about yourself…"
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.ochre}66`,
                  fontSize: 14, background: "white", color: C.bark, resize: "vertical",
                  marginBottom: 20, boxSizing: "border-box", fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => {
                  if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                  setAvatarPreview(null);
                  setAvatarFile(null);
                  setEditingProfile(false);
                }} style={{
                  flex: 1, padding: "11px 0", borderRadius: 12, border: `1px solid ${C.ochre}44`,
                  background: "white", color: C.bark, fontWeight: 600, cursor: "pointer", fontSize: 14,
                }}>Cancel</button>
                <button onClick={saveProfile} disabled={savingProfile || !editName.trim()} style={{
                  flex: 2, padding: "11px 0", borderRadius: 12, border: "none",
                  background: C.ember, color: "white", fontWeight: 600, cursor: "pointer", fontSize: 14,
                  opacity: (savingProfile || !editName.trim()) ? 0.6 : 1,
                }}>{savingProfile ? "Saving…" : "Save Changes"}</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
