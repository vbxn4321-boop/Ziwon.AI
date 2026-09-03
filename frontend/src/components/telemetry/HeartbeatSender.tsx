"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = localStorage.getItem("ziwon_session_id");
  if (!sid) {
    sid = "sess_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
    localStorage.setItem("ziwon_session_id", sid);
  }
  return sid;
}

function getAuthUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("ziwon_auth_user") || sessionStorage.getItem("ziwon_auth_user");
    if (raw) {
      const u = JSON.parse(raw);
      return u?.id || u?.email || null;
    }
  } catch {}
  return null;
}

export function HeartbeatSender() {
  const pathname = usePathname();
  const sessionIdRef = useRef<string>("");

  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();

    const sendPing = () => {
      // Don't ping if user has backgrounded the browser tab to save resources
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      const sid = sessionIdRef.current || getOrCreateSessionId();
      const userId = getAuthUserId();

      try {
        fetch("/api/telemetry/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sid,
            userId,
            path: window.location.pathname,
            isUser: !!userId,
          }),
          keepalive: true,
        }).catch(() => {});
      } catch {}
    };

    // Initial ping
    sendPing();

    // Periodic heartbeat every 30 seconds
    const interval = setInterval(sendPing, 30000);

    // Visibility change handler (ping immediately when tab becomes visible again)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendPing();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Send ping on page navigation
  useEffect(() => {
    if (!sessionIdRef.current) return;
    try {
      const userId = getAuthUserId();
      fetch("/api/telemetry/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          userId,
          path: pathname,
          isUser: !!userId,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }, [pathname]);

  return null; // Invisible component
}
