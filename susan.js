// 3D Lazy Susan. Proportions come from 3d/analysis.md (glass disc : gold plate : hub = 1 : 0.31 : 0.11, about 40 degrees elevation).
// Light and environment are fixed in the scene and only the turntable rotates, so reflections stay put like real glass.
import * as THREE from "three";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";
import { GLTFLoader } from "./vendor/loaders/GLTFLoader.js";

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
const bwTex = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#f6f6f2"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = cobalt;
  const band = (v, h) => g.fillRect(0, (1 - v - h / 2) * 256, 256, h * 256);
  band(0.4, 0.025); band(0.44, 0.012); band(0.6, 0.025); band(0.56, 0.012);
  g.strokeStyle = cobalt; g.lineWidth = 2.4; // a row of bits: 0 is a ring, 1 is a bar
  for (let k = 0; k < 16; k++) { const one = ((k * 7 + 3) % 5) % 2; g.beginPath(); if (one) g.rect(k * 16 + 5, 123, 6, 10); else g.ellipse(k * 16 + 8, 128, 3.2, 5, 0, 0, 7); one ? g.fill() : g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping;
  return t;
})();
const glaze = { roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide };
const painted = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: bwTex, ...glaze });
const plain = new THREE.MeshPhysicalMaterial({ color: 0xf6f6f2, ...glaze });
const smooth = (pts, n = 48) => new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(n).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
const lathe = (pts, mat = painted) => new THREE.Mesh(new THREE.LatheGeometry(smooth(pts), 64), mat);
const tube = (pts, r, mat = plain) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0))), 24, r, 12), mat);
const shadowed = (g) => (g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }), g);
function teapot() {
  const g = new THREE.Group();
  const body = lathe([[0, 0], [0.3, 0], [0.4, 0.015], [0.5, 0.1], [0.55, 0.26], [0.52, 0.42], [0.42, 0.54], [0.28, 0.6], [0.23, 0.63], [0.2, 0.67], [0.12, 0.73], [0.06, 0.76], [0, 0.77]]);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 14), plain); knob.position.y = 0.8;
  g.add(body, knob,
    tube([[0.46, 0.2], [0.62, 0.28], [0.76, 0.44], [0.84, 0.56]], 0.055),
    tube([[-0.5, 0.52], [-0.74, 0.5], [-0.78, 0.3], [-0.62, 0.14], [-0.48, 0.14]], 0.04));
  return shadowed(g);
}
const bowl = () => shadowed(lathe([[0, 0], [0.2, 0], [0.26, 0.02], [0.4, 0.12], [0.52, 0.3], [0.54, 0.34], [0.5, 0.34], [0.38, 0.18], [0.24, 0.06], [0, 0.04]]));
function teacup() { // cup on a saucer, no handle, like the tea cups in the photo
  const g = new THREE.Group();
  const cup = bowl(); cup.scale.setScalar(0.5); cup.position.y = 0.02;
  g.add(lathe([[0, 0], [0.32, 0], [0.42, 0.035], [0.4, 0.04], [0.3, 0.018], [0, 0.015]], plain), cup);
  return shadowed(g);
}
function chopsticks() { // pair on a small plate
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.5, 0], [0.64, 0.04], [0.62, 0.046], [0.46, 0.02], [0, 0.018]]));
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b2f22, roughness: 0.5 });
  for (const dz of [-0.05, 0.05]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.01, 1.3, 8), wood);
    c.rotation.z = Math.PI / 2; c.rotation.y = 0.1 * Math.sign(dz); c.position.set(0.04, 0.045, dz * 1.5);
    g.add(c);
  }
  return shadowed(g);
}

