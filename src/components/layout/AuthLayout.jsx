import { brand } from '../../config/brand';

export default function AuthLayout({ children, className = '' }) {
  return (
    <>
      <section className={`auth-page page-section ${className}`.trim()}>{children}</section>
      <footer className="auth-footer">{brand.name} | {brand.project}</footer>
    </>
  );
}
