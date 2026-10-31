/* Page glue: sets the footer year and, in browsers without scroll-driven
   animations (Firefox today), pans the rocket figure from JS.
   The launch-pad effects start themselves (js/fx.js, an ES module using three.js). */
(function () {
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Modern Chrome / Edge / Safari pan the figure in CSS (see .fig in site.css).
  if (window.CSS && CSS.supports && CSS.supports("animation-timeline: view()")) return;
  var rail = document.querySelector("[data-rail]");
  var fig = rail && rail.querySelector("[data-fig]");
  if (!fig) return;
  var raf = 0;
  function update() {
    raf = 0;
    var box = rail.getBoundingClientRect();
    var span = box.height - window.innerHeight;
    var p = span > 0 ? Math.min(1, Math.max(0, -box.top / span)) : 0;
    fig.style.setProperty("--p", p.toFixed(4));
  }
  function onScroll() { if (!raf) raf = requestAnimationFrame(update); }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();
