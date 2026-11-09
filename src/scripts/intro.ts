// KUMO opening scene.
// · The ryū: a procedural Japanese dragon (three claws) drawn like a red-pencil illustration on cream
//   paper — overlapping fish scales, belly plates, hatching in the shadows, ink outlines.
// · The cloud: a ray-marched volumetric cumulus (Perlin–Worley noise, Beer–powder light, silver lining),
//   lit from inside by small lightning strikes. It is depth-aware, so the dragon disappears *into* it.
// Scroll drives the dive; everything eases with springs so it never stutters.
import * as THREE from 'three';

THREE.ColorManagement.enabled = false; // author colours as they appear on screen

type Opts = { canvas: HTMLCanvasElement; flash: HTMLElement; reduced: boolean };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function rng(seed: number) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

/* ════════════════════ 3D noise (tileable Perlin–Worley), baked once ════════════════════ */
function bakeNoise(N: number) {
  const hash = (x: number, y: number, z: number, s: number) => {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683) + Math.imul(s, 2147483647)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const wrap = (v: number, p: number) => ((v % p) + p) % p;
  const fade = (t: number) => t * t * (3 - 2 * t);
  const value = (x: number, y: number, z: number, p: number, s: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
    const v = (i: number, j: number, k: number) => hash(wrap(xi + i, p), wrap(yi + j, p), wrap(zi + k, p), s);
    const l = (a: number, b: number, t: number) => a + (b - a) * t;
    return l(l(l(v(0, 0, 0), v(1, 0, 0), xf), l(v(0, 1, 0), v(1, 1, 0), xf), yf), l(l(v(0, 0, 1), v(1, 0, 1), xf), l(v(0, 1, 1), v(1, 1, 1), xf), yf), zf);
  };
  const worley = (x: number, y: number, z: number, p: number, s: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let best = 9;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
      const cx = xi + i, cy = yi + j, cz = zi + k;
      const wx = wrap(cx, p), wy = wrap(cy, p), wz = wrap(cz, p);
      const dx = cx + hash(wx, wy, wz, s) - x, dy = cy + hash(wx, wy, wz, s + 17) - y, dz = cz + hash(wx, wy, wz, s + 31) - z;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < best) best = d;
    }
    return Math.min(1, Math.sqrt(best));
  };
  const data = new Uint8Array(N * N * N * 2);
  let o = 0;
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, w = z / N;
    const per = value(u * 4, v * 4, w * 4, 4, 1) * 0.5 + value(u * 8, v * 8, w * 8, 8, 2) * 0.3 + value(u * 16, v * 16, w * 16, 16, 3) * 0.2;
    const wf = (1 - worley(u * 4, v * 4, w * 4, 4, 5)) * 0.625 + (1 - worley(u * 8, v * 8, w * 8, 8, 6)) * 0.25 + (1 - worley(u * 16, v * 16, w * 16, 16, 7)) * 0.125;
    const pw = Math.min(1, Math.max(0, (per - (wf - 1)) / (1 - (wf - 1)))); // Perlin–Worley: billows with round tops
    const det = (1 - worley(u * 8, v * 8, w * 8, 8, 11)) * 0.625 + (1 - worley(u * 16, v * 16, w * 16, 16, 12)) * 0.25 + (1 - worley(u * 32, v * 32, w * 32, 32, 13)) * 0.125;
    data[o++] = Math.round(pw * 255);
    data[o++] = Math.round(det * 255);
  }
  const tex = new THREE.Data3DTexture(data, N, N, N);
  tex.format = THREE.RGFormat; tex.type = THREE.UnsignedByteType;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.unpackAlignment = 1; tex.needsUpdate = true;
  return tex;
}

