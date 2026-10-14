import Navbar from './Navbar';
import TabBar from './TabBar';
import { useLocation } from 'react-router-dom';

export default function PageShell({ children, showTabBar, role }) {
  const { pathname } = useLocation();
  const tabs =
    showTabBar ??
    (pathname === '/shelf' ||
      pathname === '/activity' ||
      pathname.startsWith('/requests/') ||
      pathname.endsWith('/requests') ||
      pathname === '/items/new' ||
      pathname.endsWith('/edit'));
  return (
    <div className={tabs ? 'page-shell page-shell--tabs' : 'page-shell'}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar role={role} />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      {tabs && <TabBar />}
    </div>
  );
}
