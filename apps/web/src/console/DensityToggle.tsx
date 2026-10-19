import { useEffect } from "react";
import styles from "./DensityToggle.module.css";
import { DENSITY_KEY, useUi } from "./store";

/** Mirrors the store's density onto <html data-density>, where the token CSS switches row height and padding. */
export function useDensity() {
  const density = useUi((s) => s.density);
  useEffect(() => {
    document.documentElement.dataset.density = density;
    try {
      localStorage.setItem(DENSITY_KEY, density);
    } catch {
      // not persisted; the toggle still works for this page
    }
  }, [density]);
}

export function DensityToggle() {
  const density = useUi((s) => s.density);
  const setDensity = useUi((s) => s.setDensity);
  return (
    <fieldset className={styles.group}>
      <legend className="srOnly">Row density</legend>
      {(["comfortable", "compact"] as const).map((d) => (
        <label key={d} className={density === d ? `${styles.option} ${styles.checked}` : styles.option}>
          <input type="radio" name="density" value={d} checked={density === d} onChange={() => setDensity(d)} className="srOnly" />
          {d === "comfortable" ? "Comfortable" : "Compact"}
        </label>
      ))}
    </fieldset>
  );
}
