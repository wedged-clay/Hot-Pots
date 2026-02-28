// ============================================================
// Supabase Edge Function — push-notify
// supabase/functions/push-notify/index.ts
//
// Sends push notifications to Hot—Pots members via Web Push.
//
// DEPLOY:
//   supabase functions deploy push-notify
//
// ENVIRONMENT VARIABLES (set in Supabase dashboard):
//   VAPID_PUBLIC_KEY          — from: npx web-push generate-vapid-keys
//   VAPID_PRIVATE_KEY         — from: npx web-push generate-vapid-keys
//   VAPID_CONTACT             — mailto:admin@yourstudio.com
//   WEBHOOK_SECRET            — any random string, set in DB Webhook config too
//   SUPABASE_URL              — auto-set by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — auto-set by Supabase
//
// DATABASE WEBHOOKS to configure (Dashboard → Database → Webhooks):
//   1. Table: messages      | Event: INSERT → POST this function URL
//   2. Table: matches       | Event: INSERT → POST this function URL
//   3. Table: raffle_rounds | Event: UPDATE → POST this function URL
//
// SCHEDULED EXPIRY WARNINGS (pg_cron — runs daily at 9am):
//   SELECT cron.schedule(
//     'hotpots-expiry-warnings',
//     '0 9 * * *',
//     $$
//       SELECT net.http_post(
//         url     := 'https://<project>.supabase.co/functions/v1/push-notify',
//         headers := '{"Content-Type":"application/json","x-supabase-webhook-secret":"<WEBHOOK_SECRET>"}',
//         body    := '{"type":"expiry_check"}'
//       )
//     $$
//   );
//
// NOTIFICATION TYPES:
//   new_message   — new message from a matched partner
//   match_made    — raffle match assigned (both participants notified)
//   round_open    — a new swap round opens (broadcast to all members)
//   round_matched — matching complete, results ready
//   expiry_warn   — conversation closing in 3 days
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush          from "npm:web-push@3";

