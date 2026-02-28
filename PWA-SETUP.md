# Hot—Pots PWA Setup Guide

Everything you need to turn the React prototype into a fully installable
Progressive Web App, deployed free on Vercel.

---

## Files in this package

| File | Purpose |
|---|---|
| `manifest.json` | Tells the browser the app name, icons, colors, and install behavior |
| `service-worker.js` | Handles caching, offline support, push notifications, background sync |
| `usePWA.js` | React hook — install prompt, update detection, push subscriptions |
| `pottery-swap.jsx` | Main app UI |
| `auth-screens.jsx` | Auth flow UI |

---

## 1. Project structure

Your Vite + React project should look like this:

```
hotpots/
├── public/
│   ├── manifest.json           ← copy here
│   ├── service-worker.js       ← copy here
│   ├── icons/
│   │   ├── icon-72.png
│   │   ├── icon-96.png
│   │   ├── icon-128.png
│   │   ├── icon-144.png
│   │   ├── icon-152.png
│   │   ├── icon-192.png        ← also used as maskable
│   │   ├── icon-384.png
│   │   └── icon-512.png        ← also used as maskable
│   └── screenshots/
│       ├── home.png            ← optional, shown in app stores
│       └── enter.png
├── src/
│   ├── hooks/
│   │   └── usePWA.js           ← copy here
│   ├── App.jsx
│   └── main.jsx
├── index.html
└── vite.config.js
```

---

## 2. Generate icons

You have the Hot—Pots logo PNG. Use it to generate all icon sizes:

**Option A — free online tool**
Go to https://realfavicongenerator.net, upload your logo PNG,
and download the full icon package. Move the PNGs into `public/icons/`.

**Option B — command line**
```bash
npm install -g sharp-cli
for size in 72 96 128 144 152 192 384 512; do
  sharp -i logo.png -o public/icons/icon-$size.png resize $size $size
done
```

**Maskable icons** (192 and 512): These need padding around the logo so
Android doesn't clip it. Use https://maskable.app to preview and adjust.

---

## 3. Link manifest in index.html

Add these tags inside `<head>` in your `index.html`:

```html
<!-- PWA manifest -->
<link rel="manifest" href="/manifest.json" />

<!-- iOS support (Safari doesn't read manifest for these) -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Hot—Pots" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />

<!-- Theme color (browser chrome on Android) -->
<meta name="theme-color" content="#E8450A" />

<!-- Splash screen background color (iOS) -->
<meta name="msapplication-TileColor" content="#FDF0E0" />
```

---

## 4. Register the service worker in main.jsx

```jsx
// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker after app loads
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => console.log("SW registered:", reg.scope))
      .catch((err) => console.error("SW failed:", err));
  });
}
```

---

## 5. Add the usePWA hook to App.jsx

```jsx
// src/App.jsx
import { usePWA } from "./hooks/usePWA";

export default function App() {
  const { canInstall, installApp, updateAvailable, applyUpdate, isOnline } = usePWA();

  return (
    <>
      {/* Offline banner */}
      {!isOnline && (
        <div style={{
          background: "#7C2D12", color: "white",
          padding: "8px 16px", textAlign: "center",
          fontSize: 13, position: "fixed", top: 0, width: "100%", zIndex: 9999
        }}>
          📡 You're offline — some features may be unavailable
        </div>
      )}

      {/* Update available banner */}
      {updateAvailable && (
        <div style={{
          background: "#E8450A", color: "white",
          padding: "10px 16px", textAlign: "center",
          fontSize: 13, position: "fixed", top: 0, width: "100%", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12
        }}>
          🏺 A new version of Hot—Pots is ready!
          <button onClick={applyUpdate} style={{
            background: "white", color: "#E8450A",
            border: "none", borderRadius: 8,
            padding: "4px 12px", fontWeight: 600, cursor: "pointer"
          }}>
            Update now
          </button>
        </div>
      )}

      {/* Install prompt button — show this somewhere logical in your UI */}
      {canInstall && (
        <button onClick={installApp} style={{
          /* Style to match your app — could be a banner, a button in the profile
             tab, or a subtle prompt at the bottom of the home screen */
        }}>
          📲 Add Hot—Pots to your home screen
        </button>
      )}

      {/* Your main app goes here */}
    </>
  );
}
```

---

## 6. Environment variables

Create a `.env` file in your project root:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Push notifications — generate with: npx web-push generate-vapid-keys
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key   # server-side only, never expose
```

Add `.env` to `.gitignore`. On Vercel, add these in
Project Settings → Environment Variables.

---

## 7. Push notifications setup (optional but recommended)

### Generate VAPID keys
```bash
npx web-push generate-vapid-keys
```

### Create a Supabase Edge Function to send pushes

```bash
supabase functions new push-notify
```

```typescript
// supabase/functions/push-notify/index.ts
import webpush from "npm:web-push";

webpush.setVapidDetails(
  "mailto:admin@yourstudio.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

Deno.serve(async (req) => {
  const { userId, title, body, type, url } = await req.json();

  // Fetch user's push subscription from DB
  const { data } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", userId)
    .single();

  if (!data) return new Response("No subscription", { status: 404 });

  await webpush.sendNotification(
    data.subscription,
    JSON.stringify({ title, body, type, url })
  );

  return new Response("Sent", { status: 200 });
});
```

### Add push_subscriptions table to Supabase

```sql
CREATE TABLE push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)  -- one subscription per user
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subscription"
  ON push_subscriptions FOR ALL USING (auth.uid() = user_id);
```

### Trigger push notifications from DB events

Use Supabase Database Webhooks or pg_net to call your Edge Function when:
- A new row is inserted into `messages` → notify recipient
- A `matches` row is created → notify both participants
- A `raffle_rounds.status` changes to `'matching'` → notify all participants

---

## 8. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Build and deploy
npm run build
vercel --prod
```

In `vercel.json`, add a rewrite so all routes serve index.html
(required for React Router / single-page app):

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/service-worker.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    }
  ]
}
```

The `Cache-Control: no-cache` on the service worker itself is important —
it ensures users always get the latest SW version, even if browsers
try to cache it.

---

## 9. Testing the PWA

**Chrome DevTools:**
1. Open DevTools → Application tab
2. Check Manifest, Service Workers, and Storage sections
3. Use "Add to homescreen" button to test install flow
4. Check "Offline" checkbox under Service Workers to test offline mode

**Lighthouse audit:**
Run Lighthouse (DevTools → Lighthouse) and select "Progressive Web App".
Aim for a green PWA badge — this confirms everything is wired up correctly.

**On a real device:**
- Android (Chrome): Look for "Add to Home Screen" banner or three-dot menu
- iOS (Safari): Share button → "Add to Home Screen"
  Note: iOS has limited PWA support — push notifications require iOS 16.4+
  and the app must be added to home screen first.

---

## iOS notes

Safari on iOS lags behind Chrome for PWA features. Current status:
- ✅ Add to Home Screen (installable)
- ✅ Standalone display mode (no browser UI)
- ✅ Offline caching via service worker
- ✅ Push notifications — iOS 16.4+ only, and only when app is on home screen
- ❌ Background sync not yet supported on iOS
- ❌ Badging API not supported

For a studio community app, this is fine. Most critical flows work well.
Mention to members that iOS push notifications require iOS 16.4+.
