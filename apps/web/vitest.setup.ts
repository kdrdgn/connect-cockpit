import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

// jsdom has no layout, so nothing to scroll. Absent in node-environment tests (server modules).
if (typeof Element !== "undefined") Element.prototype.scrollIntoView = function scrollIntoView() {};