// ── Supabase admin client ─────────────────────────────────────
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ── VAPID ─────────────────────────────────────────────────────
webpush.setVapidDetails(
  Deno.env.get("VAPID_CONTACT")!,       // e.g. mailto:admin@yourstudio.com
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

// ─────────────────────────────────────────────────────────────
// Notification payload builder
// ─────────────────────────────────────────────────────────────
function buildPayload(type: string, data: Record<string, string>) {
  switch (type) {

    case "new_message":
      return {
        title: `💬 ${data.senderName}`,
        body:  data.preview.length > 80 ? data.preview.slice(0, 80) + "…" : data.preview,
        type:  "message",
        url:   `/?tab=messages&convo=${data.conversationId}`,
      };

    case "match_made":
      return {
        title: "🏺 Your match is ready!",
        body:  `You've been matched with ${data.partnerName}. Tap to see their piece and start chatting.`,
        type:  "match",
        url:   "/?tab=messages",
      };

    case "round_open":
      return {
        title: `🔥 ${data.roundTitle} is open!`,
        body:  `Submit your two pieces before ${data.closesAt}. Spots are filling fast.`,
        type:  "round",
        url:   "/?tab=enter",
      };

    case "round_matched":
      return {
        title: "🎲 Matches have been drawn!",
        body:  `The ${data.roundTitle} results are in — check your messages to meet your partner.`,
        type:  "match",
        url:   "/?tab=messages",
      };

    case "expiry_warn":
      return {
        title: "⏳ Chat closing in 3 days",
        body:  `Your conversation with ${data.partnerName} closes on ${data.expiresAt}. Don't forget to arrange your swap!`,
        type:  "expiry",
        url:   `/?tab=messages&convo=${data.conversationId}`,
      };

    default:
      return {
        title: "Hot—Pots",
        body:  data.body || "You have a new notification.",
        type:  "generic",
        url:   "/",
      };
  }
}

// ─────────────────────────────────────────────────────────────
// Send to a single user
// ─────────────────────────────────────────────────────────────
async function sendToUser(userId: string, payload: object): Promise<boolean> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    console.log(`[push] No subscription found for ${userId}`);
    return false;
  }

  try {
    await webpush.sendNotification(data.subscription, JSON.stringify(payload));
    console.log(`[push] ✓ Sent to ${userId}`);
    return true;
  } catch (err: any) {
    if (err.statusCode === 410) {
      // Subscription expired — remove it so we don't keep trying
      console.log(`[push] Subscription expired for ${userId}, removing`);
      await supabase.from("push_subscriptions").delete().eq("user_id", userId);
    } else {
      console.error(`[push] Failed for ${userId}:`, err.statusCode, err.message);
    }
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// Broadcast to all subscribed members (batched)
// ─────────────────────────────────────────────────────────────
async function sendToAll(payload: object): Promise<void> {
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id, subscription");

  if (!subs?.length) return;
  console.log(`[push] Broadcasting to ${subs.length} subscribers`);

  const BATCH_SIZE = 50;
  for (let i = 0; i < subs.length; i += BATCH_SIZE) {
    await Promise.allSettled(
      subs.slice(i, i + BATCH_SIZE).map(async ({ user_id, subscription }) => {
        try {
          await webpush.sendNotification(subscription, JSON.stringify(payload));
        } catch (err: any) {
          if (err.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("user_id", user_id);
          }
        }
      })
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Webhook handlers
// ─────────────────────────────────────────────────────────────

async function handleNewMessage(record: any) {
  const { data: convo } = await supabase
    .from("conversations")
    .select("participant_a, participant_b")
    .eq("id", record.conversation_id)
    .single();
  if (!convo) return;

  const recipientId = convo.participant_a === record.sender_id
    ? convo.participant_b
    : convo.participant_a;

  const { data: sender } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", record.sender_id)
    .single();

  await sendToUser(recipientId, buildPayload("new_message", {
    senderName:     sender?.display_name ?? "A member",
    preview:        record.body,
    conversationId: record.conversation_id,
  }));
}

async function handleMatchMade(record: any) {
  // Load both submissions with their owner profiles
  const [{ data: subA }, { data: subB }] = await Promise.all([
    supabase.from("submissions").select("user_id, profiles(display_name)").eq("id", record.submission_a).single(),
    supabase.from("submissions").select("user_id, profiles(display_name)").eq("id", record.submission_b).single(),
  ]);
  if (!subA || !subB) return;

  await Promise.all([
    sendToUser(subA.user_id, buildPayload("match_made", { partnerName: (subB.profiles as any).display_name })),
    sendToUser(subB.user_id, buildPayload("match_made", { partnerName: (subA.profiles as any).display_name })),
  ]);
}

async function handleRoundStatusChange(record: any, oldRecord: any) {
  if (record.status === oldRecord?.status) return;

  if (record.status === "open") {
    await sendToAll(buildPayload("round_open", {
      roundTitle: record.title,
      closesAt:   new Date(record.closes_at).toLocaleDateString("en-US", { month: "long", day: "numeric" }),
    }));
  }

  if (record.status === "matching") {
    // Only notify members who actually entered this round
    const { data: subs } = await supabase
      .from("submissions")
      .select("user_id")
      .eq("round_id", record.id);

    const payload = buildPayload("round_matched", { roundTitle: record.title });
    if (subs?.length) {
      await Promise.allSettled(subs.map((s) => sendToUser(s.user_id, payload)));
    }
  }
}

async function handleExpiryCheck() {
  // Find conversations expiring within the next 3 days (but not already expired)
  const now          = new Date();
  const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const { data: convos } = await supabase
    .from("conversations")
    .select(`
      id, participant_a, participant_b, expires_at,
      profile_a:profiles!participant_a(display_name),
      profile_b:profiles!participant_b(display_name)
    `)
    .gt("expires_at",  now.toISOString())
    .lte("expires_at", threeDaysOut.toISOString());

  if (!convos?.length) {
    console.log("[push] No expiring conversations today");
    return;
  }

  console.log(`[push] Sending expiry warnings for ${convos.length} conversation(s)`);

  for (const c of convos) {
    const expiresStr = new Date(c.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    await Promise.all([
      sendToUser(c.participant_a, buildPayload("expiry_warn", {
        partnerName:    (c as any).profile_b?.display_name ?? "your partner",
        expiresAt:      expiresStr,
        conversationId: c.id,
      })),
      sendToUser(c.participant_b, buildPayload("expiry_warn", {
        partnerName:    (c as any).profile_a?.display_name ?? "your partner",
        expiresAt:      expiresStr,
        conversationId: c.id,
      })),
    ]);
  }
}

// ─────────────────────────────────────────────────────────────
// Main request handler
// ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verify webhook secret
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (secret && req.headers.get("x-supabase-webhook-secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return new Response("Invalid JSON", { status: 400 }); }

  const { type, table, record, old_record } = body;

  try {
    // ── Database webhook events ──
    if (type === "INSERT") {
      if (table === "messages") await handleNewMessage(record);
      if (table === "matches")  await handleMatchMade(record);
    }
    if (type === "UPDATE" && table === "raffle_rounds") {
      await handleRoundStatusChange(record, old_record);
    }

    // ── Scheduled cron trigger ──
    if (type === "expiry_check") {
      await handleExpiryCheck();
    }

    // ── Direct API call (e.g. from admin dashboard) ──
    if (body.notificationType) {
      const payload = buildPayload(body.notificationType, body.data ?? {});
      if (body.userId)            await sendToUser(body.userId, payload);
      else if (body.userIds)      await Promise.allSettled(body.userIds.map((id: string) => sendToUser(id, payload)));
      else if (body.broadcast)    await sendToAll(payload);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[push-notify] Unhandled error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
