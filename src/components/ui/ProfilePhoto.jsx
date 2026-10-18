import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import { photoUrl } from '../../lib/profiles';

export default function ProfilePhoto({ path, name, size = 'md', decorative = false, inline = false }) {
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
      <Avatar
        src={src}
        name={name ? `${name} profile photo` : 'Your profile photo'}
        size={size}
        decorative={decorative}
        onError={() => setFailed(true)}
      />
      {failed && !decorative && <span className="small">Photo unavailable. Refresh to retry.</span>}
    </Wrapper>
  );
}
