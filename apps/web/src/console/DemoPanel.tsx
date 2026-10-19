"use client";

import { describeChaos } from "@cockpit/mock";
import { useState } from "react";
import { getMockEngine } from "@/mock/MockProvider";
import { Button } from "@/ui/Button";
import styles from "./DemoPanel.module.css";

/**
 * Presenter controls for the mock (only with ?demo=1). Changes apply to the next request and keep every
 * listing as it is, so a failure path can be shown on demand instead of waiting for luck.
 */
export default function DemoPanel({ onDrift }: { onDrift: () => void }) {
  const engine = getMockEngine();
  const [open, setOpen] = useState(false);
  const [chaos, setChaosOn] = useState(engine?.config.chaos ?? true);
  const [failRate, setFailRate] = useState(engine?.config.failRate ?? 15);
  if (!engine) return null;

  return (
    <div className={styles.wrap}>
      {open && (
        <section className={styles.panel} aria-label="Demo controls">
          <h2 className={styles.title}>Demo controls</h2>
          <p className={styles.note}>These change the mock API in this tab, not any real marketplace.</p>
          <p className={styles.note} aria-live="polite">
            Now: {describeChaos(engine.config)}
          </p>
          <label className={styles.row}>
            <input
              type="checkbox"
              checked={chaos}
              onChange={(e) => {
                engine.setChaos({ chaos: e.target.checked });
                setChaosOn(e.target.checked);
                setFailRate(engine.config.failRate);
              }}
            />
            Chaos (latency, failures, 429s)
          </label>
          <label className={styles.slider}>
            <span>
              Write failure rate <output className={styles.value}>{failRate}%</output>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={failRate}
              onChange={(e) => {
                const v = Number(e.target.value);
                engine.setChaos({ failRate: v });
                setFailRate(v);
              }}
            />
          </label>
          <Button
            onClick={() => {
              engine.tick();
              onDrift();
            }}
          >
            Drift now
          </Button>
        </section>
      )}
      <Button className={styles.toggle} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? "Close demo controls" : "Demo"}
      </Button>
    </div>
  );
}
