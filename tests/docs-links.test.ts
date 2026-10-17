import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public product page", () => {
  it("links to the current GitHub repository owner", () => {
    const html = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
    expect(html).toContain("https://github.com/luisroquette-labs/me-group-agent");
    expect(html).not.toContain("github.com/cfgauss-ai/");
  });
});
