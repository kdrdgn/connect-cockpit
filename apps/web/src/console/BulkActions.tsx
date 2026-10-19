import { MARKETPLACES, type Marketplace, priceHealth } from "@cockpit/contract";
import { useState } from "react";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import styles from "./BulkActions.module.css";
import type { BulkIntent, PreviewRow } from "./bulkPreview";
import { STATE_NAME } from "./FilterBar";
import { PriceGap } from "./PriceGap";
import { formatPrice } from "./price";
import { useViewIds } from "./selection";
import { type LastBulk, useUi } from "./store";
import { MARKETPLACE_NAME } from "./sync";
import { failedCount, succeededCount, useBulkFlow } from "./useBulkFlow";

const pctText = (pct: number) => (pct > 0 ? `+${pct}%` : `−${-pct}%`);
const intentText = (i: BulkIntent) => (i.kind === "price" ? `${pctText(i.pct)} price` : `Delist from ${MARKETPLACE_NAME[i.marketplace]}`);

/** Controls in the bulk bar when rows are selected. */
export function BulkControls({ flow }: { flow: ReturnType<typeof useBulkFlow> }) {
  const ids = useViewIds();
  const [pct, setPct] = useState("-10");
  const [mp, setMp] = useState<Marketplace>("stubhub");
  const n = Number(pct);
  const pctValid = pct.trim() !== "" && Number.isFinite(n) && n !== 0 && n > -100 && n <= 200;
  return (
    <>
      <form
        className={styles.group}
        onSubmit={(e) => {
          e.preventDefault();
          if (pctValid) flow.preview({ kind: "price", pct: n }, ids);
        }}
      >
        <label htmlFor="bulk-pct">Change price by</label>
        <input id="bulk-pct" className={styles.pct} inputMode="numeric" value={pct} onChange={(e) => setPct(e.target.value)} aria-describedby="bulk-pct-unit" />
        <span id="bulk-pct-unit">%</span>
        <Button type="submit" disabled={!pctValid} aria-label="Preview price change">
          Preview…
        </Button>
      </form>
      <form
        className={styles.group}
        onSubmit={(e) => {
          e.preventDefault();
          flow.preview({ kind: "delist", marketplace: mp }, ids);
        }}
      >
        <label htmlFor="bulk-mp">Delist from</label>
        <select id="bulk-mp" className={styles.select} value={mp} onChange={(e) => setMp(e.target.value as Marketplace)}>
          {MARKETPLACES.map((m) => (
            <option key={m} value={m}>
              {MARKETPLACE_NAME[m]}
            </option>
          ))}
        </select>
        <Button type="submit" aria-label="Preview delist">
          Preview…
        </Button>
      </form>
    </>
  );
}

export function resultSummary(b: LastBulk): string {
  const ok = succeededCount(b);
  const failed = failedCount(b);
  const verb = b.kind === "undo" ? "undone" : b.intent.kind === "delist" ? `delisted from ${MARKETPLACE_NAME[b.intent.marketplace]}` : "updated";
  return failed ? `${ok} ${verb}, ${failed} failed` : `${ok} ${verb}`;
}

export function undoLabel(b: LastBulk): string {
  const n = succeededCount(b);
  return b.intent.kind === "delist" ? `Relist ${n} (may lose position)` : `Undo ${n} change${n === 1 ? "" : "s"}`;
}

/** Retry failed / Undo, shown in the result dialog and again in the bulk bar after it closes. */
export function LastBulkActions({ flow }: { flow: ReturnType<typeof useBulkFlow> }) {
  const last = useUi((s) => s.lastBulk);
  const busy = useUi((s) => s.bulk.stage === "applying");
  if (!last) return null;
  const failed = failedCount(last);
  const canUndo = last.kind !== "undo" && succeededCount(last) > 0;
  return (
    <>
      {failed > 0 && (
        <Button onClick={() => void flow.retryFailed()} disabled={busy}>
          Retry failed ({failed})
        </Button>
      )}
      {canUndo && (
        <Button onClick={() => void flow.undo()} disabled={busy} aria-keyshortcuts="Control+Z Meta+Z">
          {undoLabel(last)}
        </Button>
      )}
    </>
  );
}

