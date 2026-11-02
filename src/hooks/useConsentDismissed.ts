"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "consent-prompt-dismissed";
const listeners = new Set<() => void>();
let dismissedInMemory = false;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readSnapshot(): boolean {
  if (dismissedInMemory) return true;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Whether the consent card was dismissed this browser session (false on the server). */
export function useConsentDismissed(): [boolean, () => void] {
  const dismissed = useSyncExternalStore(subscribe, readSnapshot, () => false);

  const dismiss = useCallback(() => {
    dismissedInMemory = true;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // storage unavailable (private mode): the in-memory flag still hides it for this page
    }
    listeners.forEach((listener) => listener());
  }, []);

  return [dismissed, dismiss];
}
