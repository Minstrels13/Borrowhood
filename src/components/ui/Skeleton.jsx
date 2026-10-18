// Decorative only: the owning region supplies one real loading announcement.
export default function Skeleton({ variant = 'card', lines = 2 }) {
  return (
    <div className={`skeleton skeleton--${variant}`} aria-hidden="true">
      {variant === 'card' && <div className="skeleton__media" />}
      {variant !== 'avatar' &&
        Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={`skeleton__line${index === lines - 1 ? ' skeleton__line--short' : ''}`}
          />
        ))}
    </div>
  );
}