export function BulkDialog({ flow }: { flow: ReturnType<typeof useBulkFlow> }) {
  const bulk = useUi((s) => s.bulk);
  const last = useUi((s) => s.lastBulk);
  const open = bulk.stage !== "idle";

  if (bulk.stage === "preview") {
    const count = bulk.ops.length;
    return (
      <Dialog
        open={open}
        title={`Preview: ${intentText(bulk.intent)} on ${bulk.rows.length} listing${bulk.rows.length === 1 ? "" : "s"}`}
        onClose={flow.close}
        footer={
          <>
            <Button onClick={flow.close}>Cancel</Button>
            <Button variant="primary" onClick={() => void flow.apply()} disabled={count === 0} autoFocus>
              {count === 0 ? "Nothing to change" : `Apply to ${count} listing${count === 1 ? "" : "s"}`}
            </Button>
          </>
        }
      >
        <PreviewTable rows={bulk.rows} />
      </Dialog>
    );
  }

  if (bulk.stage === "applying") {
    return (
      <Dialog open title="Applying" onClose={() => {}}>
        <p role="status" className={styles.status}>
          {bulk.label}
        </p>
      </Dialog>
    );
  }

  if (bulk.stage === "result" && last) {
    const failures = last.results.flatMap((r) => (r.ok ? [] : [r]));
    return (
      <Dialog
        open
        title={resultSummary(last)}
        onClose={flow.close}
        footer={
          <>
            <LastBulkActions flow={flow} />
            <Button variant="primary" onClick={flow.close} autoFocus>
              Close
            </Button>
          </>
        }
      >
        <p role="status" className={styles.status}>
          {resultSummary(last)}.{" "}
          {failures.length ? "These rows kept their previous values:" : "Every change was accepted."}
        </p>
        {failures.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">Seats</th>
                <th scope="col">Why it failed</th>
              </tr>
            </thead>
            <tbody>
              {failures.map((f) => {
                const l = last.before.get(f.id);
                return (
                  <tr key={f.id} data-listing-id={f.id}>
                    <td>{l?.event ?? f.id}</td>
                    <td>{l ? `${l.section} · row ${l.row}` : ""}</td>
                    <td>{f.error.message}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Dialog>
    );
  }
  return null;
}

function PreviewTable({ rows }: { rows: readonly PreviewRow[] }) {
  const priceRows = rows.filter((r) => r.kind === "price");
  if (priceRows.length) {
    return (
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Event</th>
            <th scope="col">Seats</th>
            <th scope="col" className={styles.num}>Old</th>
            <th scope="col" className={styles.num}>New</th>
            <th scope="col" className={styles.num}>Market</th>
            <th scope="col" className={styles.num}>Gap</th>
            <th scope="col">Health</th>
          </tr>
        </thead>
        <tbody>
          {priceRows.map((r) => (
            <tr key={r.id}>
              <td>{r.listing.event}</td>
              <td>{`${r.listing.section} · row ${r.listing.row}`}</td>
              <td className={styles.num}>{formatPrice(r.oldPrice)}</td>
              <td className={`${styles.num} ${styles.new}`}>{formatPrice(r.newPrice)}</td>
              <td className={styles.num}>{formatPrice(r.listing.marketPrice)}</td>
              <td className={styles.num}>
                <PriceGap price={r.newPrice} marketPrice={r.listing.marketPrice} />
              </td>
              <td>
                <HealthWord band={r.health.band} was={priceHealth(r.oldPrice, r.listing.marketPrice).band} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Event</th>
          <th scope="col">Seats</th>
          <th scope="col">Now</th>
          <th scope="col">After</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) =>
          r.kind === "delist" ? (
            <tr key={r.id} className={r.skip ? styles.skip : undefined}>
              <td>{r.listing.event}</td>
              <td>{`${r.listing.section} · row ${r.listing.row}`}</td>
              <td>{STATE_NAME[r.state]}</td>
              <td>{r.skip ? "Already not listed, skipped" : "Not listed"}</td>
            </tr>
          ) : null,
        )}
      </tbody>
    </table>
  );
}

const BAND_WORD = { overpriced: "Overpriced", above: "Above market", at_market: "At market", below: "Below market", underpriced: "Underpriced" } as const;

function HealthWord({ band, was }: { band: keyof typeof BAND_WORD; was: keyof typeof BAND_WORD }) {
  const attention = band === "overpriced" || band === "underpriced";
  return (
    <span className={attention ? styles.attention : undefined}>
      {BAND_WORD[band]}
      {band !== was && <span className={styles.was}> (was {BAND_WORD[was].toLowerCase()})</span>}
    </span>
  );
}