function build() {
  const D = 4; // glass radius
  const GLASS_H = 0.22; // thick enough that the glass top reads as the lazy susan
  const R = 2.7; // plate ring radius

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 3));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  host.append(renderer.domElement);
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.8;

  const camera = new THREE.PerspectiveCamera(12, 4 / 3, 0.1, 100); // narrow lens, far away: keeps the disc's near and far halves the same visual size
  const tilt = THREE.MathUtils.degToRad(40);
  camera.position.set(0, Math.sin(tilt) * 38, Math.cos(tilt) * 38);
  camera.lookAt(0, 0, 0);

  const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
  key.position.set(-6, 12, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 40 });
  key.shadow.radius = 4;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  scene.add(key, new THREE.HemisphereLight(0xffffff, 0x1a2a55, 0.5));

  // plain dark table under the glass: glass needs something to refract, but no pattern to distract from it
  const table = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 0.2, 96), new THREE.MeshStandardMaterial({ color: 0x101c3f, roughness: 0.7 }));
  table.position.y = -0.22; // just under the glass, like a real banquet table
  table.receiveShadow = true;
  const bearing = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.12, 48), new THREE.MeshStandardMaterial({ color: 0x15191a, metalness: 0.8, roughness: 0.4 }));
  bearing.position.y = -0.06; bearing.visible = false; // shown again below only if the Blender model fails to load
  scene.add(table, bearing);

  const turn = new THREE.Group();
  scene.add(turn);
  const props = new THREE.Group(); // the table setting: hidden until the Blender models load, so the code-drawn stand-ins never flash
  props.visible = false;
  turn.add(props);

  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, ior: 1.5, thickness: 0.08, roughness: 0.05, specularIntensity: 1, envMapIntensity: 1.5, attenuationColor: 0xa8dcc8, attenuationDistance: 0.4 });
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(D, D, GLASS_H, 128), glassMat);
  glass.position.y = GLASS_H / 2;
  glass.receiveShadow = true;
  // polished edge: the bright line along the rim in the reference photo
  const edge = new THREE.Mesh(new THREE.TorusGeometry(D, 0.05, 16, 160), new THREE.MeshPhysicalMaterial({ color: 0xf2fffb, roughness: 0.05, transparent: true, opacity: 0.85, emissive: 0x9fe0cc, emissiveIntensity: 0.25 }));
  edge.rotation.x = Math.PI / 2;
  edge.position.y = GLASS_H / 2;
  props.add(glass, edge);

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
  props.add(plate, rim, hub);

  // four cards standing on small stands, one per project or recipe. The face is drawn on a canvas like the cards on the page.
  const CW = 2.2, CH = 1.65;
  const standMat = new THREE.MeshStandardMaterial({ color: 0x2a1f18, roughness: 0.6 });
  const roundRect = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const faceTex = (b) => {
    const W = 800, H = Math.round((W * CH) / CW);
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const draw = (img) => {
      g.clearRect(0, 0, W, H);
      roundRect(g, 0, 0, W, H, 36); g.fillStyle = "#f3f5f1"; g.fill();
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
    g.position.set(3.5 * Math.sin(th), GLASS_H, 3.5 * Math.cos(th));
    g.scale.setScalar(0.8); // smaller cards hide less of the table behind them
    g.userData.i = i;
    const bill = new THREE.Group(); // counter-rotated every frame so the card always faces the viewer, never edge-on or from behind
    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.07, 0.4), standMat);
    stand.position.set(0, 0.035, -0.05);
    const lean = new THREE.Group(); // card leans back a little against its stand
    lean.position.set(0, 0.07, 0); lean.rotation.x = -0.12;
    const front = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), new THREE.MeshStandardMaterial({ map: faceTex(b), roughness: 0.6, alphaTest: 0.5 }));
    front.position.y = CH / 2;
    for (const m of [stand, front]) m.castShadow = m.receiveShadow = true;
    lean.add(front);
    bill.add(stand, lean);
    g.add(bill);
    turn.add(g);
    return g;
  });

  // clutter between the cards (diagonal slots), so the table feels used
  const place = (obj, deg, r, yaw = 0, scale = 1) => {
    const th = (deg * Math.PI) / 180;
    obj.position.set(r * Math.sin(th), GLASS_H, r * Math.cos(th));
    obj.rotation.y = yaw; obj.scale.setScalar(scale);
    props.add(obj);
    return obj;
  };
  const teapots = [place(teapot(), 45, 2.5, -0.3), place(teapot(), 315, 2.5, Math.PI + 0.3)];
  place(bowl(), 135, 2.5, 0, 1.05);
  const sticks = [place(chopsticks(), 225, 2.0, 0.3)];
  const cups = [place(teacup(), 72, 3.4), place(teacup(), 288, 3.4)];

  // Blender models replace the code-built shapes once they load; if a file fails, the code version stays.
  const loader = new GLTFLoader();
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const load = (name) => loader.loadAsync(`models/${name}.glb`).then((g) => {
    g.scene.traverse((o) => { if (o.isMesh) for (const t of Object.values(o.material)) if (t?.isTexture) t.anisotropy = aniso; }); // sharp patterns at a grazing angle
    return shadowed(g.scene);
  });
  const swap = (olds, name) => load(name).then((model) => {
    for (const old of olds) {
      const m = model.clone();
      m.position.copy(old.position); m.rotation.copy(old.rotation); m.scale.copy(old.scale);
      props.remove(old); props.add(m);
    }
    kick();
  }).catch(() => {});
  const loaded = [swap(teapots, "teapot"), swap(sticks, "chopsticks"), swap(cups, "teacup")];
  loaded.push(load("susan").then((model) => {
    // Blender glass with its rounded edge; the original gold plate and hub drop under it and spin with it
    const pane = model.getObjectByName("Glass");
    pane.material = glassMat; pane.castShadow = false; pane.receiveShadow = true;
    pane.scale.y = GLASS_H / 0.14; // the model is 0.14 thick
    props.remove(glass); props.add(pane);
    plate.position.y = -0.075; rim.position.y = -0.05; hub.position.y = -0.04;
    scene.remove(bearing); // the hub covers it, and it would poke through the plate
  }).catch(() => {}));
  Promise.all(loaded).then(() => { props.visible = bearing.visible = true; kick(); }); // all at once; any file that failed leaves its code-drawn version

  // motion
  let angle = 0, target = 0, k = 0, dragging = false, raf = 0, last = 0;
  const frame = (now) => {
    raf = 0;
    const dt = Math.min(Math.max((now - last) / 1000 || 0.016, 0.001), 0.05); // rAF time can read earlier than performance.now(), so never let dt go negative
    last = now;
    let moving = dragging;
    if (!dragging) {
      const d = target - angle;
      if (Math.abs(d) > 0.0005) { angle += reduce ? d : d * (1 - Math.exp(-dt * 7)); moving = true; } else angle = target;
    }
    turn.rotation.y = angle;
    cards.forEach((g) => (g.children[0].rotation.y = -angle));
    cards.forEach((g, i) => {
      const ty = GLASS_H + (i === idx ? 0.1 : 0); // the chosen dish lifts a little
      const d = ty - g.position.y;
      if (Math.abs(d) > 0.0005) { g.position.y += reduce ? d : d * (1 - Math.exp(-dt * 9)); moving = true; } else g.position.y = ty;
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
  let startX = 0, lastX = 0, vel = 0, moved = 0;
  const el = renderer.domElement;
  el.addEventListener("pointerdown", (e) => {
    dragging = true; startX = lastX = e.clientX; vel = 0; moved = 0;
    el.setPointerCapture(e.pointerId);
    host.style.cursor = "grabbing";
    kick();
  });
  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    moved += Math.abs(dx);
    vel = dx * 0.008;
    angle += vel;
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
    k = Math.round(-(angle + vel * 12) / (Math.PI / 2));
    target = (-k * Math.PI) / 2;
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
