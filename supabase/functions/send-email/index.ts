// ============================================================
// Supabase Edge Function — send-email
// supabase/functions/send-email/index.ts
//
// Sends transactional emails via Resend (https://resend.com).
// Free plan: 3,000 emails/month — more than enough for ~100 MAU.
//
// DEPLOY:
//   supabase functions deploy send-email
//
// ENVIRONMENT VARIABLES (set in Supabase dashboard → Edge Functions):
//   RESEND_API_KEY            — from https://resend.com/api-keys
//   FROM_EMAIL                — e.g. "Hot—Pots <noreply@hotpots.studio>"
//   WEBHOOK_SECRET            — same secret used in push-notify
//   SUPABASE_URL              — auto-set by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — auto-set by Supabase
//
// EMAIL TYPES:
//   submission_confirmed — sent after a member submits their pieces
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ─────────────────────────────────────────────────────────────
// Email templates
// ─────────────────────────────────────────────────────────────
function buildEmail(type: string, data: Record<string, string>): { subject: string; html: string } | null {

  if (type === "submission_confirmed") {
    const closes = data.closesAt
      ? new Date(data.closesAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })
      : "soon";

    return {
      subject: `✅ You're in for ${data.roundTitle}!`,
      html: `
<div style="font-family:'DM Sans',sans-serif;max-width:500px;margin:0 auto;padding:32px 24px;background:#FDF0E0;border-radius:16px">
  <div style="font-size:48px;text-align:center;margin-bottom:12px">🏺</div>
  <h2 style="font-family:'Playfair Display',Georgia,serif;color:#44200A;text-align:center;margin:0 0 8px">
    Submission received!
  </h2>
  <p style="color:#7C2D12;font-size:14px;text-align:center;margin:0 0 24px">
    We've got your pieces for <strong>${data.roundTitle}</strong>.<br>
    The round closes on <strong>${closes}</strong>.
  </p>
  <table style="width:100%;border-collapse:separate;border-spacing:8px 0;margin-bottom:24px">
    <tr>
      <td style="padding:14px;background:#FEF3C7;border-radius:12px;color:#44200A;font-size:13px;vertical-align:top">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#7C2D12;margin-bottom:6px">
          Piece 1 — Raffle
        </div>
        <strong>${data.piece1Name}</strong>
      </td>
      <td style="padding:14px;background:#FEF3C7;border-radius:12px;color:#44200A;font-size:13px;vertical-align:top">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#7C2D12;margin-bottom:6px">
          Piece 2 — Your Choice
        </div>
        <strong>${data.piece2Name}</strong>
      </td>
    </tr>
  </table>
  <p style="color:#7C2D12;font-size:13px;text-align:center">
    After the round closes, check your <strong>Messages</strong> tab to meet your match and arrange the handoff!
  </p>
  <hr style="border:none;border-top:1px solid #D9770633;margin:24px 0">
  <p style="color:#92400E;font-size:12px;text-align:center;margin:0">— The Hot—Pots Studio</p>
</div>`,
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (secret && req.headers.get("x-supabase-webhook-secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return new Response("Invalid JSON", { status: 400 }); }

  const { userId, type, data } = body;

  if (!userId || !type) {
    return new Response(JSON.stringify({ error: "Missing required fields: userId, type" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  // Look up the user's email via the admin API
  const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(userId);
  const email = userData?.user?.email;
  if (userErr || !email) {
    console.error("[send-email] Could not find email for userId:", userId, userErr?.message);
    return new Response(JSON.stringify({ error: "No email for user" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const email_content = buildEmail(type, data ?? {});
  if (!email_content) {
    console.log(`[send-email] Unknown type "${type}" — skipping`);
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_KEY) {
    // Graceful no-op if Resend isn't configured yet
    console.warn("[send-email] RESEND_API_KEY not set — email skipped");
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from: Deno.env.get("FROM_EMAIL") ?? "Hot—Pots <noreply@hotpots.studio>",
      to:   email,
      subject: email_content.subject,
      html:    email_content.html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[send-email] Resend error:", res.status, errText);
    return new Response(JSON.stringify({ error: errText }), {
      status: 502, headers: { "Content-Type": "application/json" },
    });
  }

  console.log(`[send-email] ✓ ${type} sent to ${email}`);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
