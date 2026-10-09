import { useEffect, useState } from 'react';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import Avatar from '../components/ui/Avatar';
import StatusChip, { statuses } from '../components/ui/StatusChip';
import TrustBadge, { trustLevels } from '../components/ui/TrustBadge';
import Tabs from '../components/ui/Tabs';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/modals/Modal';
import VerifiedOnlyModal from '../components/modals/VerifiedOnlyModal';
import Navbar from '../components/layout/Navbar';
import TabBar from '../components/layout/TabBar';
export default function UiPreview() {
  const [theme, setTheme] = useState(''); const [modal, setModal] = useState(''); const [tab, setTab] = useState('listings'); const notify = useToast();
  useEffect(() => { document.documentElement.dataset.theme = theme; return () => { delete document.documentElement.dataset.theme; }; }, [theme]);
  return <section className="container ui-preview"><h1>Shared UI review</h1><p>Development-only component and theme preview. No student data.</p>
    <label className="theme-control">Theme <select value={theme} onChange={e => setTheme(e.target.value)}><option value="">Grayscale</option><option value="example">Example brand</option></select></label>
    <section className="preview-section"><h2>Buttons and feedback</h2><div className="actions"><Button onClick={() => notify('Action confirmed.')}>Primary</Button><Button variant="secondary" onClick={() => notify('Secondary action confirmed.')}>Secondary</Button><Button variant="ghost" onClick={() => notify('Ghost action confirmed.')}>Ghost</Button><Button disabled>Disabled</Button></div></section>
    <section className="preview-section"><h2>Fields and avatars</h2><div className="preview-grid"><Field label="Full name" placeholder="Enter your name" hint="Use the name your meetup partner will recognize." /><Field label="BulSU email" type="email" error="Use your BulSU email (ends with @ms.bulsu.edu.ph)." /></div><div className="actions"><Avatar size="sm" /><Avatar /><Avatar size="lg" /></div></section>
    <section className="preview-section"><h2>Status and trust</h2><div className="actions">{Object.keys(statuses).map(s => <StatusChip key={s} status={s} />)}</div><div className="actions">{Object.keys(trustLevels).map(l => <TrustBadge key={l} level={l} />)}</div></section>
    <section className="preview-section"><h2>Dialogs and sheets</h2><div className="actions"><Button onClick={() => setModal('standard')}>Open dialog</Button><Button variant="secondary" onClick={() => setModal('verified')}>Verified students only</Button></div></section>
    <section className="preview-section"><h2>Profile tabs</h2><Tabs label="Profile sections" tabs={[{ value: 'listings', label: 'Listings' }, { value: 'history', label: 'Condition history' }]} value={tab} onChange={setTab}><p>{tab === 'listings' ? 'No listings to show.' : 'No condition history to show.'}</p></Tabs></section>
    <section className="preview-section"><h2>Navigation variants</h2><Navbar role="student" /><Navbar role="admin" /><div className="tab-bar-preview"><TabBar /></div></section>
    <Modal open={modal === 'standard'} onClose={() => setModal('')} title="Dialog review"><p>Use Tab, Shift+Tab, Escape, the close button, or the backdrop.</p><Field label="Condition notes" placeholder="Enter notes" /><div className="actions"><Button onClick={() => { setModal(''); notify('Review confirmed.'); }}>Confirm</Button><Button variant="secondary" onClick={() => setModal('')}>Cancel</Button></div></Modal>
    <VerifiedOnlyModal open={modal === 'verified'} onClose={() => setModal('')} />
  </section>;
}

