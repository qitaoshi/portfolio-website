// 3D Lazy Susan. Proportions come from 3d/analysis.md (glass disc : gold plate : hub = 1 : 0.31 : 0.11, about 40 degrees elevation).
// Light and environment are fixed in the scene and only the turntable rotates, so reflections stay put like real glass.
import * as THREE from "three";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

const host = document.getElementById("susan");
const picks = [...document.querySelectorAll(".pick")];
const title = document.getElementById("now-title");
const stack = document.getElementById("now-stack");
const link = document.getElementById("now-link");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

let idx = 0;
let spinTo = null; // set once the 3D scene is ready

function panel(i) {
  idx = i;
  const p = picks[i].dataset;
  picks.forEach((b, j) => b.setAttribute("aria-pressed", j === i));
  title.textContent = p.title;
  stack.replaceChildren(...p.stack.split(",").map((t) => Object.assign(document.createElement("li"), { textContent: t.trim() })));
  link.href = p.href;
}
function select(i) {
  panel(i);
  spinTo?.(i);
}
picks.forEach((b, i) => b.addEventListener("click", () => select(i)));
host.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") select((idx + 1) % 4);
  if (e.key === "ArrowLeft") select((idx + 3) % 4);
});


function canvasTex(size, draw, repeat) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping, t.repeat.set(repeat, repeat);
  return t;
}

