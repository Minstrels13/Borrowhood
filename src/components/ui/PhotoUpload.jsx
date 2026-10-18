import { useId } from 'react';
import Icon from './Icon';

// The caller retains file validation, previews, compression and upload ownership.
export default function PhotoUpload({ label, hint, count = 0, limit = 3, disabled, onChange, children, variant = 'slots' }) {
  const id = useId();
  const unavailable = disabled || (limit > 1 && count >= limit);
  return (
    <div className={`photo-upload photo-upload--${variant}`} data-disabled={unavailable || undefined}>
      <label className="photo-upload__label" htmlFor={id}>{label}</label>
      <input
        className="sr-only"
        id={id}
        type="file"
        aria-label={label}
        accept="image/jpeg,image/png,image/webp"
        multiple={limit > 1}
        disabled={unavailable}
        onChange={onChange}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      <div className={`photo-upload__slots${limit === 1 ? ' photo-upload__slots--single' : ''}`}>
        {children}
        {Array.from({ length: limit === 1 ? 1 : Math.max(0, limit - count) }, (_, index) => (
          <label className="photo-upload__add" htmlFor={id} key={index}>
            {variant === 'slots' && <Icon name="post" />}
            <span className={variant === 'slots' ? 'sr-only' : undefined}>{count && limit === 1 ? 'Replace photo' : 'Add photo'}</span>
          </label>
        ))}
      </div>
      {hint && <p id={`${id}-hint`} className="field__hint">{hint}</p>}
    </div>
  );
}
