import { useEffect, useRef } from "react";

export type Shortcuts = Partial<Record<"n" | "N" | "/" | "?" | "o", (e: KeyboardEvent) => void>>;

/** True when a key press belongs to whatever has focus: typing, a dialog, a menu. */
export function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  if (t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return true;
  if (t instanceof HTMLInputElement) return !["checkbox", "radio", "button", "submit", "reset"].includes(t.type);
  return false;
}

/**
 * Single-letter shortcuts. They never fire while typing or while a modal dialog is open, and each one has a
 * visible control too, because screen readers in browse mode keep letter keys for themselves.
 */
export function useShortcuts(map: Shortcuts) {
  const ref = useRef(map);
  ref.current = map;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target) || document.querySelector("dialog[open]")) return;
      const handler = ref.current[e.key as keyof Shortcuts];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
