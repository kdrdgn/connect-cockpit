const date = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const dateLong = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeZone: "UTC" });

export const formatDate = (iso: string) => date.format(new Date(iso));
export const formatDateLong = (iso: string) => dateLong.format(new Date(iso));