// Blue-and-white porcelain props, like the teapots, bowls and cups on the banquet table in the reference photo.
const cobalt = "#1f3f9a";
const bwTex = (() => { // hand-painted rows: foot lines, lotus petals, scroll wave, shoulder lines, diamond band. v = 0 at the bottom of an object's profile.
  const N = 1024, c = document.createElement("canvas"); c.width = c.height = N;
  const g = c.getContext("2d");
  g.fillStyle = "#f7f7f3"; g.fillRect(0, 0, N, N);
  const y = (v) => (1 - v) * N;
  g.strokeStyle = g.fillStyle = cobalt; g.lineJoin = g.lineCap = "round";
  const line = (v, w = 5) => { g.lineWidth = w; g.beginPath(); g.moveTo(0, y(v)); g.lineTo(N, y(v)); g.stroke(); };
  const P = 14; // repeats around the object, a whole number so the seam disappears
  line(0.07, 6); line(0.095, 3);
  for (let k = 0; k < P; k++) { // lotus petals
    const x = ((k + 0.5) * N) / P, w = N / P / 2.1;
    g.beginPath(); g.moveTo(x, y(0.12)); g.quadraticCurveTo(x - w, y(0.2), x, y(0.3)); g.quadraticCurveTo(x + w, y(0.2), x, y(0.12));
    g.globalAlpha = 0.22; g.fill(); g.globalAlpha = 1; g.lineWidth = 4; g.stroke();
    g.lineWidth = 3; g.beginPath(); g.moveTo(x, y(0.14)); g.lineTo(x, y(0.27)); g.stroke();
  }
  line(0.32, 3); line(0.34, 6);
  g.lineWidth = 4; g.beginPath(); // scroll wave with dots
  for (let x = 0; x <= N; x += 8) { const yy = y(0.4) + Math.sin((x / N) * Math.PI * 2 * P) * 14; if (x) g.lineTo(x, yy); else g.moveTo(x, yy); }
  g.stroke();
  for (let k = 0; k < P; k++) { g.beginPath(); g.arc(((k + 0.25) * N) / P, y(0.4) - 26, 4, 0, 7); g.fill(); }
  line(0.46, 3); line(0.48, 6); line(0.52, 6); line(0.545, 3);
  for (let k = 0; k < P * 2; k++) { // diamond band
    const x = ((k + 0.5) * N) / (P * 2);
    g.beginPath(); g.moveTo(x, y(0.6) - 14); g.lineTo(x + 10, y(0.6)); g.lineTo(x, y(0.6) + 14); g.lineTo(x - 10, y(0.6)); g.closePath(); g.fill();
  }
  line(0.7, 3); line(0.725, 6);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; t.wrapS = THREE.RepeatWrapping;
  return t;
})();
const glaze = { roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06, side: THREE.DoubleSide };
const painted = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: bwTex, ...glaze });
const plain = new THREE.MeshPhysicalMaterial({ color: 0xf6f6f2, ...glaze });
const smooth = (pts, n = 72) => new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(n).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
const lathe = (pts, mat = painted) => new THREE.Mesh(new THREE.LatheGeometry(smooth(pts), 96), mat);
const tube = (pts, r, mat = plain) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0))), 32, r, 16), mat);
const shadowed = (g) => (g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }), g);
function teapot() {
  const g = new THREE.Group();
  // foot ring, belly, shoulder, lid flange, domed lid
  const body = lathe([[0, 0.03], [0.22, 0.03], [0.24, 0], [0.32, 0], [0.34, 0.03], [0.42, 0.05], [0.5, 0.13], [0.55, 0.28], [0.52, 0.43], [0.43, 0.54], [0.3, 0.6], [0.29, 0.625], [0.31, 0.64], [0.26, 0.655], [0.22, 0.665], [0.17, 0.7], [0.1, 0.74], [0.05, 0.765], [0, 0.775]]);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 16), plain); knob.position.y = 0.81;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.05, 16), plain); neck.position.y = 0.78;
  g.add(body, neck, knob,
    tube([[0.44, 0.17], [0.6, 0.25], [0.74, 0.42], [0.84, 0.56]], 0.058),
    tube([[-0.5, 0.52], [-0.74, 0.5], [-0.78, 0.3], [-0.62, 0.14], [-0.48, 0.14]], 0.045));
  return shadowed(g);
}
const bowl = () => shadowed(lathe([[0, 0.045], [0.17, 0.045], [0.18, 0], [0.25, 0], [0.27, 0.03], [0.4, 0.13], [0.52, 0.3], [0.57, 0.345], [0.5, 0.35], [0.37, 0.2], [0.23, 0.09], [0, 0.07]]));
function teacup() { // cup on a saucer, no handle, like the tea cups in the photo
  const g = new THREE.Group();
  const cup = bowl(); cup.scale.setScalar(0.5); cup.position.y = 0.04;
  g.add(lathe([[0, 0.02], [0.22, 0.02], [0.23, 0], [0.29, 0], [0.31, 0.03], [0.42, 0.055], [0.47, 0.105], [0.45, 0.115], [0.38, 0.085], [0.3, 0.045], [0, 0.04]], plain), cup);
  return shadowed(g);
}
function chopsticks() { // pair on a small plate
  const g = new THREE.Group();
  g.add(lathe([[0, 0.03], [0.4, 0.03], [0.42, 0], [0.5, 0], [0.52, 0.035], [0.62, 0.06], [0.69, 0.115], [0.67, 0.13], [0.6, 0.105], [0.46, 0.06], [0, 0.05]]));
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b2f22, roughness: 0.5 });
  for (const dz of [-0.05, 0.05]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.01, 1.3, 12), wood);
    c.rotation.z = Math.PI / 2; c.rotation.y = 0.1 * Math.sign(dz); c.position.set(0.04, 0.075, dz * 1.5);
    g.add(c);
  }
  return shadowed(g);
}

// rounded card with real thickness; the face texture is mapped 0..1 across the front
function cardGeo(w, h, r, depth) {
  const sh = new THREE.Shape(), x = -w / 2;
  sh.moveTo(x + r, 0); sh.lineTo(x + w - r, 0); sh.quadraticCurveTo(x + w, 0, x + w, r); sh.lineTo(x + w, h - r); sh.quadraticCurveTo(x + w, h, x + w - r, h);
  sh.lineTo(x + r, h); sh.quadraticCurveTo(x, h, x, h - r); sh.lineTo(x, r); sh.quadraticCurveTo(x, 0, x + r, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 10 });
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, p.getY(i) / h);
  g.translate(0, 0, -depth / 2);
  return g;
}

