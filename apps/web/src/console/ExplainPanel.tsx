import { useExplainSync } from "@cockpit/client";
import { type ExplainCause, type ExplainResult, type Listing, type Marketplace, suggestPrice } from "@cockpit/contract";
import { Button } from "@/ui/Button";
import styles from "./ExplainPanel.module.css";
import { formatPrice } from "./price";
import { MARKETPLACE_NAME } from "./sync";

const CAUSE_WORD: Record<ExplainCause, string> = {
  price_rule: "Price rule",
  quantity_mismatch: "Quantity mismatch",
  auth_expired: "Account login expired",
  event_mapping: "Event not matched",
  marketplace_outage: "Marketplace not responding",
  duplicate_listing: "Duplicate listing",
  unknown: "Unknown cause",
};

export type ExplainHandlers = {
  onRetry: () => void;
  /** Opens the inline price editor filled with `initial`; nothing is sent until the broker confirms. */
  onEditPrice: (initial: string) => void;
  /** Opens the existing two-step delist confirmation. */
  onDelist: () => void;
};

/** One errored marketplace's explanation and suggestion. Every suggestion starts a manual action; none writes by itself. */
export function ExplainPanel({ listing, marketplace, ...handlers }: { listing: Listing; marketplace: Marketplace } & ExplainHandlers) {
  const query = useExplainSync(listing, marketplace);
  const result = query.data?.result ?? null;
  const loading = query.isFetching && !result;

  return (
    <div className={styles.panel} aria-live="polite" aria-busy={loading}>
      {loading ? (
        <p className={styles.status} role="status">
          Reading the error…
        </p>
      ) : result ? (
        <Explanation result={result} listing={listing} marketplace={marketplace} mock={query.data?.meta.source === "mock"} {...handlers} />
      ) : (
        <p className={styles.status}>
          No suggestion.{" "}
          <Button variant="ghost" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </p>
      )}
    </div>
  );
}

function Explanation({
  result,
  listing,
  marketplace,
  mock,
  onRetry,
  onEditPrice,
  onDelist,
}: { result: ExplainResult; listing: Listing; marketplace: Marketplace; mock: boolean } & ExplainHandlers) {
  const suggestion = suggestionFor(result, listing, marketplace);
  return (
    <div className={result.flagged ? `${styles.result} ${styles.flagged}` : styles.result}>
      <p className={styles.meta}>
        <span className={styles.source}>{mock ? "Mock AI" : "AI"}</span>
        <span>{CAUSE_WORD[result.cause]}</span>
        {result.confidence === "low" && <span>Low confidence</span>}
      </p>
      <p className={styles.text}>{result.explanation}</p>
      {suggestion ? (
        <Button
          onClick={() => {
            if (suggestion.action === "adjust_price") onEditPrice(String(suggestion.price));
            else if (suggestion.action === "delist") onDelist();
            else onRetry();
          }}
        >
          Suggested: {suggestion.label}
        </Button>
      ) : (
        <p className={styles.none}>No action suggested.</p>
      )}
    </div>
  );
}

type Suggestion = { action: "retry" | "delist"; label: string } | { action: "adjust_price"; label: string; price: number };

function suggestionFor(result: ExplainResult, listing: Listing, marketplace: Marketplace): Suggestion | null {
  switch (result.action) {
    case "retry":
      return { action: "retry", label: "Retry sync" };
    case "delist":
      return { action: "delist", label: `Delist from ${MARKETPLACE_NAME[marketplace]}…` };
    case "adjust_price": {
      const { price, capped } = suggestPrice({ floor: result.floor, marketPrice: listing.marketPrice });
      const cap = capped ? (price > listing.marketPrice ? " (capped at 30% above market)" : " (limited to 30% below market)") : "";
      return { action: "adjust_price", label: `Adjust price to ${formatPrice(price)}${cap}`, price };
    }
    case "none":
      return null;
  }
}
