// shape-rendering: geometricPrecision — antialias a silhouette from the ray already
// being marched. No larger render target, second ray or post-processing pass: remember the
// closest near miss, then main() shades that point once if the ray misses or hits farther on.
export function precisionMarch(
  sceneSphereCode: string,
  masked: boolean,
  transparent: boolean,
): string {
  // The scene-sphere fast path is already widened by one pixel for this mode.
  // It is generated as a four-value early return; add the saved edge-id slot here.
  const miss = sceneSphereCode.replace(
    /return vec4\(([^;]+)\);/g,
    "return PrecisionHit($1, 0.0);",
  );
  const distance = masked || transparent ? "abs(res.x)" : "res.x";

  const edge = masked
    ? `    float width = t * pixelSize;
    if (d >= 0.001 && d < width) {
      float here = 1.0 - d / width;
      if (here > coverage && maskAlpha(id, p) >= 0.5) {
        edgeT = t;
        edgeId = id;
        coverage = here;
      }
    }`
    : `    float width = t * pixelSize;
    if (d >= 0.001 && d < width) {
      float here = 1.0 - d / width;
      if (here > coverage) {
        edgeT = t;
        edgeId = id;
        coverage = here;
      }
    }`;

  const loop = masked
    ? `  throughHoles = true;
  for (int i = 0; i < 200; i++) {
    vec3 p = ro + rd * t;
    vec2 res = map(p);
    id = res.y;
    float d = ${distance};
${edge}
    if (d < 0.001) {
      if (maskAlpha(id, p) >= 0.5) break;
      d = 0.002;
    }
    t += d;
    if (t > MAX_DIST) break;
  }
  throughHoles = false;`
    : transparent
      ? `  throughHoles = true;
  for (int i = 0; i < 200; i++) {
    vec2 res = map(ro + rd * t);
    id = res.y;
    float d = ${distance};
${edge}
    if (d < 0.001) break;
    t += d;
    if (t > MAX_DIST) break;
  }
  throughHoles = false;`
      : `  for (int i = 0; i < 100; i++) {
    vec2 res = map(ro + rd * t);
    id = res.y;
    float d = res.x;
${edge}
    t += d;
    if (d < 0.001 || t > MAX_DIST) break;
  }`;

  return `// shape-rendering: geometricPrecision — the primary ray keeps its closest near miss
struct PrecisionHit {
  float t;
  float id;
  float edgeT;
  float edgeId;
  float coverage;
};

PrecisionHit marchPrecision(vec3 ro, vec3 rd) {
  float t = 0.0;
  float id = 0.0;
  float edgeT = 0.0;
  float edgeId = 0.0;
  float coverage = 0.0;
  float pixelSize = 1.0 / (1.5 * iResolution.y);
${miss}${loop}
  return PrecisionHit(t, id, edgeT, edgeId, coverage);
}`;
}
