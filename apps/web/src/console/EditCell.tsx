import { PATCH_MUTATION_KEY, type PatchVariables } from "@cockpit/client";
import { useIsMutating } from "@tanstack/react-query";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { colIndex } from "./columns";
import { parseEdit } from "./edit";
import { useCommitEdit } from "./EditController";
import { focusCell, neighbour } from "./focus";
import { formatPrice } from "./price";
import { draftKey, type EditField, useIsEditing, useIsFlashing, useUi } from "./store";
import styles from "./Table.module.css";

const display = (field: EditField, v: number) => (field === "price" ? formatPrice(v) : String(v));

/**
 * A price or quantity cell. Navigation mode is a real button, so Tab reaches it natively; edit mode is an input
 * whose text lives in the UI store, so incoming drift never overwrites what the broker is typing.
 */
export function EditCell({
  id,
  index,
  field,
  value,
  version,
  label,
}: {
  id: string;
  index: number;
  field: EditField;
  value: number;
  version: number;
  label: string;
}) {
  const editing = useIsEditing(id, field);
  const flashing = useIsFlashing(id, field);
  const saving =
    useIsMutating({
      mutationKey: PATCH_MUTATION_KEY,
      predicate: (m) => {
        const v = m.state.variables as PatchVariables | undefined;
        return v?.id === id && v[field] !== undefined;
      },
    }) > 0;
  const startEdit = useUi((s) => s.startEdit);
  const col = colIndex(field);

  const cls = [styles.cellButton, saving && styles.saving, flashing && styles.rollback].filter(Boolean).join(" ");
  if (editing) return <EditInput id={id} index={index} field={field} value={value} label={label} />;
  return (
    <button
      type="button"
      className={cls}
      data-row={index}
      data-col={col}
      aria-label={`${label}: ${display(field, value)}${saving ? ", saving" : ""}${flashing ? ", not saved" : ""}`}
      onClick={() => startEdit(id, field, String(value), version)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "F2") {
          e.preventDefault();
          startEdit(id, field, String(value), version);
        } else if (/^[0-9]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          startEdit(id, field, e.key, version, false);
        }
      }}
    >
      {display(field, value)}
    </button>
  );
}

function EditInput({ id, index, field, value, label }: { id: string; index: number; field: EditField; value: number; label: string }) {
  const draft = useUi((s) => s.drafts[draftKey(id, field)] ?? "");
  const select = useUi((s) => s.editing?.select ?? true);
  const baseVersion = useUi((s) => s.editing?.baseVersion);
  const setDraft = useUi((s) => s.setDraft);
  const endEdit = useUi((s) => s.endEdit);
  const commit = useCommitEdit();
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  const errorId = useId();
  const col = colIndex(field);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (select) el.select();
    else el.setSelectionRange(el.value.length, el.value.length);
  }, [select]);

  // Read at commit time, not from this render: a fast "3" + Tab can arrive before React re-renders.
  const currentDraft = () => useUi.getState().drafts[draftKey(id, field)] ?? "";

  /** Validates and sends. Returns false (staying in edit mode) when the text is invalid. */
  const tryCommit = (): boolean => {
    const parsed = parseEdit(field, currentDraft());
    if (!parsed.ok) {
      setError(parsed.message);
      return false;
    }
    if (parsed.value !== value) commit(id, field, parsed.value, baseVersion);
    return true;
  };

  const leave = (to: { row: number; col: number } | null) => {
    done.current = true;
    endEdit();
    if (to) void focusCell(to.row, to.col);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (tryCommit()) leave({ row: index, col });
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      leave({ row: index, col });
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (tryCommit()) leave(neighbour(index, col, e.shiftKey ? -1 : 1));
    }
  };

  return (
    <span className={styles.editWrap}>
      <input
        ref={ref}
        className={styles.editInput}
        inputMode={field === "price" ? "decimal" : "numeric"}
        aria-label={`${label}, editing. Enter to save, Escape to cancel`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        value={draft}
        data-row={index}
        data-col={col}
        data-editing=""
        onChange={(e) => {
          setDraft(id, field, e.target.value);
          if (error) setError(null);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          // Clicking away commits a valid change and drops an invalid one, like a spreadsheet.
          if (done.current) return;
          const parsed = parseEdit(field, currentDraft());
          if (parsed.ok && parsed.value !== value) commit(id, field, parsed.value, baseVersion);
          leave(null);
        }}
      />
      {error && (
        <span id={errorId} className={styles.editError} role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

