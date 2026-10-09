import { brand } from '../../config/brand';
export default function Logo() {
  return <span className="logo"><span className="logo__mark" aria-hidden="true" /><span>{brand.name}</span></span>;
}
// A mask keeps the single logo asset recolorable by theme tokens.

