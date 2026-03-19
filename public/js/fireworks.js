import confetti from 'canvas-confetti';

const duration = 5000;
const end = Date.now() + duration;

const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];

function frame() {
  confetti({
    particleCount: 7,
    angle: 60,
    spread: 80,
    origin: { x: 0, y: 0.7 },
    colors: colors
  });
  confetti({
    particleCount: 7,
    angle: 120,
    spread: 80,
    origin: { x: 1, y: 0.7 },
    colors: colors
  });

  if (Date.now() < end) {
    requestAnimationFrame(frame);
  }
}

frame();
