import Navbar from './Navbar';
import TabBar from './TabBar';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { mobileHeader, navigationArea } from '../../config/navigation';

export default function PageShell({ children, showTabBar, role }) {
  const { pathname } = useLocation();
  const { isVerified, isAdmin } = useAuth();
  const header = mobileHeader(pathname);
  const itemDetail = /^\/items\/[^/]+$/.test(pathname) && pathname !== '/items/new';
  const tabs =
    isVerified && !isAdmin && !itemDetail && (showTabBar ?? Boolean(navigationArea(pathname)));
  return (
    <div className={tabs ? 'page-shell page-shell--tabs' : 'page-shell'}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar role={role} context={header} />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      {tabs && <TabBar />}
    </div>
  );
}
