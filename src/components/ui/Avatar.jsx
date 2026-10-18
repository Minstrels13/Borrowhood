import { useState } from 'react';

export default function Avatar({ src, name = 'Student', size = 'md', decorative = false, onError }) {
  const [failedSrc, setFailedSrc] = useState(null);
  return (
    <span className={`avatar avatar--${size}`} aria-hidden={decorative || undefined}>
      {src && src !== failedSrc ? (
        <img
          src={src}
          alt={decorative ? '' : name}
          decoding="async"
          onError={() => {
            setFailedSrc(src);
            onError?.();
          }}
        />
      ) : (
        <svg
          className="avatar__placeholder"
          viewBox="0 0 40 40"
          role={decorative ? undefined : 'img'}
          aria-label={decorative ? undefined : name}
          aria-hidden={decorative || undefined}
        >
          <circle cx="20" cy="15" r="7" />
          <path d="M6 37v-3a14 11 0 0 1 28 0v3z" />
        </svg>
      )}
    </span>
  );
}
