import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { CLEARED_FILTERS, type FilterValues, type useFilters } from "./filters";
import { STATE_NAME } from "./FilterBar";
import { MARKETPLACE_NAME } from "./sync";

type SetValues = ReturnType<typeof useFilters>["setValues"];

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fmt = (d: string) => shortDate.format(new Date(d));

/** One chip per active filter, named in words, so the URL is readable on screen. Sort is not a filter. */
export function activeChips(v: FilterValues, set: SetValues): { key: string; label: string; remove: () => void }[] {
  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (v.q) chips.push({ key: "q", label: `Search: “${v.q}”`, remove: () => void set({ q: null }) });
  for (const f of v.sync) {
    chips.push({
      key: `sync-${f.marketplace}-${f.state}`,
      label: `${MARKETPLACE_NAME[f.marketplace]}: ${STATE_NAME[f.state].toLowerCase()}`,
      remove: () => {
        const rest = v.sync.filter((s) => s !== f);
        void set({ sync: rest.length ? rest : null });
      },
    });
  }
  if (v.dateFrom) chips.push({ key: "dateFrom", label: `From ${fmt(v.dateFrom)}`, remove: () => void set({ dateFrom: null }) });
  if (v.dateTo) chips.push({ key: "dateTo", label: `To ${fmt(v.dateTo)}`, remove: () => void set({ dateTo: null }) });
  if (v.priceMin !== null) chips.push({ key: "priceMin", label: `Min £${v.priceMin}`, remove: () => void set({ priceMin: null }) });
  if (v.priceMax !== null) chips.push({ key: "priceMax", label: `Max £${v.priceMax}`, remove: () => void set({ priceMax: null }) });
  if (v.section) chips.push({ key: "section", label: `Section ${v.section}`, remove: () => void set({ section: null }) });
  if (v.problem) chips.push({ key: "problem", label: "Problems only", remove: () => void set({ problem: null }) });
  return chips;
}

export function Chips({ values, setValues }: { values: FilterValues; setValues: SetValues }) {
  const chips = activeChips(values, setValues);
  if (chips.length === 0) return null;
  const clearAll = () => void setValues(CLEARED_FILTERS);
  return (
    <>
      <span className="srOnly">Active filters:</span>
      {chips.map((c) => (
        <Chip key={c.key} label={c.label} onRemove={c.remove} />
      ))}
      {chips.length > 1 && (
        <Button variant="ghost" onClick={clearAll}>
          Clear all
        </Button>
      )}
    </>
  );
}
