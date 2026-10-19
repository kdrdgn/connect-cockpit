import { type ReactNode, useEffect, useId, useRef } from "react";
import { Button } from "./Button";
import styles from "./Popover.module.css";

/**
 * A disclosure panel under its trigger. Escape or a click outside closes it and returns focus to the trigger.
 * Controlled, so other parts of the page (a column header) can open it too.
 */
export function Popover({
  label,
  open,
  onOpenChange,
  active,
  children,
}: {
  label: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shows the trigger as "this filter is set". */
  active?: boolean;
  children: ReactNode;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, onOpenChange]);
  return (
    <div
      ref={wrap}
      className={styles.wrap}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          onOpenChange(false);
          trigger.current?.focus();
        }
      }}
    >
      <Button
        ref={trigger}
        className={[styles.trigger, active && styles.active].filter(Boolean).join(" ")}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => onOpenChange(!open)}
      >
        {label}
        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
          <path d="M1 2.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.25" />
        </svg>
      </Button>
      <div id={id} className={styles.panel} hidden={!open}>
        {open && children}
      </div>
    </div>
  );
}
