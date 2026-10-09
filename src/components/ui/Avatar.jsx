import { useState } from 'react';
import Icon from './Icon';
export default function Avatar({ src, name = 'Student', size = 'md' }) {
  const [failedSrc, setFailedSrc] = useState(null);
  return <span className={`avatar avatar--${size}`}>{src && src !== failedSrc ? <img src={src} alt={name} onError={() => setFailedSrc(src)} /> : <Icon name="profile" label={name} />}</span>;
}

