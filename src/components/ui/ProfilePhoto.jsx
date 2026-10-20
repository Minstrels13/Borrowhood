import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import { photoUrl } from '../../lib/profiles';

export default function ProfilePhoto({ path, name, size = 'md', decorative = false, inline = false, alt, onOpen }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  const Wrapper = inline ? 'span' : 'div';
  useEffect(() => {
    let active = true;
    setSrc(null);
    setFailed(false);
    photoUrl(path)
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [path]);
  return (
    <Wrapper className="profile-photo">
      {onOpen ? <button type="button" className="profile-photo__open" disabled={!src || failed}
        aria-label={`Enlarge ${alt || `${name} profile photo`}`} onClick={() => onOpen(src)}>
        <Avatar src={src} name={alt || `${name} profile photo`} size={size} onError={() => setFailed(true)} />
      </button> : <Avatar
        src={src}
        name={alt || (name ? `${name} profile photo` : 'Your profile photo')}
        size={size}
        decorative={decorative}
        onError={() => setFailed(true)}
      />}
      {failed && !decorative && <span className="small">Photo unavailable. Refresh to retry.</span>}
    </Wrapper>
  );
}
