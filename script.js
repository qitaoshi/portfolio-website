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

// Ingredients: a button beside the heading switches between the picture grid and a plain list.
document.querySelectorAll(".ingredients").forEach((list) => {
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