/* ════════════════════ Shaders ════════════════════ */
const sketchVert = /* glsl */ `
  attribute float aT; attribute float aAround; attribute float aS;
  uniform float uOutline;
  varying vec3 vN; varying vec3 vWorld; varying vec3 vLocal; varying float vT; varying float vAround; varying float vS;
  void main() {
    vec3 p = position; vec3 nn = normal;
    #ifdef OUTLINE
      p += normal * uOutline * (1.0 - 0.7 * aT);
    #endif
    vec4 lp = vec4(p, 1.0);
    #ifdef USE_INSTANCING
      lp = instanceMatrix * lp; nn = mat3(instanceMatrix) * nn;
    #endif
    vec4 w = modelMatrix * lp;
    vWorld = w.xyz; vLocal = position; vN = normalize(mat3(modelMatrix) * nn);
    vT = aT; vAround = aAround; vS = aS;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const sketchFrag = /* glsl */ `
  uniform vec3 uPaper; uniform vec3 uPaperShade; uniform vec3 uInk; uniform vec3 uLight;
  uniform float uFlash; uniform float uClipY; uniform float uHatch;
  varying vec3 vN; varying vec3 vWorld; varying vec3 vLocal; varying float vT; varying float vAround; varying float vS;

  float stripe(float v, float w) { float f = fract(v); float d = min(f, 1.0 - f); float fw = fwidth(v); return 1.0 - smoothstep(w - fw, w + fw, d); }
  float h12(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h12(i), h12(i + vec2(1, 0)), f.x), mix(h12(i + vec2(0, 1)), h12(i + 1.0), f.x), f.y); }

  // Overlapping fish scales: returns ink amount; 'inner' = shading toward each scale's free edge
  float scales(vec2 g, out float inner) {
    const float R = 0.66;
    float ownerX = 1e9; float ownerD = 9.0;
    float cx0 = floor(g.x);
    for (int i = -1; i <= 0; i++) {
      float cx = cx0 + float(i);
      float off = mod(cx, 2.0) * 0.5;
      float cy0 = floor(g.y - off);
      for (int j = -1; j <= 1; j++) {
        vec2 c = vec2(cx, cy0 + float(j) + off + 0.5);
        vec2 l = g - c;
        if (l.x < -0.02) continue;
        float d = length(l * vec2(1.0, 0.92));
        if (d < R && cx < ownerX) { ownerX = cx; ownerD = d; }
      }
    }
    if (ownerD > 8.0) { inner = 0.0; return 0.0; }
    float fw = fwidth(g.x) * 1.2;
    float edge = 1.0 - smoothstep(0.045 - fw, 0.045 + fw, R - ownerD);
    float mid = (1.0 - smoothstep(0.018 - fw, 0.018 + fw, abs(ownerD - R * 0.62))) * 0.35;
    inner = smoothstep(0.15, R, ownerD);
    return max(edge, mid);
  }

  void main() {
    if (vWorld.y < uClipY) discard;
    #ifdef OUTLINE
      gl_FragColor = vec4(uInk * 0.82, 1.0);
      return;
    #endif
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    vec3 V = normalize(cameraPosition - vWorld);
    float lit = dot(n, normalize(uLight));
    float shade = clamp(0.56 + 0.46 * lit, 0.0, 1.0);
    vec3 col = mix(uPaperShade, uPaper, smoothstep(0.2, 0.9, shade));
    float ink = 0.0;
    float grainUV = vnoise(gl_FragCoord.xy * 0.7);

    #ifdef BODY
      float belly = 1.0 - smoothstep(0.15, 0.2, abs(vAround - 0.5));
      // scales on the back and flanks
      float inner;
      float sc = scales(vec2(vS * 2.15, vAround * 15.0), inner);
      float scaleInk = sc + inner * 0.22 * (1.0 - shade * 0.6);
      // belly plates
      float plate = stripe(vS * 1.25, 0.05);
      float plateShade = smoothstep(0.35, 1.0, fract(vS * 1.25)) * 0.18;
      ink = mix(scaleInk, plate + plateShade, belly);
      col = mix(col, mix(col, uPaper * 1.03, 0.6), belly);
      // pencil hatching that wraps around the body in the shadows
      float h1 = stripe(vAround * 120.0 + vS * 0.6, 0.16) * smoothstep(0.62, 0.38, shade);
      float h2 = stripe(vS * 9.0 - vAround * 30.0, 0.14) * smoothstep(0.42, 0.22, shade);
      ink = max(ink, (h1 + h2) * 0.55 * uHatch);
    #elif defined(BLADE)
      // flame blade: inked edges, a spine down the middle and feather strokes either side
      float a = abs(vS);
      float fa = fwidth(vS);
      float edgeInk = smoothstep(0.86 - fa, 0.95 + fa, a);
      float spineInk = (1.0 - smoothstep(0.035, 0.075 + fa, a)) * smoothstep(0.95, 0.55, vT) * 0.9;
      float feather = stripe(vS * 2.0 - vT * 1.2, 0.06) * (1.0 - smoothstep(0.5, 0.75, a)) * smoothstep(0.12, 0.35, vT) * 0.4;
      ink = max(max(edgeInk, spineInk), feather);
      ink = max(ink, stripe(vS * 5.0, 0.12) * smoothstep(0.5, 0.25, shade) * 0.4);
    #else
      float h1 = stripe(dot(vLocal, vec3(0.2, 1.0, 0.55)) * 26.0, 0.16) * smoothstep(0.64, 0.4, shade);
      float h2 = stripe(dot(vLocal, vec3(1.0, -0.3, 0.2)) * 26.0, 0.14) * smoothstep(0.42, 0.22, shade);
      ink = (h1 + h2) * 0.6 * uHatch;
    #endif
    // contour lines where the surface turns away (a pencil's silhouette sense)
    float rim = 1.0 - abs(dot(n, V));
    ink = max(ink, smoothstep(0.78, 0.9, rim) * 0.9);

    ink *= 0.72 + 0.28 * grainUV;
    col = mix(col, uInk, clamp(ink, 0.0, 1.0) * 0.94);
    // paper tooth
    col *= 0.965 + 0.035 * vnoise(gl_FragCoord.xy * 0.35);
    // lightning catches the paper
    col += vec3(1.0, 0.86, 0.66) * uFlash * 0.35 * (0.4 + shade);
    gl_FragColor = vec4(col, 1.0);
  }`;

const quadVert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const BLOBS = 140;
const cloudFrag = /* glsl */ `
  precision highp sampler3D;
  varying vec2 vUv;
  uniform sampler2D tDepth; uniform sampler3D tNoise; uniform sampler3D tShape; uniform vec4 uBulge;
  uniform mat4 uInvProj; uniform mat4 uCamWorld; uniform vec3 uCamPos;
  uniform vec3 uCloudPos; uniform float uCloudScale; uniform float uNear; uniform float uFar;
  uniform float uTime; uniform vec3 uSun;
  uniform float uFlash; uniform vec3 uFlashPos; uniform float uSteps; uniform float uLightSteps; uniform float uDensity;
  const vec3 BMIN = vec3(-7.6, -2.4, -4.0);
  const vec3 BMAX = vec3(7.6, 5.0, 4.0);

  float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
  float sdf(vec3 p) {
    // slow churn: a low-frequency warp makes the puffs roll over each other
    vec3 w = p + vec3(sin(p.y * 0.9 + uTime * 0.23), sin(p.z * 0.8 + uTime * 0.19 + 1.7), sin(p.x * 0.6 + uTime * 0.17)) * 0.14;
    vec3 uvw = (w - BMIN) / (BMAX - BMIN);
    float d = texture(tShape, uvw).r * 4.5 - 2.5;
    if (uBulge.w > 0.0) d = smin(d, length(p - uBulge.xyz) - uBulge.w, 0.5);
    return d;
  }
  float remap(float v, float l0, float h0, float l1, float h1) { return l1 + (v - l0) * (h1 - l1) / max(1e-4, h0 - l0); }
  float density(vec3 p, bool cheap) {
    float s = sdf(p);
    if (s > 0.85) return 0.0;
    float cov = clamp(0.55 - s * 1.6, 0.0, 1.0);
    cov *= smoothstep(-2.0, -1.15, p.y);                  // flat base
    vec3 q = p * 0.1 + vec3(uTime * 0.004, -uTime * 0.009, uTime * 0.003);
    vec2 n = texture(tNoise, q).rg;
    float base = clamp(remap(n.r * 0.85 + 0.15, 1.0 - cov, 1.0, 0.0, 1.0), 0.0, 1.0) * cov;
    if (cheap || base <= 0.0) return base;
    vec3 q2 = p * 0.62 + vec3(-uTime * 0.016, uTime * 0.028, uTime * 0.01);
    float det = texture(tNoise, q2).g * 0.72 + texture(tNoise, p * 1.55 + vec3(uTime * 0.02, uTime * 0.035, 0.0)).g * 0.28;
    float hgt = clamp((p.y + 1.6) / 5.5, 0.0, 1.0);
    float ero = mix(1.0 - det, det, hgt) * 0.4;         // wispy base, cauliflower tops
    return clamp(remap(base, ero, 1.0, 0.0, 1.0), 0.0, 1.0);
  }
  float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * c, 1.5); }

  void main() {
    vec2 ndc = vUv * 2.0 - 1.0;
    vec4 v = uInvProj * vec4(ndc, 1.0, 1.0);
    vec3 dirV = normalize(v.xyz / v.w);
    vec3 d = normalize((uCamWorld * vec4(dirV, 0.0)).xyz);
    float depth = texture(tDepth, vUv).r;
    float tMax = 1e5;
    if (depth < 0.9999) { float viewZ = (uNear * uFar) / ((uFar - uNear) * depth - uFar); tMax = viewZ / dirV.z; }
    vec3 o = (uCamPos - uCloudPos) / uCloudScale;
    float tMaxL = tMax / uCloudScale;
    vec3 inv = 1.0 / d;
    vec3 t0 = (BMIN - o) * inv, t1 = (BMAX - o) * inv;
    vec3 tmn = min(t0, t1), tmx = max(t0, t1);
    float tn = max(max(tmn.x, tmn.y), max(tmn.z, 0.0));
    float tf = min(min(min(tmx.x, tmx.y), tmx.z), tMaxL);
    if (tn >= tf) { gl_FragColor = vec4(0.0); return; }

    float stepL = max((tf - tn) / uSteps, 0.035);
    float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))); // interleaved gradient noise
    float t = tn + stepL * jitter;
    vec3 L = normalize(uSun);
    float c = dot(d, L);
    float phase = mix(hg(c, 0.62), hg(c, -0.22), 0.55) * 0.42 + 0.42;   // forward silver lining + soft back-scatter

    vec3 col = vec3(0.0); float T = 1.0;
    for (int i = 0; i < 260; i++) {
      if (t > tf || T < 0.012) break;
      vec3 p = o + d * t;
      float s = sdf(p);
      if (s > 0.85) { t += max(stepL, s * 0.6); continue; }
      float dens = density(p, false);
      if (dens > 0.003) {
        float od = 0.0; vec3 lp = p; float ls = 0.26;
        for (int j = 0; j < 8; j++) { if (float(j) >= uLightSteps) break; lp += L * ls; od += density(lp, true) * ls; ls *= 1.42; }
        float sunT = exp(-od * uDensity * 0.9) * 0.82 + exp(-od * uDensity * 0.22) * 0.18;  // multi-scatter approximation
        // sculpt: puffs facing the light catch it, crevices fall into shadow
        float facing = smoothstep(-0.35, 0.35, sdf(p + L * 0.45) - s);
        float ao = smoothstep(-1.4, 0.2, s);
        sunT *= mix(0.35, 1.15, facing);
        float powder = 1.0 - exp(-dens * uDensity * 0.55);
        float hgt = clamp((p.y + 1.8) / 6.5, 0.0, 1.0);
        vec3 amb = mix(vec3(0.07, 0.065, 0.075), vec3(0.42, 0.44, 0.5), pow(hgt, 1.2));
        vec3 S = vec3(1.0, 0.98, 0.95) * sunT * mix(1.0, powder, 0.75) * phase * 2.3 + amb;
        float fl = uFlash * exp(-length(p - uFlashPos) * 0.75);
        S = S * mix(0.55, 1.0, ao) + vec3(1.0, 0.84, 0.6) * fl * 7.0;
        float a = 1.0 - exp(-dens * uDensity * stepL);
        col += T * S * a;
        T *= 1.0 - a;
      }
      t += stepL;
    }
    gl_FragColor = vec4(col, 1.0 - T);
  }`;

const compositeFrag = /* glsl */ `
  uniform sampler2D tMain; uniform sampler2D tCloud; varying vec2 vUv;
  void main() {
    vec4 m = texture(tMain, vUv);
    vec4 c = texture(tCloud, vUv);
    // gentle tone curve on the cloud so whites stay creamy, never clipped
    vec3 cc = c.rgb * 1.12 / (1.0 + c.rgb * 0.32);
    gl_FragColor = vec4(cc + m.rgb * (1.0 - c.a), c.a + m.a * (1.0 - c.a));
  }`;

/* ════════════════════ Geometry helpers ════════════════════ */
function tubeGeometry(rings: number, radial: number) {
  const g = new THREE.BufferGeometry();
  const count = rings * (radial + 1);
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const aT = new Float32Array(count), aA = new Float32Array(count);
  for (let i = 0; i < rings; i++) for (let j = 0; j <= radial; j++) { aT[i * (radial + 1) + j] = i / (rings - 1); aA[i * (radial + 1) + j] = j / radial; }
  g.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
  g.setAttribute('aAround', new THREE.BufferAttribute(aA, 1));
  g.setAttribute('aS', new THREE.BufferAttribute(new Float32Array(count), 1));
  const idx: number[] = [];
  for (let i = 0; i < rings - 1; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  g.setIndex(idx);
  return g;
}
type Frame = { p: THREE.Vector3; t: THREE.Vector3; n: THREE.Vector3; b: THREE.Vector3 };
function frames(points: THREE.Vector3[], up = new THREE.Vector3(0, 1, 0), bias = 0.08): Frame[] {
  const out: Frame[] = [];
  let prevN = up.clone();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const t = (i < points.length - 1 ? points[i + 1].clone().sub(p) : p.clone().sub(points[i - 1])).normalize();
    const n = prevN.clone().sub(t.clone().multiplyScalar(prevN.dot(t))).lerp(up, bias);
    n.sub(t.clone().multiplyScalar(n.dot(t))).normalize();
    const b = new THREE.Vector3().crossVectors(t, n).normalize();
    out.push({ p, t, n, b });
    prevN = n;
  }
  return out;
}
function writeTube(g: THREE.BufferGeometry, fr: Frame[], radius: (t: number) => number, radial: number, flatten = 1) {
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const nor = g.getAttribute('normal') as THREE.BufferAttribute;
  const v = new THREE.Vector3(), dd = new THREE.Vector3();
  for (let i = 0; i < fr.length; i++) {
    const { p, n, b } = fr[i];
    const r = radius(i / (fr.length - 1));
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      dd.copy(n).multiplyScalar(Math.cos(a) * flatten).addScaledVector(b, Math.sin(a));
      v.copy(p).addScaledVector(dd, r);
      const k = i * (radial + 1) + j;
      pos.setXYZ(k, v.x, v.y, v.z);
      dd.copy(n).multiplyScalar(Math.cos(a) / flatten).addScaledVector(b, Math.sin(a)).normalize();
      nor.setXYZ(k, dd.x, dd.y, dd.z);
    }
  }
  pos.needsUpdate = true; nor.needsUpdate = true;
  g.computeBoundingSphere();
}
function taper(points: THREE.Vector3[], r0: number, r1: number, radial = 10, segs = 28) {
  const pts = new THREE.CatmullRomCurve3(points).getSpacedPoints(segs);
  const g = tubeGeometry(pts.length, radial);
  writeTube(g, frames(pts, new THREE.Vector3(0, 1, 0.001), 0), (t) => THREE.MathUtils.lerp(r0, r1, Math.pow(t, 0.85)), radial);
  return g;
}
/** A flame-like blade (crest spikes, mane, brows, elbow tufts). Points +Y, flat across Z. */
function bladeGeo(curl = 0.22, width = 0.14) {
  const s = new THREE.Shape();
  s.moveTo(-width, 0);
  s.bezierCurveTo(-width * 1.1, 0.35, -width * 0.2 + curl * 0.2, 0.7, curl, 1.0);
  s.bezierCurveTo(curl * 0.2 + width * 0.25, 0.68, width * 0.8, 0.36, width, 0);
  s.lineTo(-width, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.014, bevelSegments: 2, curveSegments: 14 });
  g.translate(0, 0, -0.0175);
  g.computeVertexNormals();
  // aT = along (0 base → 1 tip), aS = across (-1 … 1 from the midline) for the ink strokes
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const aT = new Float32Array(pos.count), aS = new Float32Array(pos.count);
  const BINS = 48, lo = new Float32Array(BINS).fill(9), hi = new Float32Array(BINS).fill(-9);
  const bin = (y: number) => Math.min(BINS - 1, Math.max(0, Math.floor(THREE.MathUtils.clamp(y, 0, 1) * BINS)));
  for (let i = 0; i < pos.count; i++) { const b = bin(pos.getY(i)); lo[b] = Math.min(lo[b], pos.getX(i)); hi[b] = Math.max(hi[b], pos.getX(i)); }
  for (let b = 1; b < BINS; b++) if (lo[b] > hi[b]) { lo[b] = lo[b - 1]; hi[b] = hi[b - 1]; }
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), b = bin(y);
    const mid = (lo[b] + hi[b]) / 2, half = Math.max(0.01, (hi[b] - lo[b]) / 2);
    aT[i] = THREE.MathUtils.clamp(y, 0, 1); aS[i] = (pos.getX(i) - mid) / half;
  }
  g.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
  g.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
  return g;
}

/* ════════════════════ Scene ════════════════════ */
export function webglOK() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

export function startIntro({ canvas, flash, reduced }: Opts) {
  const mobile = matchMedia('(max-width: 767px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  const dpr = Math.min(devicePixelRatio || 1, mobile ? 2 : 2);
  renderer.setPixelRatio(1); // render targets carry the pixel ratio themselves

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
  const R = rng(20261108);

  /* ── materials ── */
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 99);
  renderer.localClippingEnabled = true;
  const shared = {
    uPaper: { value: new THREE.Color('#f6ead4') },
    uPaperShade: { value: new THREE.Color('#d9bf9c') },
    uInk: { value: new THREE.Color('#b8321d') },
    uLight: { value: new THREE.Vector3(-0.45, 0.85, 0.55) },
    uFlash: { value: 0 },
    uClipY: { value: -99 },
    uHatch: { value: 1 },
  };
  const sketch = (defines: Record<string, string>, outline = 0, side: THREE.Side = THREE.FrontSide) =>
    new THREE.ShaderMaterial({ vertexShader: sketchVert, fragmentShader: sketchFrag, defines, side, uniforms: { ...shared, uOutline: { value: outline } } });
  const bodyMat = sketch({ BODY: '' });
  const bodyLine = sketch({ BODY: '', OUTLINE: '' }, 0.05, THREE.BackSide);
  const partMat = sketch({});
  const bladeMat = sketch({ BLADE: '' });
  const bladeLine = sketch({ OUTLINE: '' }, 0.028, THREE.BackSide);
  const penMat = new THREE.MeshBasicMaterial({ color: '#c23a22', clippingPlanes: [clipPlane] });
  const partLine = sketch({ OUTLINE: '' }, 0.022, THREE.BackSide);
  const thinLine = sketch({ OUTLINE: '' }, 0.012, THREE.BackSide);
  const inkMat = new THREE.MeshBasicMaterial({ color: '#7d1c10', clippingPlanes: [clipPlane] });
  const tongueMat = new THREE.MeshBasicMaterial({ color: '#c4462c', clippingPlanes: [clipPlane] });

  const withLine = (g: THREE.BufferGeometry, line = partLine, mat: THREE.Material = partMat) => {
    const grp = new THREE.Group();
    const a = new THREE.Mesh(g, mat), b = new THREE.Mesh(g, line);
    a.frustumCulled = b.frustumCulled = false;
    grp.add(b, a);
    return grp;
  };
  const blade = (curl = 0.22, width = 0.14) => withLine(bladeGeo(curl, width), bladeLine, bladeMat);

  /* ── flight path: a lazy S above the cloud, then the dive ── */
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-24, -1.0, -3), new THREE.Vector3(-17, 0.5, -1.5), new THREE.Vector3(-12, -1.2, 0),
    new THREE.Vector3(-7, 0.7, 0.6), new THREE.Vector3(-2, -0.6, 0.4), new THREE.Vector3(2.5, 0.9, 0),
    new THREE.Vector3(6.2, 0.2, -0.5), new THREE.Vector3(6.4, -1.0, 0.7), new THREE.Vector3(3.0, -1.2, 1.6),
    new THREE.Vector3(0.6, -2.4, 1.1), new THREE.Vector3(0.2, -5.0, 0.2), new THREE.Vector3(0, -9, -0.5), new THREE.Vector3(0, -16, -1),
  ], false, 'catmullrom', 0.45);
  const pathLen = path.getLength();
  const PS = 900;
  const pathPts = path.getSpacedPoints(PS);
  const pathFr = frames(pathPts, new THREE.Vector3(0, 1, 0), 0.05);
  const pathAt = (u: number, out: { p: THREE.Vector3; n: THREE.Vector3; b: THREE.Vector3 }) => {
    const f = THREE.MathUtils.clamp(u, 0, 1) * PS;
    const i = Math.min(PS - 1, Math.floor(f)), k = f - i;
    out.p.lerpVectors(pathPts[i], pathPts[i + 1], k);
    out.n.lerpVectors(pathFr[i].n, pathFr[i + 1].n, k).normalize();
    out.b.lerpVectors(pathFr[i].b, pathFr[i + 1].b, k).normalize();
    if (u < 0) out.p.addScaledVector(pathFr[0].t, u * pathLen);
    if (u > 1) out.p.addScaledVector(pathFr[PS].t, (u - 1) * pathLen);
  };

  /* ── body ── */
  const BODY = 17.5;
  const RINGS = mobile ? 170 : 240, RADIAL = mobile ? 20 : 28;
  const radius = (t: number) => {
    const neck = THREE.MathUtils.lerp(0.46, 0.64, smooth(0, 0.1, t));
    return Math.max(0.045, neck * Math.pow(1 - t, 0.72) + 0.09 * Math.sin(Math.PI * Math.min(1, t * 1.4)) * (1 - t));
  };
  const bodyGeo = tubeGeometry(RINGS, RADIAL);
  { // arc-length / radius coordinate so scales shrink with the body
    const aS = bodyGeo.getAttribute('aS') as THREE.BufferAttribute;
    let acc = 0;
    for (let i = 0; i < RINGS; i++) {
      const t = i / (RINGS - 1);
      if (i) acc += (BODY / (RINGS - 1)) / radius(t);
      for (let j = 0; j <= RADIAL; j++) aS.setX(i * (RADIAL + 1) + j, acc);
    }
  }
  const dragon = new THREE.Group();
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat), bodyOutline = new THREE.Mesh(bodyGeo, bodyLine);
  bodyMesh.frustumCulled = bodyOutline.frustumCulled = false;
  dragon.add(bodyOutline, bodyMesh);
  scene.add(dragon);

  /* ── dorsal crest: a continuous run of flame blades ── */
  const crestGeo = bladeGeo(0.28, 0.17);
  const CREST = Math.floor((RINGS - 26) / 3);
  const crest = new THREE.InstancedMesh(crestGeo, bladeMat, CREST);
  const crestLine = new THREE.InstancedMesh(crestGeo, bladeLine, CREST);
  crest.frustumCulled = crestLine.frustumCulled = false;
  dragon.add(crestLine, crest);

  /* ── tail flame ── */
  const tail = new THREE.Group();
  const tailBlade = bladeGeo(0.35, 0.2);
  for (let k = 0; k < 7; k++) {
    const g = withLine(tailBlade, bladeLine, bladeMat);
    const a = (k / 6 - 0.5);
    g.rotation.set(Math.PI / 2 - 0.15 + Math.abs(a) * 0.5, 0, a * 1.4);
    g.scale.setScalar(0.85 + (1 - Math.abs(a) * 1.6) * 0.75);
    tail.add(g);
  }
  dragon.add(tail);

  /* ── head (built facing +Z) ── */
  const head = new THREE.Group();
  const put = (obj: THREE.Object3D, p: [number, number, number], r: [number, number, number] = [0, 0, 0], s: [number, number, number] = [1, 1, 1], parent: THREE.Object3D = head) => {
    obj.position.set(...p); obj.rotation.set(...r); obj.scale.set(...s); parent.add(obj); return obj;
  };
  const pen = (pts: THREE.Vector3[], r: number, parent: THREE.Object3D = head) => { const m = new THREE.Mesh(taper(pts, r, r * 0.6, 6, 24), penMat); parent.add(m); return m; };
  // skull, muzzle, nose
  put(withLine(new THREE.SphereGeometry(0.5, 40, 28)), [0, 0.14, -0.05], [0, 0, 0], [1, 0.86, 1.12]);
  put(withLine(new THREE.CapsuleGeometry(0.27, 0.95, 10, 28)), [0, 0.08, 0.8], [Math.PI / 2 - 0.06, 0, 0], [1.1, 1, 0.72]);
  put(withLine(new THREE.SphereGeometry(0.22, 28, 18)), [0, 0.2, 1.36], [0, 0, 0], [1.4, 0.82, 0.95]);
  // inked details on the muzzle: ridge line and upper-lip line
  pen([new THREE.Vector3(0, 0.33, 0.25), new THREE.Vector3(0, 0.34, 0.8), new THREE.Vector3(0, 0.38, 1.25)], 0.012);
  for (const sx of [-1, 1]) {
    pen([new THREE.Vector3(sx * 0.27, -0.06, 0.15), new THREE.Vector3(sx * 0.3, -0.07, 0.7), new THREE.Vector3(sx * 0.24, -0.02, 1.3)], 0.016);
    // nostril curls (ink)
    put(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 8, 26, Math.PI * 1.6), penMat), [sx * 0.15, 0.28, 1.4], [-0.5, sx * 0.5, sx * 0.4]);
    // brow ridge with an inked crease
    put(withLine(new THREE.CapsuleGeometry(0.1, 0.42, 6, 16)), [sx * 0.27, 0.4, 0.3], [Math.PI / 2 - 0.3, 0, sx * -0.28]);
    pen([new THREE.Vector3(sx * 0.18, 0.5, 0.55), new THREE.Vector3(sx * 0.32, 0.53, 0.25), new THREE.Vector3(sx * 0.42, 0.5, -0.05)], 0.014);
    // eye: paper white, red iris, dark slit, inked socket
    const eye = new THREE.Group();
    put(withLine(new THREE.SphereGeometry(0.12, 24, 16), thinLine), [0, 0, 0], [0, 0, 0], [1, 0.82, 1], eye);
    put(new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 12), penMat), [sx * 0.05, 0, 0.065], [0, 0, 0], [0.75, 1, 0.6], eye);
    put(new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), inkMat), [sx * 0.075, 0, 0.09], [0, 0, 0], [0.35, 1.2, 0.5], eye);
    put(eye, [sx * 0.32, 0.27, 0.42]);
    eye.name = 'eye';
    put(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.012, 6, 30, Math.PI * 1.1), penMat), [sx * 0.34, 0.29, 0.43], [0, sx * 0.9, 0.3]);
    // brow flames
    for (let k = 0; k < 3; k++) put(blade(0.3, 0.12), [sx * (0.3 + k * 0.05), 0.46, 0.2 - k * 0.16], [-1.25 - k * 0.12, sx * 0.3, sx * -0.4], [0.9 - k * 0.1, 0.8 + k * 0.15, 0.9]);
    // cheek mane: five swept flames
    for (let k = 0; k < 5; k++) {
      const a = -0.6 + k * 0.3;
      put(blade(0.3 + (k % 2) * 0.1, 0.16), [sx * 0.4, 0.05 + a * 0.3, -0.1], [-1.75 + a * 0.3, sx * (0.6 + Math.abs(a) * 0.25), sx * (-0.3 + a * 0.8)], [1.05, 1.0 + (k % 2) * 0.3, 1]);
    }
    // antler horns
    put(withLine(taper([new THREE.Vector3(0, 0, 0), new THREE.Vector3(sx * 0.14, 0.34, -0.48), new THREE.Vector3(sx * 0.22, 0.5, -1.1), new THREE.Vector3(sx * 0.4, 0.76, -1.6)], 0.1, 0.018)), [sx * 0.17, 0.48, -0.08]);
    put(withLine(taper([new THREE.Vector3(0, 0, 0), new THREE.Vector3(sx * 0.15, 0.2, -0.06), new THREE.Vector3(sx * 0.28, 0.4, -0.26)], 0.05, 0.012), thinLine), [sx * 0.32, 0.85, -0.6]);
    // teeth and fangs
    for (let k = 0; k < 5; k++) put(withLine(new THREE.ConeGeometry(0.03, k === 4 ? 0.24 : 0.1, 8), thinLine), [sx * (0.19 - k * 0.006), -0.1 - (k === 4 ? 0.06 : 0), 0.42 + k * 0.17], [Math.PI, 0, 0]);
  }
  // back mane
  for (let k = 0; k < 5; k++) {
    const a = (k / 4 - 0.5) * 1.4;
    put(blade(0.4, 0.17), [a * 0.25, 0.42, -0.45], [-1.95 + Math.abs(a) * 0.2, 0, a * 0.6], [1.1, 1.25 - Math.abs(a) * 0.2, 1]);
  }
  // jaw
  const jaw = new THREE.Group();
  put(jaw, [0, -0.13, 0.18]);
  put(withLine(new THREE.CapsuleGeometry(0.2, 0.9, 8, 24)), [0, -0.07, 0.56], [Math.PI / 2, 0, 0], [1, 1, 0.6], jaw);
  for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) put(withLine(new THREE.ConeGeometry(0.028, k === 3 ? 0.2 : 0.1, 8), thinLine), [sx * 0.14, 0.03, 0.4 + k * 0.17], [0, 0, 0], [1, 1, 1], jaw);
  put(new THREE.Mesh(taper([new THREE.Vector3(0, 0, 0.2), new THREE.Vector3(0, 0.02, 0.8), new THREE.Vector3(0.05, -0.08, 1.25), new THREE.Vector3(0.14, -0.3, 1.55)], 0.07, 0.015, 10), tongueMat), [0, -0.02, 0], [0, 0, 0], [1, 1, 1], jaw);
  for (let k = 0; k < 4; k++) put(blade(0.3, 0.12), [(k - 1.5) * 0.08, -0.2, 0.45 - k * 0.06], [Math.PI * 0.64 + Math.abs(k - 1.5) * 0.08, 0, (k - 1.5) * 0.28], [0.9, 1.1 + (k % 2) * 0.3, 0.9], jaw); // beard
  // whiskers: long red pen strokes, rebuilt each frame so they curl and trail
  const whiskerMeshes = [-1, 1].map(() => { const a = new THREE.Mesh(new THREE.BufferGeometry(), penMat); a.frustumCulled = false; head.add(a); return a; });
  head.scale.setScalar(1.5);
  const headPivot = new THREE.Group(); headPivot.add(head); dragon.add(headPivot);
  const eyes: THREE.Object3D[] = []; head.traverse((o) => { if (o.name === 'eye') eyes.push(o); });

  /* ── legs: three claws, elbow flames ── */
  const makeLeg = (side: number, front: boolean) => {
    const leg = new THREE.Group();
    const reach = front ? 1 : -1;
    const elbow = new THREE.Vector3(side * 0.42, -0.42, reach * 0.12);
    const wrist = new THREE.Vector3(side * 0.5, -0.86, reach * 0.42);
    leg.add(withLine(taper([new THREE.Vector3(0, 0, 0), new THREE.Vector3(side * 0.3, -0.18, 0), elbow, wrist], 0.17, 0.085)));
    for (let c = 0; c < 3; c++) {
      const a = (c - 1) * 0.55;
      leg.add(withLine(taper([wrist, wrist.clone().add(new THREE.Vector3(side * 0.05 + Math.sin(a) * 0.16, -0.12, reach * 0.14)), wrist.clone().add(new THREE.Vector3(Math.sin(a) * 0.28, -0.3, reach * 0.3)), wrist.clone().add(new THREE.Vector3(Math.sin(a) * 0.3, -0.42, reach * 0.18))], 0.055, 0.006, 8), thinLine));
    }
    for (let k = 0; k < 3; k++) {
      const g = blade(0.3, 0.1);
      g.position.copy(elbow); g.rotation.set(-1.3 * reach - k * 0.15 * reach, side * 0.4, side * (0.6 + k * 0.25)); g.scale.setScalar(0.55 + k * 0.12);
      leg.add(g);
    }
    dragon.add(leg);
    return leg;
  };
  const legs = [[0.12, 1, true], [0.12, -1, true], [0.48, 1, false], [0.48, -1, false]].map(([t, s, f]) => ({ t: t as number, s: s as number, g: makeLeg(s as number, f as boolean) }));

  /* ── embers ── */
  const EMB = mobile ? 90 : 180;
  const ePos = new Float32Array(EMB * 3), eSpd = new Float32Array(EMB);
  for (let i = 0; i < EMB; i++) { ePos[i * 3] = (R() - 0.5) * 30; ePos[i * 3 + 1] = (R() - 0.5) * 14; ePos[i * 3 + 2] = (R() - 0.5) * 8 - 2; eSpd[i] = 0.15 + R() * 0.45; }
  const embGeo = new THREE.BufferGeometry(); embGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
  const embers = new THREE.Points(embGeo, new THREE.PointsMaterial({ color: '#ff9a6a', size: 0.05, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(embers);

  /* ── cloud ── */
  const noiseTex = bakeNoise(mobile ? 48 : 64);
  // Cumulus: broad flat-bottomed base, a tall central tower, cauliflower puffs over the top surface
  const baseBlobs: [number, number, number, number][] = [];
  {
    const cr = rng(42);
    const core: [number, number, number, number][] = [
      [0, 0.4, 0, 1.75], [-1.7, 0.1, 0.2, 1.45], [1.8, 0.15, -0.15, 1.5], [-3.4, -0.4, 0, 1.0], [3.5, -0.35, 0.2, 1.05],
      [-0.4, 1.8, 0.05, 1.3], [0.9, 2.1, -0.2, 1.15], [-2.0, 1.1, -0.25, 0.95], [2.5, 1.15, 0.3, 0.9], [0.2, 3.0, 0, 0.85],
      [0, -0.3, 1.2, 1.25], [0, -0.3, -1.2, 1.2],
    ];
    baseBlobs.push(...core);
    // surface puffs: sit on the core's upper surface, smaller as they climb
    while (baseBlobs.length < 136) {
      const c = core[Math.floor(cr() * core.length)];
      const th = cr() * Math.PI * 2, ph = Math.acos(THREE.MathUtils.lerp(1, -0.15, cr()));
      const dir = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th) * 0.8);
      const r = c[3] * (baseBlobs.length < 52 ? 0.3 + cr() * 0.28 : 0.14 + cr() * 0.16);
      const pp = new THREE.Vector3(c[0], c[1], c[2]).addScaledVector(dir, c[3] * (baseBlobs.length < 52 ? 0.92 : 1.02));
      if (pp.y < -0.6) continue;
      baseBlobs.push([pp.x, pp.y, pp.z, r]);
    }
    while (baseBlobs.length < BLOBS) baseBlobs.push([0, 0, 0, 0]);
  }
  const SDF = { nx: mobile ? 96 : 128, ny: mobile ? 48 : 64, nz: mobile ? 52 : 68, min: new THREE.Vector3(-7.6, -2.4, -4.0), max: new THREE.Vector3(7.6, 5.0, 4.0) };
  const sdfTex = (() => {
    const { nx, ny, nz, min, max } = SDF;
    const data = new Uint8Array(nx * ny * nz);
    const solid = baseBlobs.filter((b) => b[3] > 0);
    const smin = (a: number, b: number, k: number) => { const h = Math.min(1, Math.max(0, 0.5 + 0.5 * (b - a) / k)); return b + (a - b) * h - k * h * (1 - h); };
    let o = 0;
    for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const px = min.x + (x + 0.5) / nx * (max.x - min.x), py = min.y + (y + 0.5) / ny * (max.y - min.y), pz = min.z + (z + 0.5) / nz * (max.z - min.z);
      let d = 1e5;
      for (const b of solid) { const dx = px - b[0], dy = (py - b[1]) * 1.06, dz = pz - b[2]; d = smin(d, Math.sqrt(dx * dx + dy * dy + dz * dz) - b[3], 0.32); }
      d = Math.max(d, -2.2 - py);
      data[o++] = Math.round(Math.min(1, Math.max(0, (d + 2.5) / 4.5)) * 255);
    }
    const t = new THREE.Data3DTexture(data, nx, ny, nz);
    t.format = THREE.RedFormat; t.type = THREE.UnsignedByteType;
    t.minFilter = t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = t.wrapR = THREE.ClampToEdgeWrapping;
    t.unpackAlignment = 1; t.needsUpdate = true;
    return t;
  })();
  const cloudU = {
    tDepth: { value: null as THREE.Texture | null }, tNoise: { value: noiseTex }, tShape: { value: sdfTex }, uBulge: { value: new THREE.Vector4() },
    uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
    uCloudPos: { value: new THREE.Vector3(0, -4.7, 0) }, uCloudScale: { value: 1 }, uNear: { value: camera.near }, uFar: { value: camera.far },
    uTime: { value: 0 }, uSun: { value: new THREE.Vector3(-0.55, 0.75, 0.45) },
    uFlash: { value: 0 }, uFlashPos: { value: new THREE.Vector3() },
    uSteps: { value: mobile ? 56 : 96 }, uLightSteps: { value: mobile ? 5 : 6 }, uDensity: { value: 20 },
  };
  const quad = new THREE.PlaneGeometry(2, 2);
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const cloudPass = new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: quadVert, fragmentShader: cloudFrag, uniforms: cloudU, depthTest: false, depthWrite: false }));
  const cloudScene = new THREE.Scene(); cloudScene.add(cloudPass);
  const compU = { tMain: { value: null as THREE.Texture | null }, tCloud: { value: null as THREE.Texture | null } };
  const compPass = new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: quadVert, fragmentShader: compositeFrag, uniforms: compU, depthTest: false, depthWrite: false, blending: THREE.NoBlending }));
  const compScene = new THREE.Scene(); compScene.add(compPass);

  /* ── lightning ── */
  const boltScene = new THREE.Scene();
  const boltCore = new THREE.MeshBasicMaterial({ color: '#fff6dc', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
  const boltGlow = new THREE.MeshBasicMaterial({ color: '#ffd6a8', transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
  const bolts = new THREE.Group(); boltScene.add(bolts);
  let boltLife = 0, flashV = 0, innerFlash = 0;
  const flashLocal = new THREE.Vector3();
  function strike(power: number, visible: boolean) {
    const blob = baseBlobs[Math.floor(R() * 12)];
    flashLocal.set(blob[0] + (R() - 0.5) * 1.2, Math.min(blob[1], 0.6) - 0.4, blob[2] + (R() - 0.5));
    if (!visible) { innerFlash = 0.55 + R() * 0.45; return; }
    bolts.children.forEach((c) => (c as THREE.Mesh).geometry.dispose());
    bolts.clear();
    const cs = cloudU.uCloudScale.value, cp = cloudU.uCloudPos.value;
    const origin = new THREE.Vector3(flashLocal.x, -1.3, flashLocal.z + 1.6).multiplyScalar(cs).add(cp);
    const branch = (start: THREE.Vector3, dir: THREE.Vector3, len: number, depth: number) => {
      const pts = [start.clone()];
      let p = start.clone();
      const steps = 16;
      const side = new THREE.Vector3(-dir.y, dir.x, 0);
      for (let i = 0; i < steps; i++) {
        p = p.clone().addScaledVector(dir, len / steps).addScaledVector(side, (R() - 0.5) * len * 0.16).add(new THREE.Vector3(0, 0, (R() - 0.5) * 0.1));
        pts.push(p);
        if (depth < 2 && R() < 0.22) branch(p, dir.clone().addScaledVector(side, (R() - 0.5) * 2.2).normalize(), len * 0.4, depth + 1);
      }
      const curve = new THREE.CurvePath<THREE.Vector3>();
      for (let i = 0; i < pts.length - 1; i++) curve.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
      const w = depth === 0 ? 1 : 0.55;
      bolts.add(new THREE.Mesh(new THREE.TubeGeometry(curve as any, steps * 2, 0.018 * w, 4), boltCore));
      bolts.add(new THREE.Mesh(new THREE.TubeGeometry(curve as any, steps * 2, 0.085 * w, 6), boltGlow));
    };
    const ang = -Math.PI / 2 + (R() - 0.5) * 1.6;
    branch(origin, new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0).normalize(), 1.6 + R() * 1.8 * power, 0);
    boltLife = 1;
    innerFlash = 1;
  }

  /* ════════ animation state ════════ */
  const spine: THREE.Vector3[] = Array.from({ length: RINGS }, () => new THREE.Vector3());
  const tmp = { p: new THREE.Vector3(), n: new THREE.Vector3(), b: new THREE.Vector3() };
  const up = new THREE.Vector3(0, 1, 0);
  const m4 = new THREE.Matrix4(), v3 = new THREE.Vector3(), q = new THREE.Quaternion(), s3 = new THREE.Vector3();
  let target = 0, prog = 0, time = 0, nextStrike = 1.4, nextInner = 0.6, roared = false, blinkT = 2.5, blink = 0;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', (e) => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; }, { passive: true });

  function update(dt: number) {
    time += dt;
    // scroll is a target; the dragon glides toward it with momentum
    prog += (target - prog) * (1 - Math.exp(-dt * 3.2));
    const p = prog;
    const travel = smooth(0.03, 0.8, p);
    const uHead = THREE.MathUtils.lerp(0.475, 0.99, travel) + Math.sin(time * 0.31) * 0.006 * (1 - travel);
    const span = BODY / pathLen;
    const dive = smooth(0.3, 0.75, p);

    // body: a slither tied to *path position*, so every segment passes through the head's S-curve
    for (let i = 0; i < RINGS; i++) {
      const t = i / (RINGS - 1);
      const u = uHead - t * span;
      pathAt(u, tmp);
      const x = u * pathLen;
      const a1 = (0.22 + 0.42 * t) * (1 - 0.35 * dive);
      const a2 = (0.12 + 0.3 * t);
      const s1 = Math.sin(x * 0.85 - time * 1.15) * a1;
      const s2 = Math.sin(x * 0.55 + 1.3 - time * 0.8) * a2 + Math.sin(time * 0.9 + t * 3.1) * 0.06;
      spine[i].copy(tmp.p).addScaledVector(tmp.n, s1).addScaledVector(tmp.b, s2);
    }
    const fr = frames(spine);
    writeTube(bodyGeo, fr, (t) => radius(t) * (1 + 0.025 * Math.sin(time * 1.6 - t * 9)), RADIAL, 0.94);

    // crest
    for (let k = 0; k < CREST; k++) {
      const i = Math.min(RINGS - 2, 10 + k * 3);
      const f = fr[i];
      const t = i / (RINGS - 1);
      const rr = radius(t);
      const sway = Math.sin(time * 3 - t * 18) * 0.12;
      const Y = f.n.clone().addScaledVector(f.t, 0.62 + sway).normalize();
      const Z = f.b.clone();
      const X = new THREE.Vector3().crossVectors(Y, Z).normalize();
      Z.crossVectors(X, Y).normalize();
      const sc = Math.max(0.16, 0.95 * (1 - t) + 0.12) * (0.85 + 0.25 * Math.sin(k * 2.3)) * (rr / 0.5) ** 0.4;
      m4.makeBasis(X, Y, Z).scale(s3.set(sc, sc, sc)).setPosition(v3.copy(f.p).addScaledVector(f.n, rr * 0.8));
      crest.setMatrixAt(k, m4); crestLine.setMatrixAt(k, m4);
    }
    crest.instanceMatrix.needsUpdate = crestLine.instanceMatrix.needsUpdate = true;

    // head: rides the front of the spine, then glances at the visitor's cursor
    const h = fr[0];
    const fwd = h.t.clone().negate();
    const right = new THREE.Vector3().crossVectors(h.n, fwd).normalize();
    headPivot.position.copy(h.p).addScaledVector(fwd, 0.05);
    headPivot.quaternion.setFromRotationMatrix(m4.makeBasis(right, h.n, fwd));
    pointer.sx += (pointer.x - pointer.sx) * (1 - Math.exp(-dt * 2.5));
    pointer.sy += (pointer.y - pointer.sy) * (1 - Math.exp(-dt * 2.5));
    head.rotation.set(-pointer.sy * 0.35 + Math.sin(time * 1.1) * 0.05, pointer.sx * 0.5, Math.sin(time * 0.7) * 0.06);
    // jaw breathes; roars as it reaches the cloud
    const roar = smooth(0.4, 0.5, p) * (1 - smooth(0.58, 0.68, p));
    jaw.rotation.x = 0.1 + 0.08 * (0.5 + 0.5 * Math.sin(time * 1.4)) + roar * 0.42;
    if (!roared && p > 0.47) { roared = true; strike(1.6, true); }
    if (p < 0.4) roared = false;
    // blink
    blinkT -= dt;
    if (blinkT <= 0) { blink = 1; blinkT = 2.6 + R() * 3.4; }
    blink = Math.max(0, blink - dt * 7);
    const lid = 1 - Math.sin(blink * Math.PI) * 0.9;
    eyes.forEach((e) => (e.scale.y = lid));
    // whiskers: long, curling, trailing behind the snout
    whiskerMeshes.forEach((a, idx) => {
      const sx = idx ? 1 : -1;
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 9; k++) {
        const qq = k / 9;
        pts.push(new THREE.Vector3(
          sx * (0.24 + qq * 0.9 + Math.sin(time * 1.7 - qq * 5 + idx) * 0.25 * qq),
          0.12 - qq * 0.55 + Math.sin(time * 2.2 - qq * 6 + idx * 2) * 0.32 * qq,
          1.3 - qq * 3.1));
      }
      const g = taper(pts, 0.022, 0.004, 6, 40);
      a.geometry.dispose(); a.geometry = g;
    });

    // legs ride the body and paddle
    for (const l of legs) {
      const i = Math.round(l.t * (RINGS - 1));
      const f = fr[i];
      const rr = radius(l.t);
      l.g.position.copy(f.p).addScaledVector(f.b, l.s * rr * 0.72).addScaledVector(f.n, -rr * 0.25);
      const fw = f.t.clone().negate();
      l.g.quaternion.setFromRotationMatrix(m4.makeBasis(new THREE.Vector3().crossVectors(f.n, fw).normalize(), f.n, fw));
      l.g.rotateX(Math.sin(time * 1.9 + l.t * 9 + l.s * 1.3) * 0.32);
      l.g.rotateZ(l.s * Math.sin(time * 1.3 + l.t * 5) * 0.12);
      l.g.scale.setScalar(rr / 0.55 * 0.95 + 0.1);
    }
    // tail flame
    const tl = fr[RINGS - 1];
    tail.position.copy(tl.p);
    tail.quaternion.setFromRotationMatrix(m4.makeBasis(new THREE.Vector3().crossVectors(tl.n, tl.t).normalize(), tl.n, tl.t));
    tail.rotateZ(Math.sin(time * 2.6) * 0.25);

    // cloud: breathes, bulges where the dragon pushes in, then swells over the camera
    const swell = smooth(0.62, 0.98, p);
    const cs = 1 + swell * 4.4;
    cloudU.uCloudScale.value = cs;
    cloudU.uCloudPos.value.set(0, -4.7 + swell * 2.8, swell * 5.2);
    const bulge = Math.sin(Math.PI * smooth(0.36, 0.7, p));
    cloudU.uBulge.value.set(0.4, 2.3 + bulge * 0.4, 0.6, bulge * 1.1);
    cloudU.uTime.value = time;
    // the dragon vanishes into the cloud instead of exiting underneath
    shared.uClipY.value = cloudU.uCloudPos.value.y - 0.5 * cs;
    clipPlane.constant = -shared.uClipY.value;

    // lightning: small strikes and inner flickers, busier during the dive
    const storm = 0.4 + 1.8 * smooth(0.2, 0.75, p);
    nextStrike -= dt; nextInner -= dt;
    if (!reduced && nextStrike <= 0) { strike(storm, true); nextStrike = (2.0 + R() * 2.8) / storm; }
    if (!reduced && nextInner <= 0) { strike(storm, false); nextInner = (0.9 + R() * 1.6) / storm; }
    if (boltLife > 0) {
      boltLife -= dt * 3.4;
      const k = Math.max(0, boltLife) * (R() > 0.22 ? 1 : 0.3);
      boltCore.opacity = k; boltGlow.opacity = k * 0.3;
      flashV = Math.max(flashV, k);
      bolts.visible = k > 0.02;
    } else bolts.visible = false;
    innerFlash *= Math.exp(-dt * 7);
    flashV *= Math.exp(-dt * 9);
    shared.uFlash.value = flashV * 0.8;
    cloudU.uFlash.value = Math.max(innerFlash, flashV);
    cloudU.uFlashPos.value.copy(flashLocal);
    flash.style.opacity = String(Math.min(0.5, flashV * 0.3 + innerFlash * 0.08));

    // embers drift
    const ep = embGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < EMB; i++) { let y = ep.getY(i) + eSpd[i] * dt; if (y > 7) y = -7; ep.setY(i, y); ep.setX(i, ep.getX(i) + Math.sin(time * 0.5 + i) * dt * 0.08); }
    ep.needsUpdate = true;

    // camera follows the dive, with a small shake on the roar
    const shake = roar * 0.04;
    camera.position.y = THREE.MathUtils.lerp(0.45, -1.7, smooth(0.15, 0.8, p)) + Math.sin(time * 37) * shake;
    camera.position.x = baseCamX + Math.sin(time * 29) * shake;
    camera.lookAt(0, THREE.MathUtils.lerp(-0.25, -2.7, smooth(0.15, 0.8, p)), 0);
  }

  /* ════════ render targets ════════ */
  let mainRT: THREE.WebGLRenderTarget, cloudRT: THREE.WebGLRenderTarget;
  let cloudRes = mobile ? 0.5 : 0.72;
  let baseCamX = 0;
  function makeTargets() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    mainRT?.dispose(); cloudRT?.dispose();
    const W = Math.round(w * dpr), H = Math.round(h * dpr);
    mainRT = new THREE.WebGLRenderTarget(W, H, { samples: 4, depthTexture: new THREE.DepthTexture(W, H), type: THREE.HalfFloatType });
    cloudRT = new THREE.WebGLRenderTarget(Math.round(w * cloudRes), Math.round(h * cloudRes), { type: THREE.HalfFloatType });
    cloudRT.texture.minFilter = cloudRT.texture.magFilter = THREE.LinearFilter;
    renderer.setSize(W, H, false);
    canvas.style.width = '100%'; canvas.style.height = '100%';
    camera.aspect = w / h;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const wantW = w < h ? 9.5 : 22;
    camera.position.z = wantW / camera.aspect / (2 * Math.tan(vFov / 2));
    baseCamX = w < h ? 1.5 : 0;
    camera.updateProjectionMatrix();
  }
  makeTargets();
  let resizeT = 0;
  addEventListener('resize', () => { clearTimeout(resizeT); resizeT = window.setTimeout(makeTargets, 150); });

  function render() {
    // 1 · dragon + embers, with depth
    renderer.setRenderTarget(mainRT);
    renderer.setClearColor(0x000000, 0); renderer.clear();
    renderer.render(scene, camera);
    // 2 · volumetric cloud, stopping at the dragon's depth
    camera.updateMatrixWorld();
    cloudU.tDepth.value = mainRT.depthTexture;
    cloudU.uInvProj.value.copy(camera.projectionMatrixInverse);
    cloudU.uCamWorld.value.copy(camera.matrixWorld);
    cloudU.uCamPos.value.copy(camera.position);
    renderer.setRenderTarget(cloudRT); renderer.clear();
    renderer.render(cloudScene, quadCam);
    // 3 · composite, then lightning on top
    compU.tMain.value = mainRT.texture; compU.tCloud.value = cloudRT.texture;
    renderer.setRenderTarget(null); renderer.clear();
    renderer.render(compScene, quadCam);
    if (bolts.visible) renderer.render(boltScene, camera);
  }

  /* ════════ loop + adaptive quality ════════ */
  let running = false, last = 0, raf = 0, acc = 0, frames_ = 0, tuned = false;
  function frame(now: number) {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
    update(dt);
    render();
    if (!tuned) {
      acc += dt; frames_++;
      if (acc > 1.5) {
        const fps = frames_ / acc;
        if (fps < 40 && cloudRes > 0.3) { cloudRes *= 0.75; cloudU.uSteps.value = Math.max(36, cloudU.uSteps.value - 16); makeTargets(); acc = 0; frames_ = 0; }
        else tuned = true;
      }
    }
    if (running) raf = requestAnimationFrame(frame);
  }

  const capture = /[?&]capture\b/.test(location.search); // preview-video capture: frames are stepped manually
  const api = {
    setProgress(p: number) { target = clamp01(p); if (reduced) { prog = target; update(0); render(); } },
    play() { if (!running && !reduced && !capture) { running = true; last = 0; raf = requestAnimationFrame(frame); } },
    pause() { running = false; cancelAnimationFrame(raf); },
    start() { if (reduced) { update(0); render(); } else api.play(); },
    /** Deterministic stepping for capturing a preview video: sets progress and advances time. */
    step(p: number, dt: number, sub = 1) { api.pause(); target = clamp01(p); for (let i = 0; i < sub; i++) update(dt / sub); render(); },
  };
  (window as any).__kumoIntro = api;
  return api;
}
