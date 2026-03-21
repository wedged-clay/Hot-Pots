-- ============================================================
-- Migration 002 — Add match_type to raffle_rounds
--
-- Each round now has a single matching mode chosen by the admin:
--   'random'  — all submissions are randomly paired
--   'ranking' — members rank each other's pieces; greedy
--               ranked-choice bipartite matching is used
--
-- Default is 'random' so existing rounds are unaffected.
-- ============================================================

ALTER TABLE raffle_rounds
  ADD COLUMN match_type text NOT NULL DEFAULT 'random'
  CHECK (match_type IN ('random', 'ranking'));