function build() {
  const D = 4; // glass radius
  const GLASS_H = 0.14;
  const R = 2.7; // plate ring radius

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  host.append(renderer.domElement);
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.8;

  const camera = new THREE.PerspectiveCamera(12, 4 / 3, 0.1, 100); // narrow lens, far away: keeps the disc's near and far halves the same visual size
  const tilt = THREE.MathUtils.degToRad(28); // camera elevation: lower = more side-on, higher = more top-down
  const DIST = 29;
  camera.position.set(0, 0.3 + Math.sin(tilt) * DIST, Math.cos(tilt) * DIST);
  camera.lookAt(0, 0.3, 0); // aim a little above the glass so the standing cards are framed too

  const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
  key.position.set(-6, 12, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 40 });
  key.shadow.radius = 3;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  scene.add(key, new THREE.HemisphereLight(0xffffff, 0x1a2a55, 0.5));

  // plain dark table under the glass: glass needs something to refract, but no pattern to distract from it
  const table = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 0.2, 96), new THREE.MeshStandardMaterial({ color: 0x101c3f, roughness: 0.7 }));
  table.position.y = -0.22; // just under the glass, like a real banquet table
  table.receiveShadow = true;
  const bearing = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.12, 48), new THREE.MeshStandardMaterial({ color: 0x15191a, metalness: 0.8, roughness: 0.4 }));
  bearing.position.y = -0.06;
  scene.add(table, bearing);

  const turn = new THREE.Group();
  scene.add(turn);
  // soft contact shadows under everything, so objects sit on the glass instead of floating over it
  const blobTex = canvasTex(128, (g, sz) => {
    const gr = g.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2);
    gr.addColorStop(0, "rgba(0,0,0,.5)"); gr.addColorStop(0.6, "rgba(0,0,0,.22)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, sz, sz);
  });
  const blob = (x, z, r) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, GLASS_H + 0.003, z);
    turn.add(m);
  };

  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(D, D, GLASS_H, 128),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, ior: 1.5, thickness: GLASS_H, roughness: 0.04, specularIntensity: 0.5, attenuationColor: 0xcfe8e0, attenuationDistance: 1.2 })
  );
  glass.position.y = GLASS_H / 2;
  glass.receiveShadow = true;
  // polished edge: the bright line along the rim in the reference photo
  const edge = new THREE.Mesh(new THREE.TorusGeometry(D, 0.05, 16, 160), new THREE.MeshPhysicalMaterial({ color: 0xe4f3ef, roughness: 0.08, transparent: true, opacity: 0.6 }));
  edge.rotation.x = Math.PI / 2;
  edge.position.y = GLASS_H / 2;
  turn.add(glass, edge);

  // gold plate (approximate relief: the reference photo is blurred there)
  const emboss = canvasTex(512, (g, s) => {
    g.fillStyle = "#808080";
    g.fillRect(0, 0, s, s);
    g.translate(s / 2, s / 2);
    g.strokeStyle = "#fff";
    g.lineWidth = 6;
    for (const r of [235, 205, 95, 70]) { g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); }
    g.fillStyle = "#fff";
    for (let k = 0; k < 12; k++) {
      g.save(); g.rotate((k * Math.PI) / 6); g.beginPath(); g.ellipse(150, 0, 34, 14, 0, 0, 7); g.fill(); g.restore();
    }
  });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a93a, metalness: 0.95, roughness: 0.32, bumpMap: emboss, bumpScale: 3 });
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.24, 0.05, 96), gold);
  plate.position.y = GLASS_H + 0.025;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.03, 12, 96), gold);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = GLASS_H + 0.05;
  // silver hub with radial brushing
  const brush = canvasTex(256, (g, s) => {
    g.fillStyle = "#c4c8cb";
    g.fillRect(0, 0, s, s);
    g.translate(s / 2, s / 2);
    for (let k = 0; k < 260; k++) {
      g.rotate(Math.random() * 6.28);
      g.strokeStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "60,65,70"},${0.08 + Math.random() * 0.14})`;
      g.lineWidth = 0.5 + Math.random();
      g.beginPath(); g.moveTo(0, 0); g.lineTo(s / 2, 0); g.stroke();
    }
  });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.07, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: brush, metalness: 1, roughness: 0.3, anisotropy: 0.8 }));
  hub.position.y = GLASS_H + 0.085;
  for (const m of [plate, rim, hub]) m.castShadow = m.receiveShadow = true;
  turn.add(plate, rim, hub);

  // four cards standing on small stands, one per project or recipe. The face is drawn on a canvas like the cards on the page.
  const CW = 1.92, CH = 1.45, CARD_R = 3.45; // CARD_R plus half a stand must stay inside the glass radius
  const standMat = new THREE.MeshStandardMaterial({ color: 0x2a1f18, roughness: 0.6 });
  const roundRect = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const faceTex = (b) => {
    const W = 800, H = Math.round((W * CH) / CW);
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const draw = (img) => {
      g.clearRect(0, 0, W, H);
      g.fillStyle = "#f3f5f1"; g.fillRect(0, 0, W, H); // the card geometry itself is rounded
      if (img) {
        g.save(); roundRect(g, 24, 24, W - 48, 380, 22); g.clip();
        const k = Math.max((W - 48) / img.width, 380 / img.height);
        g.drawImage(img, W / 2 - (img.width * k) / 2, 24 + 190 - (img.height * k) / 2, img.width * k, img.height * k);
        g.restore();
      }
      g.fillStyle = "#0e1a3c"; g.textBaseline = "alphabetic";
      let size = 50; // shrink long titles to fit instead of squashing the letters
      g.font = `${size}px "Bagel Fat One", sans-serif`;
      while (size > 30 && g.measureText(b.dataset.title).width > W - 56) g.font = `${--size}px "Bagel Fat One", sans-serif`;
      g.fillText(b.dataset.title, 28, 478, W - 56);
      g.font = '700 26px "Public Sans", sans-serif';
      let x = 28;
      for (const tag of b.dataset.stack.split(",").map((v) => v.trim())) {
        const w = g.measureText(tag).width + 32;
        if (x + w > W - 28) break; // no room left on the card: drop the extra tags
        roundRect(g, x, 508, w, 44, 22); g.strokeStyle = "rgba(14,26,60,.45)"; g.lineWidth = 2; g.stroke();
        g.fillStyle = "#0e1a3c"; g.fillText(tag, x + 16, 539);
        x += w + 10;
      }
      t.needsUpdate = true;
      if (img) kick(); // not before the motion loop below exists
    };
    draw(null);
    const img = new Image();
    img.onload = () => document.fonts.load('50px "Bagel Fat One"').then(() => draw(img));
    img.src = b.dataset.img;
    return t;
  };
  const cards = picks.map((b, i) => {
    const th = (i * Math.PI) / 2;
    const g = new THREE.Group();
    g.position.set(CARD_R * Math.sin(th), GLASS_H, CARD_R * Math.cos(th));
    g.userData.i = i;
    blob(g.position.x, g.position.z, 0.95);
    const bill = new THREE.Group(); // counter-rotated every frame so the card always faces the viewer, never edge-on or from behind
    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.07, 0.4), standMat);
    stand.position.set(0, 0.035, -0.05);
    const lean = new THREE.Group(); // card leans back against its stand, so at a low camera angle it does not hide the gold plate
    lean.position.set(0, 0.07, 0); lean.rotation.x = -0.3;
    const face = faceTex(b);
    const mat = new THREE.MeshStandardMaterial({ map: face, emissive: 0xffffff, emissiveMap: face, emissiveIntensity: 0, roughness: 0.6 });
    bill.userData.mat = mat; // the focus effect brightens the chosen card and dims the rest
    const front = new THREE.Mesh(cardGeo(CW, CH, 0.09, 0.035), [mat, new THREE.MeshStandardMaterial({ color: 0xd9dde6, roughness: 0.8 })]); // [face, edge]
    for (const m of [stand, front]) m.castShadow = m.receiveShadow = true;
    lean.add(front);
    bill.add(stand, lean);
    g.add(bill);
    turn.add(g);
    return g;
  });

  // clutter between the cards (diagonal slots), so the table feels used
  const place = (obj, deg, r, yaw = 0, scale = 1, foot = 0.7) => {
    const th = (deg * Math.PI) / 180;
    blob(r * Math.sin(th), r * Math.cos(th), foot * scale * 1.25);
    obj.position.set(r * Math.sin(th), GLASS_H, r * Math.cos(th));
    obj.rotation.y = yaw; obj.scale.setScalar(scale);
    turn.add(obj);
  };
  place(teapot(), 45, 2.45, -0.3, 1, 0.8);
  place(teapot(), 315, 2.45, Math.PI + 0.3, 1, 0.8);
  place(bowl(), 135, 2.5, 0, 1.05, 0.6);
  place(chopsticks(), 225, 2.5, 0.3);
  place(teacup(), 72, 3.1, 0, 1, 0.45);
  place(teacup(), 252, 3.2, 0, 1, 0.45);

  // motion: a damped spring turns the table, so a flick keeps going and settles with a small overshoot (damping ratio about 0.73)
  let angle = 0, target = 0, av = 0, k = 0, dragging = false, raf = 0, last = 0;
  const SPRING = 120, DAMP = 16, STEP = 1 / 240;
  const focus = cards.map(() => 0); // 0 = resting, 1 = chosen card
  const frame = (now) => {
    raf = 0;
    const dt = Math.min(Math.max((now - last) / 1000 || 0.016, 0.001), 0.05); // rAF time can read earlier than performance.now(), so never let dt go negative
    last = now;
    let moving = dragging;
    if (!dragging) {
      if (reduce) { angle = target; av = 0; }
      else for (let t = 0; t < dt; t += STEP) { // fixed sub-steps keep the spring stable on slow frames
        const h = Math.min(STEP, dt - t);
        av += (-SPRING * (angle - target) - DAMP * av) * h;
        angle += av * h;
      }
      if (Math.abs(angle - target) > 0.0005 || Math.abs(av) > 0.01) moving = true; else { angle = target; av = 0; }
    }
    turn.rotation.y = angle;
    const live = dragging ? ((Math.round(-angle / (Math.PI / 2)) % 4) + 4) % 4 : idx; // while dragging, focus follows whichever card is nearest the front
    cards.forEach((g, i) => {
      const goal = i === live ? 1 : 0;
      const d = goal - focus[i];
      if (Math.abs(d) > 0.002) { focus[i] += reduce ? d : d * (1 - Math.exp(-dt * 10)); moving = true; } else focus[i] = goal;
      const f = focus[i], bill = g.children[0];
      bill.rotation.y = -angle;
      bill.scale.setScalar(1 + f * 0.08);
      g.position.y = GLASS_H + f * 0.1; // chosen card lifts a little
      bill.userData.mat.color.setScalar(0.62 + 0.38 * f); // others dim
      bill.userData.mat.emissiveIntensity = 0.2 * f; // chosen card glows
    });
    renderer.render(scene, camera);
    if (moving) raf = requestAnimationFrame(frame);
  };
  function kick() {
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    kick();
  };
  new ResizeObserver(resize).observe(host);
  resize();

  // drag to spin, release to snap to the nearest dish. A click without movement picks the dish under the pointer.
  const ray = new THREE.Raycaster();
  let lastX = 0, lastT = 0, vel = 0, moved = 0; // vel in rad/s
  const el = renderer.domElement;
  el.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX; lastT = e.timeStamp; vel = 0; av = 0; moved = 0;
    el.setPointerCapture(e.pointerId);
    host.style.cursor = "grabbing";
    kick();
  });
  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    moved += Math.abs(dx);
    const dtp = Math.max(e.timeStamp - lastT, 1) / 1000;
    lastT = e.timeStamp;
    vel = vel * 0.5 + ((dx * 0.008) / dtp) * 0.5; // smoothed
    angle += dx * 0.008;
    kick();
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    host.style.cursor = "";
    if (moved < 5) {
      const r = el.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      const hit = ray.intersectObjects(cards, true)[0];
      if (hit) { let o = hit.object; while (o.userData.i === undefined) o = o.parent; spinTo(o.userData.i); panel(o.userData.i); return; }
    }
    const v = Math.max(-14, Math.min(14, e.timeStamp - lastT > 80 ? 0 : vel)); // paused before letting go: no momentum
    k = Math.round(-(angle + v * 0.15) / (Math.PI / 2)); // land on the card the flick was heading for
    target = (-k * Math.PI) / 2;
    av = v; // hand the release speed to the spring
    panel(((k % 4) + 4) % 4);
    kick();
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);

  return (i) => {
    const cur = ((k % 4) + 4) % 4;
    k += ((((i - cur + 2) % 4) + 4) % 4) - 2; // shortest way round
    target = (-k * Math.PI) / 2;
    kick();
  };
}

// last on purpose: build() uses the helper consts above, which must exist before it runs
try {
  spinTo = build();
} catch {
  host.hidden = true; // no WebGL: the buttons under it still work
}
