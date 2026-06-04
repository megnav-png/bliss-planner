"use client";

import { useEffect } from "react";

export default function PWAServiceBridge() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let isMounted = true;
    const CURRENT_SCRIPT = "/sw.js";

    const cleanupLegacyServiceWorkers = async () => {
      if (!("serviceWorker" in navigator) || !navigator.serviceWorker) {
        return;
      }

      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        const activePath = registration.active?.scriptURL
          ? new URL(registration.active.scriptURL).pathname
          : null;

        if (activePath && activePath !== CURRENT_SCRIPT) {
          await registration.unregister();
        }
      }

      if (typeof caches !== "undefined") {
        const cacheKeys = await caches.keys();
        const legacyPrefixes = ["wovops-dashboard-v1", "wovops-shell-v1", "vowops-dashboard"];
        await Promise.all(
          cacheKeys
            .filter((key) => legacyPrefixes.some((prefix) => key.startsWith(prefix)))
            .map((key) => caches.delete(key))
        );
      }
    };

    const register = async () => {
      try {
        await cleanupLegacyServiceWorkers();
        const registration = await navigator.serviceWorker.register("/sw.js");
        if (!isMounted) return;

        if (registration.active) {
          // keep latest metadata available for troubleshooting
          registration.update();
        }
      } catch (error) {
        console.info("Service worker registration skipped:", error);
      }
    };

    void register();
    return () => {
      isMounted = false;
    };
  }, []);

  return null;
}
