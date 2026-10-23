// Fade sections in as they scroll into view. (The Lazy Susan lives in susan.js.)
const io = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }),
  { threshold: 0.15 }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

// Recipe ingredients: a button beside the heading switches between the picture grid and a plain list.
// (Project pages list a few logos in one row, which needs no second view.)
document.querySelectorAll(".recipe .ingredients").forEach((list) => {
  const heading = list.parentElement.querySelector("h2");
  const head = document.createElement("div");
  const btn = document.createElement("button");
  head.className = "section-head";
  btn.type = "button";
  btn.className = "view-toggle";
  btn.textContent = "View as list";
  btn.addEventListener("click", () => {
    btn.textContent = list.classList.toggle("as-list") ? "View as grid" : "View as list";
  });
  heading.replaceWith(head);
  head.append(heading, btn);
});

// Projects rail: a mouse can drag the ticket row sideways, like a finger swipe.
// Only when the row actually scrolls (narrow windows); touch already scrolls natively.
document.querySelectorAll(".rail").forEach((rail) => {
  let startX = 0, startLeft = 0, moved = false, dragging = false;
  rail.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || rail.scrollWidth <= rail.clientWidth) return;
    dragging = true; moved = false; startX = e.clientX; startLeft = rail.scrollLeft;
  });
  rail.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) < 5) return; // a small wobble is still a click
    if (!moved) { moved = true; rail.setPointerCapture(e.pointerId); rail.classList.add("dragging"); }
    rail.scrollLeft = startLeft - dx;
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    rail.classList.remove("dragging"); // snapping comes back on and settles on the nearest ticket
  };
  rail.addEventListener("pointerup", end);
  rail.addEventListener("pointercancel", end);
  // a drag that ends over a link or button shouldn't also click it
  rail.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  rail.addEventListener("dragstart", (e) => e.preventDefault()); // no ghost image when grabbing a screenshot
});

// Project photos: turn the row into a slideshow (arrows, counter, thumbnails) and let any picture open in a zoom view.
const ICONS = { prev: "M15 5l-7 7 7 7", next: "M9 5l7 7-7 7", zoom: "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5L20 20M10.5 7.5v6M7.5 10.5h6", close: "M6 6l12 12M18 6L6 18" };
function iconBtn(name, label) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "icon-btn";
  b.setAttribute("aria-label", label);
  b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;
  return b;
}

let zoomView, zoomPic, zoomHint;
function setZoomed(on) {
  zoomView.classList.toggle("zoomed", on);
  zoomHint.textContent = on ? "Move to look around. Click to zoom out." : "Click the picture to look closer.";
}
function aim(e) {
  const r = zoomPic.getBoundingClientRect(); // scale doesn't change this box
  const x = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
  const y = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
  zoomPic.style.transformOrigin = `${x * 100}% ${y * 100}%`;
}
function openZoom(img) {
  if (!zoomView) {
    zoomView = document.createElement("dialog");
    zoomView.className = "zoom";
    zoomView.setAttribute("aria-label", "Enlarged image");
    zoomPic = document.createElement("img");
    zoomHint = document.createElement("p");
    const close = iconBtn("close", "Close");
    zoomView.append(zoomPic, close, zoomHint);
    document.body.append(zoomView);
    zoomPic.addEventListener("pointerdown", (e) => { aim(e); setZoomed(!zoomView.classList.contains("zoomed")); });
    zoomPic.addEventListener("pointermove", (e) => { if (zoomView.classList.contains("zoomed")) aim(e); });
    close.addEventListener("click", () => zoomView.close());
    zoomView.addEventListener("click", (e) => { if (e.target === zoomView) zoomView.close(); }); // click on the dark area
    zoomView.addEventListener("close", () => setZoomed(false));
  }
  zoomPic.src = img.currentSrc || img.src;
  zoomPic.alt = img.alt;
  setZoomed(false);
  zoomView.showModal();
}

document.querySelectorAll(".project-photo").forEach((track) => {
  const slides = [...track.children];
  const gallery = document.createElement("div");
  gallery.className = "gallery";
  track.before(gallery);
  gallery.append(track);
  track.setAttribute("aria-label", "Project images");
  track.tabIndex = 0; // so arrow keys can scroll it

  // only single pictures zoom; the Side Quests level art is four images in one panel
  const zoomable = (s) => (s.matches("img") ? s : s.querySelectorAll("img").length === 1 ? s.querySelector("img") : null);
  slides.forEach((s) => {
    const img = zoomable(s);
    if (!img) return;
    img.dataset.zoom = "";
    img.addEventListener("click", () => openZoom(img));
  });

  const bar = document.createElement("div");
  bar.className = "gallery-bar";
  const thumbs = document.createElement("div");
  thumbs.className = "thumbs";
  const nav = document.createElement("div");
  nav.className = "gallery-nav";
  const count = document.createElement("output");
  const prev = iconBtn("prev", "Previous image"), next = iconBtn("next", "Next image"), zoom = iconBtn("zoom", "Enlarge image");
  nav.append(count, prev, next, zoom);
  bar.append(thumbs, nav);
  gallery.append(bar);

  const go = (i) => track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  const thumbBtns = slides.map((s, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", `Image ${i + 1} of ${slides.length}`);
    const src = s.querySelector("img") ?? s;
    const t = document.createElement("img");
    t.src = src.currentSrc || src.src;
    t.alt = "";
    b.append(t);
    b.addEventListener("click", () => go(i));
    thumbs.append(b);
    return b;
  });

  let cur = 0;
  const show = (i) => {
    cur = i;
    count.textContent = `${i + 1} / ${slides.length}`;
    thumbBtns.forEach((b, j) => b.setAttribute("aria-current", j === i));
    prev.disabled = i === 0;
    next.disabled = i === slides.length - 1;
    zoom.hidden = !zoomable(slides[i]);
  };
  prev.addEventListener("click", () => go(Math.max(cur - 1, 0)));
  next.addEventListener("click", () => go(Math.min(cur + 1, slides.length - 1)));
  zoom.addEventListener("click", () => openZoom(zoomable(slides[cur])));
  // keep the counter right however the row was scrolled (arrows, swipe, trackpad)
  const seen = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && show(slides.indexOf(e.target))), { root: track, threshold: 0.6 });
  slides.forEach((s) => seen.observe(s));
  show(0);
});
