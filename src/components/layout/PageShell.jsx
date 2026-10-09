import Navbar from './Navbar';
import TabBar from './TabBar';
export default function PageShell({ children, showTabBar = false, role }) {
  return <div className={showTabBar ? 'page-shell page-shell--tabs' : 'page-shell'}><a className="skip-link" href="#main">Skip to content</a><Navbar role={role} /><main id="main" tabIndex={-1}>{children}</main>{showTabBar && <TabBar />}</div>;
}

