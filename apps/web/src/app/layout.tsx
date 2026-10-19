import type { Metadata } from "next";
import { toCssVars } from "@cockpit/tokens";
import { ClientMock } from "@/mock/ClientMock";
import { Providers } from "./Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Connect Cockpit",
  description: "Broker inventory console",
};

// Tokens are inlined once at render; every stylesheet refers to them through var(--…).
const tokenCss = toCssVars();

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-density="comfortable">
      <head>
        <style dangerouslySetInnerHTML={{ __html: tokenCss }} />
      </head>
      <body>
        <ClientMock>
          <Providers>{children}</Providers>
        </ClientMock>
      </body>
    </html>
  );
}
