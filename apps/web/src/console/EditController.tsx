import { type ApiError, keys, PATCH_MUTATION_KEY, type PatchVariables, patchMutationOptions, useClient } from "@cockpit/client";
import type { Listing } from "@cockpit/contract";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useToasts } from "@/ui/Toast";
import { formatPrice } from "./price";
import { draftKey, type EditField, useUi } from "./store";

type Commit = (id: string, field: EditField, value: number, baseVersion?: number) => void;

const EditContext = createContext<Commit | null>(null);

export function useCommitEdit(): Commit {
  const commit = useContext(EditContext);
  if (!commit) throw new Error("useCommitEdit must be used inside <EditController>");
  return commit;
}

const fieldOf = (v: PatchVariables): EditField => (v.price !== undefined ? "price" : "quantity");
const show = (field: EditField, n: number) => (field === "price" ? formatPrice(n) : String(n));
const where = (l: Listing | undefined) => (l ? `${l.event}, ${l.section} row ${l.row}` : "Listing");

/**
 * One mutation observer for the whole console. Its callbacks run for every edit, even after the edited row
 * scrolls out of the virtual window, so a rollback is always announced.
 */
export function EditController({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const client = useClient();
  const toast = useToasts((s) => s.show);
  const dismiss = useToasts((s) => s.dismiss);
  const flash = useUi((s) => s.flashRollback);

  const base = useMemo(() => patchMutationOptions(qc, client), [qc, client]);
  const patch = useMutation<Listing, ApiError, PatchVariables, Awaited<ReturnType<NonNullable<typeof base.onMutate>>>>({
    ...base,
    mutationKey: PATCH_MUTATION_KEY,
    onError: (error, vars, ctx, mctx) => {
      const before = qc.getQueryData<Listing>(keys.listing(vars.id));
      base.onError?.(error, vars, ctx, mctx);
      const field = fieldOf(vars);
      const value = (vars.price ?? vars.quantity) as number;
      const toastId = `edit:${draftKey(vars.id, field)}`;
      if (error.code === "CONFLICT" && error.current) {
        toast({
          id: toastId,
          tone: "attention",
          title: `Changed elsewhere to ${show(field, error.current[field])}. Your ${show(field, value)} was not saved.`,
          body: where(error.current),
        });
        return;
      }
      flash(draftKey(vars.id, field));
      toast({
        id: toastId,
        tone: "danger",
        title: `${field === "price" ? "Price" : "Quantity"} not saved, back to ${show(field, ctx?.before[field] ?? before?.[field] ?? 0)}`,
        body: `${where(before)}: ${error.message}`,
        action:
          error.code === "VALIDATION"
            ? undefined
            : { label: `Retry ${show(field, value)}`, onAction: () => patch.mutate({ ...vars, baseVersion: undefined }) },
      });
    },
    onSuccess: (listing, vars, ctx, mctx) => {
      base.onSuccess?.(listing, vars, ctx, mctx);
      dismiss(`edit:${draftKey(vars.id, fieldOf(vars))}`);
    },
  });

  const commit = useMemo<Commit>(
    () => (id, field, value, baseVersion) =>
      patch.mutate(field === "price" ? { id, price: value, baseVersion } : { id, quantity: value, baseVersion }),
    [patch.mutate],
  );
  return <EditContext.Provider value={commit}>{children}</EditContext.Provider>;
}
