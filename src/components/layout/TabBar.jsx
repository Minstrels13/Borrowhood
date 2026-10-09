import Icon from '../ui/Icon';
import { useToast } from '../ui/Toast';
export default function TabBar() {
  const notify = useToast();
  return <nav className="tab-bar" aria-label="Mobile navigation">{[['browse', 'Browse'], ['post', 'Post'], ['activity', 'Activity'], ['profile', 'Profile']].map(([icon, label]) => <button key={icon} onClick={() => notify(`${label} will be available soon.`)}><Icon name={icon} /><span>{label}</span></button>)}</nav>;
}

