import { keys } from "@cockpit/client";
import type { Listing } from "@cockpit/contract";
import { type Point, VENUE, type VenueSection } from "@cockpit/mock";
import { useQueryClient } from "@tanstack/react-query";
import { type KeyboardEvent, useMemo, useState } from "react";
import { Button } from "@/ui/Button";
import styles from "./SeatingMap.module.css";
import { useUi } from "./store";

const pts = (p: readonly Point[]) => p.map(([x, y]) => `${x},${y}`).join(" ");

function inside([x, y]: Point, poly: readonly Point[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function distToEdges([x, y]: Point, poly: readonly Point[]): number {
  let min = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j]!;
    const [bx, by] = poly[i]!;
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1)));
    min = Math.min(min, Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))));
  }
  return min;
}

/** Where a label fits: the grid point deepest inside the shape, so L-shaped sections get a sensible spot. */
function labelPoint(poly: readonly Point[]): Point {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const centre: Point = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  let best = centre;
  let bestScore = -Infinity;
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += 5) {
    for (let y = Math.min(...ys); y <= Math.max(...ys); y += 5) {
      if (!inside([x, y], poly)) continue;
      // Deepest point wins; among equally deep ones (tall rectangles), the one nearest the middle.
      const score = distToEdges([x, y], poly) - 0.01 * Math.hypot(x - centre[0], y - centre[1]);
      if (score > bestScore) [best, bestScore] = [[x, y], score];
    }
  }
  return best;
}

const LABELS = new Map(VENUE.sections.map((s) => [s.id, labelPoint(s.points)]));

/** Listings per section in the current view. Sections never drift, so this only changes with the view. */
function useSectionCounts(loadedIds: readonly string[]) {
  const qc = useQueryClient();
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const id of loadedIds) {
      const l = qc.getQueryData<Listing>(keys.listing(id));
      if (l) counts.set(l.section, (counts.get(l.section) ?? 0) + 1);
    }
    return counts;
  }, [loadedIds, qc]);
}

export function SeatingMap({
  loadedIds,
  activeSection,
  onToggleSection,
}: {
  loadedIds: readonly string[];
  activeSection: string | null;
  onToggleSection: (section: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const counts = useSectionCounts(loadedIds);
  const qc = useQueryClient();
  // The focused row's section, or the drawer listing's when the drawer is open.
  const highlightId = useUi((s) => s.drawerId ?? s.focusedRowId);
  const highlighted = highlightId ? qc.getQueryData<Listing>(keys.listing(highlightId))?.section ?? null : null;

  return (
    <section className={collapsed ? `${styles.map} ${styles.collapsed}` : styles.map} aria-label="Venue map">
      <header className={styles.header}>
        {!collapsed && <h2 className={styles.title}>{VENUE.name}</h2>}
        <Button variant="ghost" aria-expanded={!collapsed} onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? "Map" : "Hide map"}
        </Button>
      </header>
      {!collapsed && (
        <>
          <svg className={styles.svg} viewBox={VENUE.viewBox} role="group" aria-label={`${VENUE.name} sections. Choose one to filter the table.`}>
            <polygon className={styles.stage} points={pts(VENUE.stage)} />
            <text className={styles.stageLabel} x={400} y={54} textAnchor="middle" aria-hidden="true">
              Stage
            </text>
            {VENUE.sections.map((s) => (
              <Section
                key={s.id}
                section={s}
                count={counts.get(s.id) ?? 0}
                active={activeSection === s.id}
                highlighted={highlighted === s.id}
                onToggle={() => onToggleSection(s.id)}
              />
            ))}
          </svg>
          <p className={styles.legend}>
            <span className={styles.swatchHighlight} aria-hidden="true" /> current row
            <span className={styles.swatchActive} aria-hidden="true" /> filtering by
          </p>
        </>
      )}
    </section>
  );
}

function Section({
  section,
  count,
  active,
  highlighted,
  onToggle,
}: {
  section: VenueSection;
  count: number;
  active: boolean;
  highlighted: boolean;
  onToggle: () => void;
}) {
  const [x, y] = LABELS.get(section.id)!;
  const cls = [styles.section, styles[section.level], active && styles.active, highlighted && styles.highlighted, count === 0 && styles.empty]
    .filter(Boolean)
    .join(" ");
  const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };
  return (
    <g
      className={cls}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={`Section ${section.id}${section.label !== section.id ? ` (${section.label})` : ""}, ${count} listing${count === 1 ? "" : "s"}${highlighted ? ", current row" : ""}`}
      data-section={section.id}
      onClick={onToggle}
      onKeyDown={onKeyDown}
    >
      <polygon points={pts(section.points)} />
      <text x={x} y={y - 2} textAnchor="middle" className={styles.label} aria-hidden="true">
        {section.id}
      </text>
      <text x={x} y={y + 24} textAnchor="middle" className={styles.count} aria-hidden="true">
        {count}
      </text>
    </g>
  );
}
