import { useId } from 'react';
import { brand } from '../../config/brand';
import horizontal from '../../assets/brand/logo-horizontal.svg?raw';
import horizontalReversed from '../../assets/brand/logo-horizontal-on-maroon.svg?raw';
import mark from '../../assets/brand/logo.svg?raw';
import markReversed from '../../assets/brand/logo-mark-on-maroon.svg?raw';
import mono from '../../assets/brand/logo-mono.svg?raw';
import stacked from '../../assets/brand/logo-stacked.svg?raw';

export default function Logo({
  variant = 'horizontal',
  tone = 'default',
  size = 'standard',
  decorative = false,
}) {
  const gradientId = useId();
  const artwork = {
    horizontal: tone === 'onMaroon' ? horizontalReversed : horizontal,
    mark: tone === 'onMaroon' ? markReversed : mark,
    mono,
    stacked,
  };
  // Only trusted, local SVG artwork is inlined. No user HTML or uploaded SVG is accepted here.
  // Preserve the source viewBox/outlines; unique gradient IDs allow several logos on one page.
  const padded = variant === 'mark' && tone === 'onMaroon';
  const svg = (artwork[variant] || horizontal).replaceAll('__logo_gradient__', gradientId);
  return (
    <span
      className={`logo logo--${variant} logo--${size} ${padded ? 'logo--padded' : ''}`}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : brand.name}
      aria-hidden={decorative || undefined}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
