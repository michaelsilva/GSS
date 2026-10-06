import { describe, expect, it } from "vitest";
import { compileGSS, compileScene } from "..";

const SPHERE =
  "@scene { sphere; } scene { floor: none; } sphere { translate: 0 1 0; radius: 1; }";

describe("shape-rendering", () => {
  it("is auto by default and leaves the shader byte-for-byte unchanged", () => {
    const plain = compileGSS(SPHERE);
    expect(plain).not.toContain("marchPrecision");
    expect(compileGSS(`${SPHERE} scene { shape-rendering: auto; }`)).toBe(plain);
  });

  it("geometricPrecision keeps a grazing point on the primary ray", () => {
    const shader = compileGSS(
      `${SPHERE} scene { shape-rendering: geometricPrecision; }`,
    );
    expect(shader).toContain("vec4 marchPrecision(vec3 ro, vec3 rd)");
    expect(shader).toContain("float pixelSize = 1.0 / (1.5 * iResolution.y);");
    expect(shader).toContain("if (d >= 0.001 && d < width)");\n    expect(shader).toContain("float boundWidth = max(-b, 0.0) * pixelSize;");\n    expect(shader).toContain("c - b * b >");
    expect(shader).toContain("vec3 edgeColor = shadeSurface(ro, rd, edgeT, edgeHit.y);");
    expect(shader).toContain("col = mix(col, edgeColor, edgeCoverage);");
  });

  it("lowers the same edge path to WGSL", () => {
    const { wgsl } = compileScene(
      `${SPHERE} scene { shape-rendering: geometricPrecision; }`,
      { target: "dual" },
    );
    expect(wgsl).toContain("fn g_marchPrecision(");
    expect(wgsl).toContain("g_edgeCoverage");
  });

  it("follows @media like every scene property", () => {
    const compiled = compileScene(
      `${SPHERE} @media (max-width: 600px) { scene { shape-rendering: geometricPrecision; } }`,
    );
    expect(compiled.shader).not.toContain("marchPrecision");
    expect(compiled.media!.variants[1].shader).toContain("marchPrecision");
  });

  it("takes only auto or geometricPrecision, on the scene only", () => {
    expect(() =>
      compileGSS(`${SPHERE} scene { shape-rendering: smooth; }`),
    ).toThrow(
      "shape-rendering expects auto or geometricPrecision, like: shape-rendering: geometricPrecision;",
    );
    expect(() =>
      compileGSS(`${SPHERE} sphere { shape-rendering: geometricPrecision; }`),
    ).toThrow('"shape-rendering" only applies to the scene');
  });
});
