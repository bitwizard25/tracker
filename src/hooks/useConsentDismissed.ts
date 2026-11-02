"use client";

import { useCallback, useSyncExternalStore } from "react";
import { consentDismissKey } from "@/lib/domain/consent";

const listeners = new Set<() => void>();
const dismissedInMemory = new Set<string>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether this user dismissed the consent card this browser session (false on the server). */
export function useConsentDismissed(userId: number): [boolean, () => void] {
  const key = consentDismissKey(userId);

  const readSnapshot = useCallback((): boolean => {
    if (dismissedInMemory.has(key)) return true;
    try {
      return window.sessionStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  }, [key]);

  const dismissed = useSyncExternalStore(subscribe, readSnapshot, () => false);

  const dismiss = useCallback(() => {
    dismissedInMemory.add(key);
    try {
      window.sessionStorage.setItem(key, "1");
    } catch {
      // storage unavailable (private mode): the in-memory flag still hides it for this page
    }
    listeners.forEach((listener) => listener());
  }, [key]);

  return [dismissed, dismiss];
}
