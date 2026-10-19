import { type ReactNode, useEffect } from "react";
import { create } from "zustand";
import { Button, IconButton } from "./Button";
import styles from "./Toast.module.css";

export type ToastTone = "danger" | "attention" | "info";

export type Toast = {
  id: string;
  tone: ToastTone;
  title: string;
  body?: ReactNode;
  action?: { label: string; onAction: () => void };
};

type ToastStore = {
  toasts: Toast[];
  show: (toast: Toast) => void;
  dismiss: (id: string) => void;
};

/** Toasts stay until dismissed or replaced by one with the same id, so a broker never misses a rollback. */
export const useToasts = create<ToastStore>()((set) => ({
  toasts: [],
  show: (toast) => set((s) => ({ toasts: [...s.toasts.filter((t) => t.id !== toast.id), toast].slice(-4) })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Runs the newest toast's action. Bound to Alt+R, because Tab can't get past a virtualized table quickly. */
export function runLatestAction(): boolean {
  const { toasts, dismiss } = useToasts.getState();
  const t = [...toasts].reverse().find((x) => x.action);
  if (!t?.action) return false;
  dismiss(t.id);
  t.action.onAction();
  return true;
}

export function ToastRegion() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // e.code, not e.key: on a Mac, Alt+R types "®".
      if (e.altKey && !e.metaKey && !e.ctrlKey && e.code === "KeyR" && runLatestAction()) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <section className={styles.region} aria-live="polite" aria-label="Notifications">
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.tone]}`} role={t.tone === "danger" ? "alert" : "status"}>
          <div className={styles.body}>
            <div className={styles.title}>{t.title}</div>
            {t.body}
          </div>
          <div className={styles.actions}>
            {t.action && (
              <Button
                aria-keyshortcuts="Alt+R"
                onClick={() => {
                  dismiss(t.id);
                  t.action?.onAction();
                }}
              >
                {t.action.label}
                <kbd className={styles.kbd} aria-hidden="true">Alt R</kbd>
              </Button>
            )}
            <IconButton label="Dismiss" onClick={() => dismiss(t.id)}>
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </IconButton>
          </div>
        </div>
      ))}
    </section>
  );
}
