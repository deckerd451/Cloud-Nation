/*
 * Starfield background animation.
 *
 * This script creates a simple starfield effect by drawing small points
 * on a full‑screen canvas and animating them downward. When a star leaves
 * the bottom of the viewport it wraps around to the top, creating the
 * illusion of infinite depth. The canvas is fixed behind all content.
 */

const canvas = document.getElementById('starfield');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let width, height;
  const stars = [];
  const STAR_COUNT = 200;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function initStars() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.2 + Math.random() * 0.4,
        radius: 0.5 + Math.random() * 1.5
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
      // update position
      star.y += star.speed;
      if (star.y > height) star.y = 0;

      // draw star with gentle glow
      const grd = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius * 4);
      grd.addColorStop(0, 'rgba(255,255,255,0.8)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => {
    resize();
    initStars();
  });

  // Initialise and start animation
  resize();
  initStars();
  requestAnimationFrame(draw);
}
