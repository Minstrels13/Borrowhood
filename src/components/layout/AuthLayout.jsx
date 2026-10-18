export default function AuthLayout({ children, className = '' }) {
  return <section className={`auth-page page-section ${className}`.trim()}>{children}</section>;
}
