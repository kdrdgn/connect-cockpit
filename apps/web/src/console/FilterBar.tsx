import { MARKETPLACES, type Marketplace, SYNC_STATES, type SyncFilter, type SyncState } from "@cockpit/contract";
import { type FormEvent, useState } from "react";
import { Button } from "@/ui/Button";
import { Popover } from "@/ui/Popover";
import type { FilterValues, useFilters } from "./filters";
import styles from "./FilterBar.module.css";
import { MARKETPLACE_NAME } from "./sync";

type SetValues = ReturnType<typeof useFilters>["setValues"];

export const STATE_NAME: Record<SyncState, string> = {
  live: "Live",
  pending: "Pending",
  error: "Error",
  not_listed: "Not listed",
};

export type OpenPanel = { kind: "sync"; focus?: Marketplace } | { kind: "dates" } | { kind: "price" } | null;

const hasSync = (list: readonly SyncFilter[], m: Marketplace, s: SyncState) =>
  list.some((f) => f.marketplace === m && f.state === s);

export function FilterBar({
  values,
  setValues,
  open,
  onOpen,
}: {
  values: FilterValues;
  setValues: SetValues;
  open: OpenPanel;
  onOpen: (panel: OpenPanel) => void;
}) {
  const toggleSync = (m: Marketplace, s: SyncState) => {
    const next = hasSync(values.sync, m, s)
      ? values.sync.filter((f) => !(f.marketplace === m && f.state === s))
      : [...values.sync, { marketplace: m, state: s }];
    void setValues({ sync: next.length ? next : null });
  };

  return (
    <div className={styles.bar} role="search" aria-label="Filter listings">
      <input
        type="search"
        className={styles.search}
        placeholder="Search events  ( / )"
        aria-label="Search events"
        data-search
        value={values.q ?? ""}
        onChange={(e) => void setValues({ q: e.target.value || null })}
        onKeyDown={(e) => {
          if (e.key === "Escape" && values.q) void setValues({ q: null });
        }}
      />

      <Popover
        label={values.sync.length ? `Sync (${values.sync.length})` : "Sync"}
        active={values.sync.length > 0}
        open={open?.kind === "sync"}
        onOpenChange={(o) => onOpen(o ? { kind: "sync" } : null)}
      >
        <table className={styles.matrix}>
          <caption className="srOnly">Show listings in these states. Choices combine with OR.</caption>
          <thead>
            <tr>
              <td />
              {SYNC_STATES.map((s) => (
                <th key={s} scope="col">
                  {STATE_NAME[s]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MARKETPLACES.map((m) => (
              <tr key={m} className={open?.kind === "sync" && open.focus === m ? styles.focusRow : undefined}>
                <th scope="row">{MARKETPLACE_NAME[m]}</th>
                {SYNC_STATES.map((s) => (
                  <td key={s}>
                    <input
                      type="checkbox"
                      aria-label={`${MARKETPLACE_NAME[m]}: ${STATE_NAME[s].toLowerCase()}`}
                      checked={hasSync(values.sync, m, s)}
                      onChange={() => toggleSync(m, s)}
                      // Opened from a marketplace column header: start on that marketplace's "Error" box.
                      autoFocus={open?.kind === "sync" && open.focus === m && s === "error"}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Popover>

      <Popover
        label="Dates"
        active={!!(values.dateFrom || values.dateTo)}
        open={open?.kind === "dates"}
        onOpenChange={(o) => onOpen(o ? { kind: "dates" } : null)}
      >
        <div className={styles.fields}>
          <label htmlFor="date-from">From</label>
          <input
            id="date-from"
            type="date"
            className={styles.input}
            value={values.dateFrom ?? ""}
            max={values.dateTo ?? undefined}
            onChange={(e) => void setValues({ dateFrom: e.target.value || null })}
            autoFocus
          />
          <label htmlFor="date-to">To</label>
          <input
            id="date-to"
            type="date"
            className={styles.input}
            value={values.dateTo ?? ""}
            min={values.dateFrom ?? undefined}
            onChange={(e) => void setValues({ dateTo: e.target.value || null })}
          />
        </div>
      </Popover>

      <Popover
        label="Price range"
        active={values.priceMin !== null || values.priceMax !== null}
        open={open?.kind === "price"}
        onOpenChange={(o) => onOpen(o ? { kind: "price" } : null)}
      >
        <PriceRange
          min={values.priceMin}
          max={values.priceMax}
          onApply={(priceMin, priceMax) => {
            void setValues({ priceMin, priceMax });
            onOpen(null);
          }}
        />
      </Popover>

      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={values.problem === "any"}
          onChange={(e) => void setValues({ problem: e.target.checked ? "any" : null })}
        />
        Problems only
      </label>
    </div>
  );
}

/** Price bounds commit together on Apply or Enter, so typing "150" doesn't send three requests. */
function PriceRange({ min, max, onApply }: { min: number | null; max: number | null; onApply: (min: number | null, max: number | null) => void }) {
  const [lo, setLo] = useState(min === null ? "" : String(min));
  const [hi, setHi] = useState(max === null ? "" : String(max));
  const parse = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) || Number(v) < 0 ? null : Number(v));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onApply(parse(lo), parse(hi));
  };
  return (
    <form onSubmit={submit}>
      <div className={styles.fields}>
        <label htmlFor="price-min">Min £</label>
        <input id="price-min" className={styles.input} inputMode="decimal" value={lo} onChange={(e) => setLo(e.target.value)} autoFocus />
        <label htmlFor="price-max">Max £</label>
        <input id="price-max" className={styles.input} inputMode="decimal" value={hi} onChange={(e) => setHi(e.target.value)} />
      </div>
      <div className={styles.panelFooter}>
        <Button type="submit" variant="primary">
          Apply
        </Button>
      </div>
    </form>
  );
}
