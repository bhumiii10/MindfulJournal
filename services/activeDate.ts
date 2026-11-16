// services/activeDate.ts
// Single source of truth for which journal day the app is looking at, so
// Home, Journal and Chat never disagree about the date.
import { useSyncExternalStore } from 'react';
import { toDateISO } from './db';

let current = toDateISO();
const listeners = new Set<() => void>();

export function getActiveDate(): string {
  return current;
}

export function setActiveDate(dateISO: string): void {
  if (dateISO === current) return;
  current = dateISO;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useActiveDate(): string {
  return useSyncExternalStore(subscribe, getActiveDate);
}
