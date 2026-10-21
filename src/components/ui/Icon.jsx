const paths = {
  check: 'M5 12l4 4L19 6',
  close: 'M6 6l12 12M6 18L18 6',
  browse: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  post: 'M12 4v16M4 12h16',
  'post-tab': 'M5 3h14l2 2v14l-2 2H5l-2-2V5zM12 7v10M7 12h10',
  activity: 'M4 6h16M4 12h16M4 18h16',
  profile: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',
  photo: 'M3 3h18v18H3zM3 17l5-5 4 4 3-3 6 6M15 8h.01',
  arrow: 'M14 6l-6 6 6 6',
  send: 'M22 2L9 15M22 2l-7 20-6-7-7-6z',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-right': 'M9 6l6 6-6 6',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 11v6M12 7h.01',
  search: 'M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  landscape: 'M2 20l8-11 5 7 3-4 5 8zM21 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  lock: 'M7 11V7a5 5 0 0 1 10 0v4M5 11h14v11H5z',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
};
export default function Icon({ name, label, className = '' }) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={paths[name] || paths.photo} />
    </svg>
  );
}
