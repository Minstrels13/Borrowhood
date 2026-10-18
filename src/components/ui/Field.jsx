import { isValidElement, useId } from 'react';

export default function Field({ label, hint, error, id, required, children, ...props }) {
  const generatedId = useId();
  const inputId = id || (isValidElement(children) && children.props.id) || generatedId;
  const isRequired = required ?? (isValidElement(children) ? children.props.required : undefined);
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy =
    [props['aria-describedby'], hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;
  const controlProps = {
    ...props,
    id: inputId,
    required: isRequired,
    'aria-invalid': error ? true : props['aria-invalid'],
    'aria-describedby': describedBy,
  };
  return (
    <div className="field">
      <label htmlFor={inputId}>
        {label}
        {isRequired && <span className="field__required"> (required)</span>}
      </label>
      {/* Custom controls opt into wiring explicitly; never clone/replace their handlers or refs. */}
      {typeof children === 'function'
        ? children(controlProps)
        : children || <input {...controlProps} />}
      {hint && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="field__error">
          <span className="field__error-icon" aria-hidden="true">
            !
          </span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
