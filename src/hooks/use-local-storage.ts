import { useEffect, useState } from "react";

/** State that persists to localStorage. Accepts a value or a lazy initializer. */
export function useLocalStorage<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved) as T;
    } catch {
      // Fall through to the initial value.
    }
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or blocked. The app keeps working for this session.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
