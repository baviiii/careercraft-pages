import { memo, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/* ───────────────────────────────────────────────────────────
   MeadowInterlude — a living, golden-hour 3D meadow (three.js).

   Hand-painted Ghibli mood, dialled all the way up:
   • ~22k GPU-instanced grass blades
   • wind that travels across the field in coherent gusts
   • the grass parts away from your cursor
   • cinematic bloom, drifting clouds, fireflies and wildflowers
     in the brand's rust / cream / gold

   Degrades gracefully (painted CSS sky if WebGL is missing),
   pauses when off-screen, eases its motion for reduced-motion
   visitors, and disposes everything on unmount.
   ─────────────────────────────────────────────────────────── */

const BLADE_H = 2.4;

function hillHeight(x: number, z: number) {
  return (
    Math.sin(x * 0.045 + 0.4) * 1.9 +
    Math.sin(z * 0.038 - 0.7) * 1.7 +
    Math.sin((x + z) * 0.025) * 1.2 +
    Math.sin(x * 0.017 - z * 0.021) * 2.6
  );
}
const pathX = (z: number) => Math.sin(z * 0.018) * 26 + Math.sin(z * 0.05) * 6;

function toonRamp() {
  const data = new Uint8Array([85, 140, 200, 255]);
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

function softDisc(inner = "rgba(255,240,200,1)", outer = "rgba(255,240,200,0)") {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const MeadowInterlude = memo(() => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mScale = reduced ? 0.6 : 1; // ease motion for reduced-motion, never freeze

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      if (!renderer.getContext()) throw new Error("no gl");
    } catch {
      setFailed(true);
      return;
    }

    const width = host.clientWidth || window.innerWidth;
    const height = host.clientHeight || 600;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping; // keep the authored warm colours punchy
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const HORIZON = new THREE.Color("#e7d6ad");
    scene.fog = new THREE.Fog(HORIZON.getHex(), 105, 300);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 700);
    camera.position.set(0, 3.0, 22);
    const lookTarget = new THREE.Vector3(0, 3.2, -44);
    camera.lookAt(lookTarget);

    /* ── Sky dome ─────────────────────────────────────────────────────────── */
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(520, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color("#b9cdd6") },
          mid: { value: new THREE.Color("#f0e2c0") },
          bottom: { value: new THREE.Color("#f7d8a2") },
        },
        vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;
          void main(){
            float h = normalize(vP).y * 0.5 + 0.5;
            vec3 c = mix(bottom, mid, smoothstep(0.0, 0.42, h));
            c = mix(c, top, smoothstep(0.42, 0.95, h));
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    );
    scene.add(sky);

    /* ── Sun + lights ─────────────────────────────────────────────────────── */
    const sunDir = new THREE.Vector3(-0.66, 0.4, -1).normalize();
    const sunPos = sunDir.clone().multiplyScalar(380);
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc("rgba(255,244,212,1)", "rgba(255,222,150,0)"), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    sun.position.copy(sunPos);
    sun.scale.setScalar(110);
    scene.add(sun);

    scene.add(new THREE.HemisphereLight(0xf6e6c2, 0x47521f, 0.85));
    const sunLight = new THREE.DirectionalLight(0xffe7b0, 2.0);
    sunLight.position.copy(sunPos);
    scene.add(sunLight);

    const ramp = toonRamp();

    /* ── Drifting clouds ──────────────────────────────────────────────────── */
    const cloudTex = softDisc("rgba(255,253,247,0.95)", "rgba(255,253,247,0)");
    const clouds: THREE.Sprite[] = [];
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
      s.position.set((Math.random() - 0.5) * 360, 70 + Math.random() * 90, -160 - Math.random() * 160);
      const sc = 90 + Math.random() * 80;
      s.scale.set(sc * 1.7, sc, 1);
      scene.add(s);
      clouds.push(s);
    }

    /* ── Rolling hills + winding path ─────────────────────────────────────── */
    const hillGeo = new THREE.PlaneGeometry(460, 460, 200, 200);
    hillGeo.rotateX(-Math.PI / 2);
    const pos = hillGeo.attributes.position as THREE.BufferAttribute;
    const hcol = new Float32Array(pos.count * 3);
    const tmp = new THREE.Color();
    const LOW = new THREE.Color("#54711f");
    const HIGH = new THREE.Color("#90a83f");
    const PATH = new THREE.Color("#d9c79a");
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = hillHeight(x, z);
      pos.setY(i, y);
      const t = THREE.MathUtils.clamp((y + 5.5) / 11, 0, 1);
      tmp.copy(LOW).lerp(HIGH, t);
      const dPath = Math.abs(x - pathX(z));
      if (dPath < 7) tmp.lerp(PATH, (1 - dPath / 7) * 0.85);
      hcol[i * 3] = tmp.r; hcol[i * 3 + 1] = tmp.g; hcol[i * 3 + 2] = tmp.b;
    }
    hillGeo.setAttribute("color", new THREE.BufferAttribute(hcol, 3));
    hillGeo.computeVertexNormals();
    const hills = new THREE.Mesh(hillGeo, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp }));
    hills.position.y = -2;
    scene.add(hills);

    /* ── Grass — instanced, wind waves + cursor interaction ───────────────── */
    const COUNT = 22000;
    let grass: THREE.InstancedMesh | null = null;
    let grassShader: THREE.WebGLProgramParametersWithUniforms | null = null;
    {
      const blade = new THREE.PlaneGeometry(0.34, BLADE_H, 1, 4);
      blade.translate(0, BLADE_H / 2, 0);
      {
        const bp = blade.attributes.position as THREE.BufferAttribute;
        const bc = new Float32Array(bp.count * 3);
        const cBase = new THREE.Color("#39520f");
        const cTip = new THREE.Color("#b4d05a");
        const cc = new THREE.Color();
        for (let i = 0; i < bp.count; i++) {
          const f = THREE.MathUtils.clamp(bp.getY(i) / BLADE_H, 0, 1);
          bp.setX(i, bp.getX(i) * (1 - 0.82 * f));
          cc.copy(cBase).lerp(cTip, f * f);
          bc[i * 3] = cc.r; bc[i * 3 + 1] = cc.g; bc[i * 3 + 2] = cc.b;
        }
        bp.needsUpdate = true;
        blade.setAttribute("color", new THREE.BufferAttribute(bc, 3));
      }
      const grassMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp, side: THREE.DoubleSide });
      grassMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 };
        shader.uniforms.uMouse = { value: new THREE.Vector2(9999, 9999) };
        shader.uniforms.uM = { value: mScale };
        shader.vertexShader =
          "attribute float aPhase;\nuniform float uTime;\nuniform vec2 uMouse;\nuniform float uM;\n" +
          shader.vertexShader.replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
             vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
             float bend = clamp(transformed.y / ${BLADE_H.toFixed(2)}, 0.0, 1.0);
             bend *= bend;
             float wv = sin(ip.x * 0.09 + ip.z * 0.07 - uTime * 1.7)
                      + 0.5 * sin(ip.x * 0.21 - ip.z * 0.15 - uTime * 2.6 + aPhase);
             float gust = 0.6 + 0.4 * sin(uTime * 0.4 + ip.x * 0.015);
             transformed.x += wv * bend * 0.55 * gust * uM;
             transformed.z += cos(uTime * 1.3 + aPhase) * bend * 0.22 * uM;
             vec2 toM = ip.xz - uMouse;
             float d = length(toM);
             float infl = smoothstep(13.0, 0.0, d);
             vec2 dir = toM / max(d, 0.001);
             transformed.x += dir.x * infl * bend * 2.4;
             transformed.z += dir.y * infl * bend * 2.4;`,
          );
        grassShader = shader;
      };
      grass = new THREE.InstancedMesh(blade, grassMat, COUNT);
      const dummy = new THREE.Object3D();
      const phases = new Float32Array(COUNT);
      const gCol = new THREE.Color();
      let placed = 0;
      while (placed < COUNT) {
        const x = (Math.random() - 0.5) * 210;
        const z = 18 - Math.random() * 168;
        if (Math.abs(x - pathX(z)) < 3.6) continue;
        const y = hillHeight(x, z) - 2;
        dummy.position.set(x, y, z);
        dummy.rotation.set(0, Math.random() * Math.PI, (Math.random() - 0.5) * 0.24);
        const s = 0.8 + Math.random() * 1.1;
        dummy.scale.set(0.9 + Math.random() * 0.5, s, 1);
        dummy.updateMatrix();
        grass.setMatrixAt(placed, dummy.matrix);
        const v = 0.72 + Math.random() * 0.34;
        gCol.setRGB(v, v, v);
        grass.setColorAt(placed, gCol);
        phases[placed] = Math.random() * Math.PI * 2;
        placed++;
      }
      blade.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
      grass.instanceMatrix.needsUpdate = true;
      if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
      grass.frustumCulled = false;
      scene.add(grass);
    }

    /* ── Wildflowers — dots of brand colour scattered through the field ───── */
    {
      const N = 620;
      const fg = new THREE.BufferGeometry();
      const fp = new Float32Array(N * 3);
      const fc = new Float32Array(N * 3);
      const palette = ["#c8431e", "#f3eadb", "#e8b23a", "#fbf3e0", "#d9683a"].map((h) => new THREE.Color(h));
      let n = 0;
      while (n < N) {
        const x = (Math.random() - 0.5) * 170;
        const z = 16 - Math.random() * 150;
        if (Math.abs(x - pathX(z)) < 4) continue;
        const y = hillHeight(x, z) - 2 + 0.7 + Math.random() * 0.7;
        fp[n * 3] = x; fp[n * 3 + 1] = y; fp[n * 3 + 2] = z;
        const c = palette[(Math.random() * palette.length) | 0];
        fc[n * 3] = c.r; fc[n * 3 + 1] = c.g; fc[n * 3 + 2] = c.b;
        n++;
      }
      fg.setAttribute("position", new THREE.BufferAttribute(fp, 3));
      fg.setAttribute("color", new THREE.BufferAttribute(fc, 3));
      const flowers = new THREE.Points(fg, new THREE.PointsMaterial({ size: 1.05, map: softDisc("rgba(255,255,255,1)", "rgba(255,255,255,0)"), vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true }));
      scene.add(flowers);
    }

    /* ── Fireflies / glowing pollen (bloom makes them shine) ──────────────── */
    const MOTE = 260;
    const moteData: { x: number; y: number; z: number; sp: number; sw: number; ph: number }[] = [];
    const mg = new THREE.BufferGeometry();
    const mp = new Float32Array(MOTE * 3);
    for (let i = 0; i < MOTE; i++) {
      const x = (Math.random() - 0.5) * 150;
      const y = Math.random() * 30 + 1;
      const z = (Math.random() - 0.5) * 140 - 20;
      moteData.push({ x, y, z, sp: 0.4 + Math.random() * 1.0, sw: 0.6 + Math.random() * 1.8, ph: Math.random() * 6.28 });
      mp[i * 3] = x; mp[i * 3 + 1] = y; mp[i * 3 + 2] = z;
    }
    mg.setAttribute("position", new THREE.BufferAttribute(mp, 3));
    const motes = new THREE.Points(mg, new THREE.PointsMaterial({ size: 0.9, map: softDisc(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color("#fff0c0"), opacity: 0.95, sizeAttenuation: true, fog: false }));
    scene.add(motes);

    /* ── Post-processing: cinematic bloom ─────────────────────────────────── */
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.34, 0.5, 0.9);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    /* ── Interaction ──────────────────────────────────────────────────────── */
    const target = new THREE.Vector2(0, 0);
    const cur = new THREE.Vector2(0, 0);
    const ndc = new THREE.Vector2();
    const ray = new THREE.Raycaster();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const mouseWorld = new THREE.Vector3(9999, 0, 9999);
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;
      target.set((nx - 0.5) * 2, (ny - 0.5) * 2);
      ndc.set(nx * 2 - 1, -(ny * 2 - 1));
      ray.setFromCamera(ndc, camera);
      ray.ray.intersectPlane(ground, mouseWorld);
    };
    const onLeave = () => { mouseWorld.set(9999, 0, 9999); };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    const clock = new THREE.Clock();
    let raf = 0;
    let visible = true;

    const frame = () => {
      const t = clock.getElapsedTime();
      cur.lerp(target, 0.05);
      camera.position.x = cur.x * 7 + Math.sin(t * 0.06) * 1.8 * mScale;
      camera.position.y = 3.0 - cur.y * 1.4 + Math.sin(t * 0.09) * 0.25 * mScale;
      camera.lookAt(lookTarget);

      if (grassShader) {
        grassShader.uniforms.uTime.value = t;
        (grassShader.uniforms.uMouse.value as THREE.Vector2).set(mouseWorld.x, mouseWorld.z);
      }

      const ma = (motes.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < moteData.length; i++) {
        const d = moteData[i];
        d.y += d.sp * 0.016 * mScale;
        if (d.y > 32) d.y = 0.5;
        ma[i * 3] = d.x + Math.sin(t * 0.5 + d.ph) * d.sw;
        ma[i * 3 + 1] = d.y;
        ma[i * 3 + 2] = d.z + Math.cos(t * 0.4 + d.ph) * d.sw;
      }
      (motes.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      for (const c of clouds) {
        c.position.x += 0.02 * mScale;
        if (c.position.x > 200) c.position.x = -200;
      }

      composer.render();
    };

    const loop = () => {
      if (visible) frame();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.02 });
    io.observe(host);

    const onResize = () => {
      const w = host.clientWidth || window.innerWidth;
      const h = host.clientHeight || 600;
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloom.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      composer.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = (m as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) (mat as THREE.Material).dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <section id="meadow" className="relative w-full overflow-hidden" style={{ height: "min(92vh, 900px)", minHeight: 560 }}>
      <div ref={hostRef} className="absolute inset-0" aria-hidden="true" />

      {failed && (
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#b9cdd6 0%,#f0e2c0 45%,#9aa85a 100%)" }} />
      )}

      <div className="cc-grain pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 240px 70px rgba(90,60,25,0.18)" }} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-6 pt-20 md:pt-28 text-center">
        <div className="cc-label text-[color:var(--cc-rust)]">The long view</div>
        <h2 className="mt-4 cc-font-display text-4xl md:text-6xl leading-[0.95] tracking-tight text-[color:var(--cc-ink)]">
          Your path is already<br />
          <span className="cc-italic-wonk text-[color:var(--cc-rust)]">taking shape.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl cc-font-editorial text-lg md:text-xl text-[color:var(--cc-ink-soft)]">
          Every search, every draft, every signal — quietly composing the ground ahead.
        </p>
        <p className="mt-6 cc-label-sm text-[color:var(--cc-ash)]">Move your cursor through the grass</p>
      </div>
    </section>
  );
});

MeadowInterlude.displayName = "MeadowInterlude";

export default MeadowInterlude;
