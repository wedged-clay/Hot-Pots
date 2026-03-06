export function formatMsgDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function toInitials(name) {
  return (name ?? "?").split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

export function formatCountdown(closesAt) {
  if (!closesAt) return null;
  const diff = new Date(closesAt) - Date.now();
  if (diff <= 0) return { label: "Closed", urgent: true };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return { label: `Closes in ${hours}h`, urgent: true };
  const days = Math.floor(hours / 24);
  return { label: `Closes in ${days} day${days === 1 ? "" : "s"}`, urgent: days <= 2 };
}

export function daysLeft(expiresAt) {
  return Math.ceil((new Date(expiresAt) - Date.now()) / (1000 * 60 * 60 * 24));
}
