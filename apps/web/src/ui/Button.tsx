import type { ComponentPropsWithRef } from "react";
import styles from "./Button.module.css";

type Variant = "default" | "primary" | "ghost";

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
