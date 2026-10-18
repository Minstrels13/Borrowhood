import Icon from './Icon';

// Display tones only. Callers retain ownership of categories, conditions and verification rules.
export default function Chip({
  label,
  tone = 'neutral',
  selected,
  onClick,
  onRemove,
  className = '',
}) {
  const classes = `chip chip--${tone} ${onClick || onRemove ? 'chip--interactive' : ''} ${className}`.trim();
  if (onClick)
    return (
      <button type="button" className={classes} aria-pressed={selected} onClick={onClick}>
        {label}
      </button>
    );
  return (
    <span className={classes}>
      {tone === 'danger' && (
        <span className="badge-warning" aria-hidden="true">
          !
        </span>
      )}
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          className="chip__remove"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
        >
          <Icon name="close" />
        </button>
      )}
    </span>
  );
}
