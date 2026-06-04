"use client";

import { useEffect, useState } from "react";

export default function ConnectivityBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);

    setIsOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <aside className={`offline-banner ${isOnline ? "online" : "offline"}`} aria-live="polite">
      {isOnline ? "You are online" : "Offline mode: changes are saved locally."}
    </aside>
  );
}
