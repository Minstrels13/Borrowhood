export function trustScore({ completed = 0, late = 0, damaged = 0 }) {
  const score = Math.max(0, 100 - 8 * late - 15 * damaged);
  const level =
    completed === 0
      ? 'new'
      : score < 70
        ? 'needs_attention'
        : completed >= 5 && score >= 90
          ? 'trusted'
          : 'reliable';
  return { score, level };
}
