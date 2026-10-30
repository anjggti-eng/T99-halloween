import confetti from 'canvas-confetti';

export function fireHalloweenConfetti() {
  try {
    // Halloween orange, dark violet, blood red, and gold
    const colors = ['#f97316', '#a855f7', '#ef4444', '#facc15', '#7e22ce'];

    // Left cannon
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 70,
      origin: { x: 0.1, y: 0.8 },
      colors,
    });

    // Right cannon
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 70,
      origin: { x: 0.9, y: 0.8 },
      colors,
    });
  } catch (e) {
    console.warn('Confetti error:', e);
  }
}
