import { Link } from 'react-router-dom';

export default function Button({
  variant = 'primary',
  to,
  className = '',
  type = 'button',
  children,
  ...props
}) {
  const classes = `button button--${variant} ${className}`;
  return to ? (
    <Link className={classes} to={to} {...props}>
      {children}
    </Link>
  ) : (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
