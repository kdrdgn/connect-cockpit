import { newIdempotencyKey, useBulk, useHistory, useListing, useRetrySync } from "@cockpit/client";
import { type Listing, MARKETPLACES, type Marketplace, type SyncEntry } from "@cockpit/contract";
import { useEffect, useRef, useState } from "react";
import { Button, IconButton } from "@/ui/Button";
import { useToasts } from "@/ui/Toast";
import { colIndex } from "./columns";
import styles from "./Drawer.module.css";
import { ExplainPanel } from "./ExplainPanel";
import { STATE_NAME } from "./FilterBar";
import { focusCell } from "./focus";
import { formatDateLong } from "./format";
import { formatPrice, gapDisplay } from "./price";
import { useUi } from "./store";
import { SyncGlyph } from "./SyncGlyph";
import { formatDuration, MARKETPLACE_NAME, syncKind, syncLabel } from "./sync";
import { useNow } from "./useNow";

const KIND_WORD = {
  live: "Live",
  pending: "Pending",
  stale: "Pending, stuck",
  error: "Error",
  mismatch: "Quantity mismatch",
  not_listed: "Not listed",
} as const;

const ago = (iso: string, now: number) => `${formatDuration(now - Date.parse(iso))} ago`;

export function Drawer({ id, returnTo }: { id: string; returnTo: { row: number; col: number } | null }) {
  const listing = useListing(id);
  const close = useUi((s) => s.closeDrawer);
  const heading = useRef<HTMLHeadingElement>(null);
  const now = useNow(true);

  useEffect(() => heading.current?.focus(), [id]);
  const onClose = () => {
    close();
    if (returnTo) void focusCell(returnTo.row, returnTo.col);
  };

  if (!listing) return null;
  return (
    <aside
      className={styles.drawer}
      aria-labelledby="drawer-title"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !e.defaultPrevented) {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <header className={styles.header}>
        <div>
          <h2 id="drawer-title" ref={heading} tabIndex={-1} className={styles.title}>
            {listing.event}
          </h2>
          <p className={styles.meta}>
            {formatDateLong(listing.date)} · {listing.venue}
            <br />
            Section {listing.section}, row {listing.row} · {listing.quantity} tickets · {formatPrice(listing.price)} (
            {gapDisplay(listing.price, listing.marketPrice).text} vs market {formatPrice(listing.marketPrice)})
          </p>
        </div>
        <IconButton label="Close sync details" onClick={onClose}>
          <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </IconButton>
      </header>

      <div className={styles.body}>
        {MARKETPLACES.map((m) => (
          <MarketplaceSection key={m} listing={listing} marketplace={m} entry={listing.sync[m]} now={now} returnTo={returnTo} />
        ))}
        <History id={id} now={now} />
      </div>
    </aside>
  );
}

function MarketplaceSection({
  listing,
  marketplace,
  entry,
  now,
  returnTo,
}: {
  listing: Listing;
  marketplace: Marketplace;
  entry: SyncEntry;
  now: number;
  returnTo: { row: number; col: number } | null;
}) {
  const retry = useRetrySync();
  const bulk = useBulk();
  const toast = useToasts((s) => s.show);
  const [confirmDelist, setConfirmDelist] = useState(false);
  const kind = syncKind(entry, listing.quantity, now);
  const name = MARKETPLACE_NAME[marketplace];
  const canRetry = kind === "error" || kind === "stale" || kind === "mismatch";
  const listed = entry.state !== "not_listed";

  const doRetry = () =>
    retry.mutate(
      { id: listing.id, marketplace },
      { onError: (e) => toast({ id: `retry:${listing.id}:${marketplace}`, tone: "danger", title: `${name}: retry failed`, body: e.message }) },
    );

  const editPrice = (initial: string) => {
    if (!returnTo) return;
    void focusCell(returnTo.row, colIndex("price")).then((ok) => {
      if (ok) useUi.getState().startEdit(listing.id, "price", initial, listing.version);
    });
  };

  const doDelist = async () => {
    setConfirmDelist(false);
    try {
      const { results } = await bulk.mutateAsync({
        ops: [{ op: "delist", id: listing.id, version: listing.version, marketplace }],
        idempotencyKey: newIdempotencyKey(),
      });
      const r = results[0];
      if (r && !r.ok) toast({ id: `delist:${listing.id}`, tone: "danger", title: `Not delisted from ${name}`, body: r.error.message });
    } catch (e) {
      toast({ id: `delist:${listing.id}`, tone: "danger", title: `Not delisted from ${name}`, body: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <section className={styles.section} aria-label={name}>
      <div className={styles.row}>
        <SyncGlyph kind={kind} />
        <span className={styles.mpName}>{name}</span>
        <span className={styles.state}>{KIND_WORD[kind]}</span>
        <span className="srOnly">{syncLabel(marketplace, entry, listing.quantity, now)}</span>
      </div>
      <p className={styles.when}>
        {STATE_NAME[entry.state]} since {ago(entry.updatedAt, now)}
        {entry.listedQuantity !== undefined && entry.listedQuantity !== listing.quantity && listed
          ? ` · lists ${entry.listedQuantity}, you have ${listing.quantity}`
          : ""}
      </p>
      {entry.state === "error" && entry.lastError && <p className={styles.error}>{entry.lastError}</p>}
      {entry.state === "error" && (
        <ExplainPanel
          listing={listing}
          marketplace={marketplace}
          onEditPrice={editPrice}
          onDelist={() => setConfirmDelist(true)}
        />
      )}
      <div className={styles.actions}>
        {/* One filled button per section: the delist confirm takes over from Retry while it is open. */}
        {canRetry && (
          <Button variant={confirmDelist ? "default" : "primary"} onClick={doRetry} disabled={retry.isPending}>
            {retry.isPending ? "Retrying…" : "Retry sync"}
          </Button>
        )}
        {entry.state === "error" && <Button onClick={() => editPrice(String(listing.price))}>Edit price</Button>}
        {listed &&
          (confirmDelist ? (
            <>
              <Button variant="danger" onClick={() => void doDelist()} autoFocus>
                Confirm delist from {name}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelist(false)}>
                Keep listed
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmDelist(true)}>
              Delist…
            </Button>
          ))}
      </div>
    </section>
  );
}

function History({ id, now }: { id: string; now: number }) {
  const history = useHistory(id);
  return (
    <section className={styles.section} aria-label="Sync history">
      <h3 className={styles.subTitle}>History</h3>
      {history.isPending ? (
        <ul className={styles.history} aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className={styles.placeholder} />
          ))}
        </ul>
      ) : history.isError ? (
        <p className={styles.when}>
          Couldn’t load history. <Button onClick={() => void history.refetch()}>Retry</Button>
        </p>
      ) : history.data.length === 0 ? (
        <p className={styles.when}>No changes yet.</p>
      ) : (
        <ul className={styles.history}>
          {history.data.slice(0, 30).map((h, i) => (
            <li key={`${h.at}-${h.marketplace}-${i}`}>
              <span className={styles.histWhen}>{ago(h.at, now)}</span>
              <span>
                {MARKETPLACE_NAME[h.marketplace]}: {STATE_NAME[h.state].toLowerCase()}
                {h.lastError ? ` · ${h.lastError}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
