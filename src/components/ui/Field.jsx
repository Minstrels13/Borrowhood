import { useId } from 'react';

export default function Field({ label, hint, error, id, children, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const description = error || hint;
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      {children || (
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={description ? `${inputId}-help` : undefined}
          {...props}
        />
      )}
      {description && (
        <p id={`${inputId}-help`} className={error ? 'field__error' : 'field__hint'}>
          {description}
        </p>
      )}
    </div>
  );
}
