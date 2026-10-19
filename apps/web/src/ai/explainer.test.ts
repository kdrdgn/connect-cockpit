import { ExplainModelOutput, type ExplainRequest } from "@cockpit/contract";
import { ERROR_TEMPLATES, INJECTION_EVENT } from "@cockpit/mock";
import { describe, expect, it, vi } from "vitest";
import { createMockExplainer, createModelExplainer, REPORT_TOOL, TOOL_NAME } from "./explainer";

const ctx = { marketplace: "seatgeek", marketPrice: 120, quantity: 4, section: "104", row: "F", n: 3 } as const;
const request = (lastError: string): ExplainRequest => ({ marketplace: "seatgeek", lastError, price: 90, marketPrice: 120, quantity: 4 });
const signal = () => new AbortController().signal;

describe("mock explainer", () => {
  it.each(ERROR_TEMPLATES.map((t) => [t.key, t.render(ctx)]))("answers the %s template with schema-valid output", async (_key, text) => {
    const { raw } = await createMockExplainer(0).explain(request(text), signal());
    expect(ExplainModelOutput.safeParse(raw).success).toBe(true);
  });

  it("reads the floor from a price-minimum error", async () => {
    const { raw } = await createMockExplainer(0).explain(request("below the event minimum of £96"), signal());
    expect(raw).toMatchObject({ action: "adjust_price", floor: 96 });
  });
});

describe("model explainer", () => {
  it("forces the report tool, sends no event name and disables SDK retries", async () => {
    const create = vi.fn().mockResolvedValue({
      content: [{ type: "tool_use", name: TOOL_NAME, id: "t", input: { action: "retry" } }],
      usage: { input_tokens: 410, output_tokens: 62 },
    });
    const explainer = createModelExplainer({ messages: { create } } as never, "claude-haiku-5-5");
    const out = await explainer.explain(request("Timed out"), signal());

    const [body, options] = create.mock.calls[0]!;
    expect(body.tool_choice).toMatchObject({ type: "tool", name: TOOL_NAME });
    expect(body.tools).toEqual([REPORT_TOOL]);
    expect(JSON.stringify(body)).not.toContain(INJECTION_EVENT);
    expect(options.maxRetries).toBe(0);
    expect(out).toEqual({ raw: { action: "retry" }, usage: { inputTokens: 410, outputTokens: 62 } });
  });

  it("builds a JSON Schema tool input that lists the closed enums", () => {
    const props = REPORT_TOOL.input_schema.properties as Record<string, { enum?: string[] }>;
    expect(REPORT_TOOL.input_schema.type).toBe("object");
    expect(props.action?.enum).toEqual(["retry", "adjust_price", "delist", "none"]);
    expect(REPORT_TOOL.input_schema).not.toHaveProperty("$schema");
  });
});
