// Presentation only: route guards and action eligibility remain in the existing auth code.
export function navigationArea(pathname) {
  if (pathname === '/activity' || pathname.startsWith('/requests/') || pathname.endsWith('/requests'))
    return 'activity';
  if (pathname === '/items/new' || pathname.endsWith('/edit')) return 'post';
  if (pathname === '/profile' || pathname.startsWith('/users/')) return 'profile';
  if (pathname === '/shelf' || /^\/items\/[^/]+$/.test(pathname)) return 'browse';
  return null;
}

export function mobileHeader(pathname) {
  if (pathname === '/items/new') return { title: 'Post an item' };
  if (/^\/items\/[^/]+\/edit$/.test(pathname))
    return { title: 'Edit listing', backTo: pathname.replace(/\/edit$/, '') };
  if (/^\/items\/[^/]+\/requests$/.test(pathname))
    return { title: 'Item requests', backTo: '/activity?tab=listings' };
  if (/^\/items\/[^/]+$/.test(pathname)) return { title: 'Item', backTo: '/shelf' };
  if (pathname.startsWith('/requests/')) return { title: 'Request', backTo: '/activity?tab=requests' };
  if (pathname === '/activity') return { title: 'My Activity' };
  if (pathname === '/profile') return { title: 'Profile' };
  if (pathname.startsWith('/users/')) return { title: 'Profile', backTo: '/shelf' };
  return null;
}
