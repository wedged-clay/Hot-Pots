import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";

export function useProfileStats(profile) {
  const [profileStats, setProfileStats] = useState({ rounds: 0, piecesGiven: 0 });

  useEffect(() => {
    if (!profile) { setProfileStats({ rounds: 0, piecesGiven: 0 }); return; }
    supabase.from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .then(({ count }) => setProfileStats({ rounds: count ?? 0, piecesGiven: (count ?? 0) * 2 }));
  }, [profile]);

  return profileStats;
}
