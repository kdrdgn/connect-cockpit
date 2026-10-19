"use client";

import { useLiveChanges } from "@cockpit/client";
import type { SortField } from "@cockpit/contract";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/ui/Button";
import { ToastRegion } from "@/ui/Toast";
import { BulkDialog } from "./BulkActions";
import { BulkBar } from "./BulkBar";
import { Chips } from "./Chips";
import styles from "./Console.module.css";
import { DensityToggle, useDensity } from "./DensityToggle";
import { Drawer } from "./Drawer";
import { EditController } from "./EditController";
import { FilterBar, type OpenPanel } from "./FilterBar";
import { CLEARED_FILTERS, DEFAULT_SORT, useFilters } from "./filters";
import { HeaderRow } from "./Header";
import { LiveIndicator } from "./LiveIndicator";
import { jumpToProblem, ProblemNav } from "./ProblemNav";
import { useProblemOrder } from "./problems";
import { RateLimitNotice } from "./RateLimit";
import { SeatingMap } from "./SeatingMap";
import { SelectAll } from "./SelectAll";
import { ViewIdsContext } from "./selection";
import { ShortcutSheet } from "./ShortcutSheet";
import { isTypingTarget, useShortcuts } from "./shortcuts";
import { useUi } from "./store";
import { Table } from "./Table";
import { useBulkFlow } from "./useBulkFlow";
import { useListingView } from "./useListingView";

// Not in the broker's bundle: loaded only when the page is opened with ?demo=1.
const DemoPanel = dynamic(() => import("./DemoPanel"), { ssr: false });

function useDemoFlag() {
  const [demo, setDemo] = useState(false);
  useEffect(() => setDemo(new URLSearchParams(window.location.search).get("demo") === "1"), []);
  return demo;
}

export function Console() {
  const { values, query, setValues } = useFilters();
  const view = useListingView(query);
  const live = useLiveChanges(view.changesCursor);
  const problems = useProblemOrder(view.loadedIds);
  const bulkFlow = useBulkFlow();
  const [panel, setPanel] = useState<OpenPanel>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const drawerId = useUi((s) => s.drawerId);
  const drawerReturn = useUi((s) => s.drawerReturn);
  const demo = useDemoFlag();
  useDensity();

  // A bulk action must only touch rows the broker can see, so a new filter starts a new selection.
  const queryKey = JSON.stringify(query);
  useEffect(() => useUi.getState().clearSelection(), [queryKey]);

  useShortcuts({
    n: () => jumpToProblem(problems.order, problems.indexOf, 1),
    N: () => jumpToProblem(problems.order, problems.indexOf, -1),
    "/": () => document.querySelector<HTMLInputElement>("[data-search]")?.focus(),
    "?": () => setHelpOpen(true),
    o: () => {
      const el = document.activeElement as HTMLElement | null;
      const id = el?.closest<HTMLElement>("tr[data-id]")?.dataset.id;
      if (!id) return;
      const returnTo = el?.dataset.row !== undefined ? { row: Number(el.dataset.row), col: Number(el.dataset.col) } : null;
      useUi.getState().openDrawer(id, returnTo);
    },
  });

  // Undo the last bulk change from anywhere except while typing, where Ctrl/Cmd+Z undoes text.
  const undo = useRef(bulkFlow.undo);
  undo.current = bulkFlow.undo;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== "z") return;
      if (isTypingTarget(e.target) || document.querySelector("dialog[open]")) return;
      const last = useUi.getState().lastBulk;
      if (!last || last.kind === "undo") return;
      e.preventDefault();
      void undo.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onSort = (field: SortField) => {
    const dir = values.sort.field === field && values.sort.dir === "asc" ? "desc" : "asc";
    const isDefault = field === DEFAULT_SORT.field && dir === DEFAULT_SORT.dir;
    void setValues({ sort: isDefault ? null : { field, dir } });
  };

  const tableMessage =
    view.isError && !view.data ? (
      <div className={styles.message} role="alert">
        <span className={styles.messageTitle}>Couldn’t load listings.</span>
        <span>{view.error.message}</span>
        <Button variant="primary" onClick={() => void view.refetch()}>
          Retry
        </Button>
      </div>
    ) : view.isSuccess && view.total === 0 ? (
      <div className={styles.message}>
        <span className={styles.messageTitle}>No listings match these filters.</span>
        <Button onClick={() => void setValues(CLEARED_FILTERS)}>Clear filters</Button>
      </div>
    ) : undefined;

  return (
    <EditController>
      <ViewIdsContext.Provider value={view.loadedIds}>
        <div className={styles.console}>
          <a className={styles.skip} href="#bulk-actions">
            Skip to bulk actions
          </a>
          <header className={styles.toolbar}>
            <h1 className={styles.title}>Listings</h1>
            <FilterBar values={values} setValues={setValues} open={panel} onOpen={setPanel} />
            <div className={styles.status}>
              <ProblemNav order={problems.order} indexOf={problems.indexOf} loading={view.isPending} />
              <span className={styles.count}>{view.isPending ? "Loading…" : `${view.total} listings`}</span>
              <LiveIndicator status={live.status} />
              <DensityToggle />
              <Button variant="ghost" aria-keyshortcuts="?" onClick={() => setHelpOpen(true)}>
                Shortcuts <kbd className={styles.kbd}>?</kbd>
              </Button>
            </div>
          </header>
          <div className={styles.chips}>
            <Chips values={values} setValues={setValues} />
          </div>
          <main className={styles.tableArea}>
            <div className={styles.notices}>
              <RateLimitNotice />
            </div>
            <Table
              ids={view.ids}
              total={view.total}
              loading={view.isPending}
              dimmed={view.isPlaceholderData}
              message={tableMessage}
              header={
                <HeaderRow
                  selectAll={<SelectAll ids={view.loadedIds} />}
                  sort={values.sort}
                  onSort={onSort}
                  onMarketplace={(m) => setPanel({ kind: "sync", focus: m })}
                />
              }
            />
          </main>
          <BulkBar flow={bulkFlow} />
          <BulkDialog flow={bulkFlow} />
          <div className={styles.side}>
            {drawerId ? (
              <Drawer key={drawerId} id={drawerId} returnTo={drawerReturn} />
            ) : (
              <SeatingMap
                loadedIds={view.loadedIds}
                activeSection={values.section}
                onToggleSection={(section) => void setValues({ section: values.section === section ? null : section })}
              />
            )}
          </div>
          <ShortcutSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
          {demo && <DemoPanel onDrift={live.pollNow} />}
          <ToastRegion />
        </div>
      </ViewIdsContext.Provider>
    </EditController>
  );
}
