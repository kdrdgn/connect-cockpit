import type { ComponentPropsWithRef } from "react";
import styles from "./Button.module.css";

/** primary: the recommended next step. danger: confirms removing something. default: an alternative. ghost: an escape or the start of a flow. */
type Variant = "default" | "primary" | "danger" | "ghost";

export type ButtonProps = ComponentPropsWithRef<"button"> & { variant?: Variant };

export function Button({ variant = "default", className, type = "button", ...rest }: ButtonProps) {
  const cls = [styles.button, variant !== "default" && styles[variant], className].filter(Boolean).join(" ");
  return <button type={type} className={cls} {...rest} />;
}

/** A square button with no visible text; the label is required so it is never unnamed. */
export function IconButton({ label, className, ...rest }: Omit<ButtonProps, "aria-label"> & { label: string }) {
  return (
    <Button variant="ghost" aria-label={label} title={label} className={[styles.icon, className].filter(Boolean).join(" ")} {...rest} />
  );
}
