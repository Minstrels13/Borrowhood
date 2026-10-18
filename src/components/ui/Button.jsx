import { Link } from 'react-router-dom';
import Icon from './Icon';

export default function Button({
  variant = 'primary',
  size = 'standard',
  busy = false,
  busyLabel,
  icon,
  disabled = false,
  to,
  className = '',
  type = 'button',
  children,
  onClick,
  ...props
}) {
  const unavailable = disabled || busy;
  const classes = `button button--${variant} button--${size} ${className}`.trim();
  const content = (
    <>
      {icon && <Icon name={icon} />}
      {busy && busyLabel ? busyLabel : children}
    </>
  );
  // A disabled destination has no href, including in the browser's context menu.
  if (to && unavailable)
    return (
      <span
        className={classes}
        role="link"
        aria-disabled="true"
        aria-busy={busy || undefined}
        aria-label={props['aria-label']}
        aria-describedby={props['aria-describedby']}
        title={props.title}
        id={props.id}
      >
        {content}
      </span>
    );
  return to ? (
    <Link className={classes} to={to} onClick={onClick} {...props}>
      {content}
    </Link>
  ) : (
    <button
      type={type}
      className={classes}
      disabled={unavailable}
      aria-busy={busy || undefined}
      onClick={onClick}
      {...props}
    >
      {content}
    </button>
  );
}
