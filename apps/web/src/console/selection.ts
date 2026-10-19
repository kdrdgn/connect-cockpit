import { createContext, useContext } from "react";
import { useUi } from "./store";

/** The loaded ids in view order, which shift ranges run along. Provided by the console. */
export const ViewIdsContext = createContext<readonly string[]>([]);
export const useViewIds = () => useContext(ViewIdsContext);

/** Click or Space on a row's checkbox; with Shift it extends from the last row picked. */
export function selectRow(viewIds: readonly string[], id: string, extend: boolean) {
  const ui = useUi.getState();
  if (extend && ui.anchor !== null) ui.selectRange(viewIds, id);
  else ui.toggle(id);
}
