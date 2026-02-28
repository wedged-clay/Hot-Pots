// ============================================================
// usePWA.js — React hook for Hot—Pots PWA features
// Drop this in src/hooks/usePWA.js
// ============================================================
//
// Provides:
//   - Service worker registration & update detection
//   - Install prompt capture ("Add to Home Screen")
//   - Push notification subscription (via Supabase Edge Functions)
//   - Online/offline status
//
// Usage in App.jsx:
//   const { canInstall, installApp, updateAvailable, applyUpdate, isOnline } = usePWA();

import { useState, useEffect, useCallback } from "react";

// Your Supabase project URL for push notification endpoint
const PUSH_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-notify`;

// VAPID public key — generate with: npx web-push generate-vapid-keys
// Store in .env as VITE_VAPID_PUBLIC_KEY
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function usePWA() {
  const [swRegistration, setSwRegistration]       = useState(null);
  const [installPrompt,  setInstallPrompt]         = useState(null);
  const [canInstall,     setCanInstall]             = useState(false);
  const [updateAvailable,setUpdateAvailable]        = useState(false);
  const [isOnline,       setIsOnline]               = useState(navigator.onLine);
  const [pushEnabled,    setPushEnabled]            = useState(false);

  // ── Register service worker ─────────────────────────────────
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/service-worker.js", { scope: "/" })
      .then((reg) => {
        setSwRegistration(reg);
        console.log("[PWA] Service worker registered:", reg.scope);

        // Detect available update
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              console.log("[PWA] Update available");
              setUpdateAvailable(true);
            }
          });
        });
      })
      .catch((err) => console.error("[PWA] SW registration failed:", err));

    // Listen for controller change (after update applied)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    // Listen for messages from SW (e.g. navigation requests from notifications)
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "NAVIGATE") {
        // In a real app, use your router: navigate(event.data.url)
        window.location.href = event.data.url;
      }
    });
  }, []);

  // ── Capture install prompt ──────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault(); // Stop browser's default mini-infobar
      setInstallPrompt(e);
      setCanInstall(true);
      console.log("[PWA] Install prompt captured");
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Detect when app is installed (hides the install button)
  useEffect(() => {
    const handler = () => {
      setCanInstall(false);
      console.log("[PWA] App installed!");
    };
    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

  // ── Online / offline ────────────────────────────────────────
  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // ── Actions ─────────────────────────────────────────────────

  // Trigger the "Add to Home Screen" prompt
  const installApp = useCallback(async () => {
    if (!installPrompt) return;
    const { outcome } = await installPrompt.prompt();
    console.log("[PWA] Install outcome:", outcome);
    if (outcome === "accepted") setCanInstall(false);
  }, [installPrompt]);

  // Apply a waiting service worker update
  const applyUpdate = useCallback(() => {
    if (!swRegistration?.waiting) return;
    swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
  }, [swRegistration]);

  // Request push notification permission and subscribe
  // Call this when user opts in (e.g. after first match result)
  const enablePush = useCallback(async (userId) => {
    if (!("PushManager" in window) || !swRegistration) return false;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.log("[PWA] Push permission denied");
        return false;
      }

      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Send subscription to Supabase Edge Function to store against user
      await fetch(PUSH_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, subscription }),
      });

      console.log("[PWA] Push notifications enabled");
      setPushEnabled(true);
      return true;
    } catch (err) {
      console.error("[PWA] Push subscription failed:", err);
      return false;
    }
  }, [swRegistration]);

  return {
    canInstall,       // boolean — show "Add to Home Screen" button
    installApp,       // fn — trigger install prompt
    updateAvailable,  // boolean — show "Update available" banner
    applyUpdate,      // fn — apply the waiting SW and reload
    isOnline,         // boolean — false when device is offline
    pushEnabled,      // boolean — push notifications are active
    enablePush,       // fn(userId) — request permission and subscribe
  };
}

// ── Helpers ───────────────────────────────────────────────────

// Convert VAPID key from base64url string to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
