"use client";
import { useSyncExternalStore } from "react";

/** True only after hydration — avoids server/client mismatch for localStorage data. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
