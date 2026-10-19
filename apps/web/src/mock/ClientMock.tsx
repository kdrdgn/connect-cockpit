"use client";

import dynamic from "next/dynamic";

// MSW's browser entry resolves to nothing under Node, so the mock must never render on the server.
export const ClientMock = dynamic(() => import("./MockProvider").then((m) => m.MockProvider), { ssr: false });
