import { Dialog } from "@/ui/Dialog";
import styles from "./ShortcutSheet.module.css";

const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: "Anywhere",
    keys: [
      ["n / Shift+N", "Next / previous problem"],
      ["/", "Search events"],
      ["?", "This list"],
      ["Alt+R", "Retry the last failed save"],
      ["Ctrl+Z / ⌘Z", "Undo the last bulk change"],
    ],
  },
  {
    title: "In the table",
    keys: [
      ["Tab / Shift+Tab", "Next / previous cell"],
      ["Arrow keys", "Move between cells"],
      ["Home / End", "First / last cell in the row"],
      ["Ctrl+Home / Ctrl+End", "First / last row"],
      ["Page Up / Page Down", "Up / down 20 rows"],
      ["Space", "Select or clear the row"],
      ["Shift+Space", "Select every row from the last one you picked"],
      ["Enter / F2 / a digit", "Edit price or quantity"],
      ["o", "Open sync details for the row"],
    ],
  },
  {
    title: "While editing",
    keys: [
      ["Enter", "Save, stay on the cell"],
      ["Escape", "Cancel"],
      ["Tab / Shift+Tab", "Save, move right / left"],
    ],
  },
];

export function ShortcutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} title="Keyboard shortcuts" onClose={onClose}>
      <div className={styles.groups}>
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h3 className={styles.title}>{g.title}</h3>
            <dl className={styles.list}>
              {g.keys.map(([k, what]) => (
                <div key={k} className={styles.item}>
                  <dt>
                    <kbd className={styles.kbd}>{k}</kbd>
                  </dt>
                  <dd>{what}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
