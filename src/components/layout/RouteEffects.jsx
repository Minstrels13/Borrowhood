import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { brand } from '../../config/brand';

export default function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    const names = {
      '/': 'Welcome',
      ...(import.meta.env.DEV ? { '/__ui': 'Shared UI review' } : {}),
      '/signup': 'Sign up',
      '/login': 'Log in',
      '/pending': 'Verify your account',
      '/shelf': 'The Shelf',
      '/activity': 'My Activity',
      '/profile': 'My profile',
      '/items/new': 'Post an item',
      '/admin/verification': 'Verification queue',
    };
    const title =
      names[pathname] ||
      (pathname.startsWith('/requests/')
        ? 'Borrow request'
        : pathname.startsWith('/users/')
          ? 'Student profile'
          : pathname.endsWith('/requests')
            ? 'Item requests'
            : pathname.endsWith('/edit')
              ? 'Edit listing'
              : pathname.startsWith('/items/')
                ? 'Item details'
                : 'Page not found');
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content', getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
    );
    document.title = `${title} · ${brand.name}`;
    window.scrollTo({ top: 0 });
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}
