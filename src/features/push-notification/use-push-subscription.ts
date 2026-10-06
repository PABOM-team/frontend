"use client";

import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";
import { env } from "@/shared/config/env";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export type PushStatus =
  "checking" | "unsupported" | "needs-install" | "idle" | "subscribed" | "denied";

async function detectStatus(): Promise<PushStatus> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    return isIOS && !isStandalone ? "needs-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "subscribed" : "idle";
}

/**
 * 관리 일정 알림용 웹 푸시 구독.
 * iOS는 홈 화면에 추가한 PWA에서만 푸시가 동작하므로 needs-install 상태를 따로 둔다.
 */
export function usePushSubscription() {
  const [status, setStatus] = useState<PushStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    detectStatus().then((next) => {
      if (!cancelled) setStatus(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function subscribe() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(env.vapidPublicKey),
    });
    await api.post("push-subscriptions", { json: sub.toJSON() });
    setStatus("subscribed");
  }

  async function unsubscribe() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api.delete("push-subscriptions", { json: { endpoint: sub.endpoint } });
      await sub.unsubscribe();
    }
    setStatus("idle");
  }

  return { status, subscribe, unsubscribe };
}
