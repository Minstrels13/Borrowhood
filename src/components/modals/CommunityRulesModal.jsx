import Modal from './Modal';
import Button from '../ui/Button';
import { communityRules } from '../../config/communityRules';

export default function CommunityRulesModal({ open, onClose }) {
  return <Modal open={open} onClose={onClose} title="Community rules">
    <p>Help keep Borrowhood safe and useful for fellow students.</p>
    <ol className="community-rules">{communityRules.map(rule => <li key={rule}>{rule}</li>)}</ol>
    <div className="actions"><Button onClick={onClose}>Close</Button></div>
  </Modal>;
}
