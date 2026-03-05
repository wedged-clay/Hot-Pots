// ============================================================
// Supabase Edge Function — run-matching
// supabase/functions/run-matching/index.ts
//
// Runs the two-piece matching algorithm for a round:
//   Piece 1 — random shuffle and pair all submissions
//   Piece 2 — greedy ranked-choice bipartite matching
//
// Creates rows in: matches, conversations
// Updates: raffle_rounds.status → 'matching'
//          submissions.status   → 'matched' (for matched subs)
//
// DEPLOY:
//   supabase functions deploy run-matching
//
// INVOKE (from AdminPortal):
//   supabase.functions.invoke("run-matching", { body: { round_id } })
//
// ENVIRONMENT VARIABLES (auto-set by Supabase):
//   SUPABASE_URL              — auto-set
//   SUPABASE_SERVICE_ROLE_KEY — auto-set (needed to bypass RLS)
//
// CONVERSATION WINDOW:
//   expires_at = round.closes_at + 30 days
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Submission {
  id:                string;
  user_id:           string;
  piece_2_rankings:  Array<{ id: string; rank: number }> | null;
}

interface P1Pair { a: string; b: string; }
interface P2Pair { a: string; b: string; rankA: number; rankB: number; }

// ── Algorithm ────────────────────────────────────────────────────────────────

/**
 * Piece 1 — random shuffle and pair.
 * If an odd number of submissions exist, the last one is left unmatched.
 */
function matchPiece1(subs: Submission[]): { pairs: P1Pair[]; unmatched: string[] } {
  const shuffled = [...subs].sort(() => Math.random() - 0.5);
  const pairs: P1Pair[]      = [];
  const unmatched: string[]  = [];

  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    pairs.push({ a: shuffled[i].id, b: shuffled[i + 1].id });
  }
  if (shuffled.length % 2 !== 0) {
    unmatched.push(shuffled[shuffled.length - 1].id);
  }
  return { pairs, unmatched };
}

/**
 * Piece 2 — greedy ranked-choice bipartite matching.
 *
 * piece_2_rankings = [{id: <submissionId>, rank: 1|2|3|…}]
 * Rank 1 = most wanted. Lower combined score = better mutual fit.
 *
 * Strategy: enumerate all possible pairs, score each as
 * (rank A gave B) + (rank B gave A), sort ascending, then
 * greedily take the best available pair. O(n²) — fine up to ~500.
 */
function matchPiece2(subs: Submission[]): { pairs: P2Pair[]; unmatched: string[] } {
  const PENALTY = 99999; // applied when a submission wasn't ranked at all

  // Build lookup: submissionId → Map<otherSubId, rank>
  const rankOf = new Map<string, Map<string, number>>();
  for (const s of subs) {
    const m = new Map<string, number>();
    for (const r of s.piece_2_rankings ?? []) {
      m.set(r.id, r.rank);
    }
    rankOf.set(s.id, m);
  }

  // Score every possible pair
  interface ScoredPair { a: string; b: string; score: number; rankA: number; rankB: number; }
  const scored: ScoredPair[] = [];
  for (let i = 0; i < subs.length; i++) {
    for (let j = i + 1; j < subs.length; j++) {
      const idA  = subs[i].id;
      const idB  = subs[j].id;
      const rAB  = rankOf.get(idA)?.get(idB) ?? PENALTY;
      const rBA  = rankOf.get(idB)?.get(idA) ?? PENALTY;
      scored.push({ a: idA, b: idB, score: rAB + rBA, rankA: rAB, rankB: rBA });
    }
  }
  scored.sort((x, y) => x.score - y.score); // ascending — best first

  // Greedy assignment
  const taken  = new Set<string>();
  const pairs:     P2Pair[] = [];
  const unmatched: string[] = [];

  for (const p of scored) {
    if (taken.has(p.a) || taken.has(p.b)) continue;
    pairs.push({
      a:     p.a,
      b:     p.b,
      rankA: p.rankA >= PENALTY ? 0 : p.rankA,
      rankB: p.rankB >= PENALTY ? 0 : p.rankB,
    });
    taken.add(p.a);
    taken.add(p.b);
  }
  for (const s of subs) {
    if (!taken.has(s.id)) unmatched.push(s.id);
  }
  return { pairs, unmatched };
}

// ── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // ── Auth: verify caller is admin ──────────────────────────────────────────
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  const { data: caller } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (caller?.role !== "admin") return json({ error: "Forbidden — admin only" }, 403);

  // ── Parse input ───────────────────────────────────────────────────────────
  const body = await req.json().catch(() => ({}));
  const { round_id } = body as { round_id?: string };
  if (!round_id) return json({ error: "round_id is required" }, 400);

  // ── Fetch round ───────────────────────────────────────────────────────────
  const { data: round, error: roundErr } = await supabase
    .from("raffle_rounds")
    .select("id, status, closes_at")
    .eq("id", round_id)
    .single();

  if (roundErr || !round) return json({ error: "Round not found" }, 404);
  if (round.status !== "open") {
    return json({ error: `Round status is '${round.status}', expected 'open'` }, 400);
  }

  // ── Fetch submissions ─────────────────────────────────────────────────────
  const { data: subs, error: subErr } = await supabase
    .from("submissions")
    .select("id, user_id, piece_2_rankings")
    .eq("round_id", round_id);

  if (subErr)              return json({ error: subErr.message }, 500);
  if (!subs || subs.length < 2) return json({ error: "Need at least 2 submissions to run matching" }, 400);

  // ── Run algorithms ────────────────────────────────────────────────────────
  const p1 = matchPiece1(subs as Submission[]);
  const p2 = matchPiece2(subs as Submission[]);

  // ── Update round status → 'matching' ─────────────────────────────────────
  const { error: statusErr } = await supabase
    .from("raffle_rounds")
    .update({ status: "matching" })
    .eq("id", round_id);
  if (statusErr) return json({ error: statusErr.message }, 500);

  // ── Insert matches ────────────────────────────────────────────────────────
  const matchRows = [
    ...p1.pairs.map(p => ({
      round_id,
      submission_a: p.a,
      submission_b: p.b,
      match_type:   "random",
    })),
    ...p2.pairs.map(p => ({
      round_id,
      submission_a: p.a,
      submission_b: p.b,
      match_type:   "choice",
      rank_a:       p.rankA,
      rank_b:       p.rankB,
    })),
  ];

  const { data: insertedMatches, error: matchErr } = await supabase
    .from("matches")
    .insert(matchRows)
    .select("id, submission_a, submission_b");

  if (matchErr) return json({ error: matchErr.message }, 500);

  // ── Mark submissions as matched ───────────────────────────────────────────
  // Conversations are NOT created here — they are created when the admin
  // clicks "Publish Results", keeping matches hidden from members during review.
  const matchedSubIds = (insertedMatches ?? []).flatMap(m => [m.submission_a, m.submission_b]);
  if (matchedSubIds.length > 0) {
    await supabase.from("submissions")
      .update({ status: "matched" })
      .in("id", matchedSubIds);
  }

  // ── Return summary ────────────────────────────────────────────────────────
  return json({
    success:     true,
    piece1Pairs: p1.pairs.length,
    piece2Pairs: p2.pairs.length,
    unmatched:   [...p1.unmatched, ...p2.unmatched],
  });
});
