import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

// jsdom has no layout, so nothing to scroll.
Element.prototype.scrollIntoView = function scrollIntoView() {};
