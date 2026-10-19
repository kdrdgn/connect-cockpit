const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const dateLong = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeZone: "UTC" });

/** "30 Oct": short enough to scan down a column. The weekday lives in the tooltip and the drawer. */
export const formatDate = (iso: string) => date.format(new Date(iso));
export const formatDateLong = (iso: string) => dateLong.format(new Date(iso));
