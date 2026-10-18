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
import Chip from '../components/ui/Chip';
import Skeleton from '../components/ui/Skeleton';
import Logo from '../components/ui/Logo';
import { mobileHeader } from '../config/navigation';
import VerificationPanel from '../components/ui/VerificationPanel';
import VerificationStepper from '../components/ui/VerificationStepper';
import ProfileEditorFields from '../components/modals/ProfileEditorFields';

export default function UiPreview() {
  const [theme, setTheme] = useState('');
  const [verificationState, setVerificationState] = useState('email');
  const [editorName, setEditorName] = useState('');
  const [editorCourse, setEditorCourse] = useState('');
  const [editorFile, setEditorFile] = useState(null);
  const [navigationPath, setNavigationPath] = useState('/shelf');
  const [floatingNavigation, setFloatingNavigation] = useState(false);
  const [modal, setModal] = useState('');
  const [tab, setTab] = useState('listings');
  const [filterSelected, setFilterSelected] = useState(false);
  const [filterVisible, setFilterVisible] = useState(true);
  const notify = useToast();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [theme]);
  return (
    <section className="container ui-preview">
      <h1>Shared UI review</h1>
      <p>Development-only component and theme preview. No student data.</p>
      <label className="theme-control">
        Theme{' '}
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="">Borrowhood v2</option>
          <option value="example">Example brand</option>
        </select>
      </label>
      <section className="preview-section">
        <h2>Palette and typography</h2>
        <p>Local Inter with system fallbacks. These are design controls, not marketplace records.</p>
        <div className="token-swatches">
          {['maroon', 'clay', 'mist', 'steel'].map((color) => (
            <div className={`token-swatch token-swatch--${color}`} key={color}>
              <strong>{color}</strong>
            </div>
          ))}
        </div>
        <h3>Static loading treatment</h3>
        <p>Decorative shapes remain still, including with reduced motion enabled.</p>
        <Skeleton />
      </section>
      <section className="preview-section">
        <h2>Buttons and feedback</h2>
        <div className="actions">
          <Button onClick={() => notify('Action confirmed.')}>Primary</Button>
          <Button variant="secondary" onClick={() => notify('Secondary action confirmed.')}>
            Secondary
          </Button>
          <Button variant="ghost" onClick={() => notify('Ghost action confirmed.')}>
            Ghost
          </Button>
          <Button disabled>Disabled</Button>
          <Button busy busyLabel="Busy preview">
            Primary preview
          </Button>
          <Button size="large" icon="post">
            Large with icon
          </Button>
          <Button to="/shelf" disabled>
            Disabled link
          </Button>
          <Button variant="danger" onClick={() => notify('Danger style preview only.')}>
            Danger style
          </Button>
        </div>
      </section>
      <section className="preview-section">
        <h2>Fields and avatars</h2>
        <div className="preview-grid">
          <Field
            label="Full name"
            placeholder="Enter your name"
            hint="Use the name your meetup partner will recognize."
            required
          />
          <Field
            label="BulSU email"
            type="email"
            hint="Your address stays visible while correcting an error."
            error="Use your BulSU email (ends with @ms.bulsu.edu.ph)."
          />
          <Field label="Read-only control" value="Read-only preview" readOnly />
          <Field label="Disabled control" value="Disabled preview" disabled />
          <Field
            label="Custom select"
            required
            hint="This control uses explicit Field props."
            error="Choose an option."
          >
            {(controlProps) => (
              <select {...controlProps} defaultValue="">
                <option value="">Choose an option</option>
                <option value="preview">Preview option</option>
              </select>
            )}
          </Field>
          <Field label="Custom notes" hint="A multiline control with its own label." required>
            {(controlProps) => <textarea {...controlProps} rows={3} />}
          </Field>
        </div>
        <div className="actions">
          <Avatar size="sm" />
          <Avatar />
          <Avatar size="lg" />
          <Avatar src="/__ui-missing-avatar.png" name="Unavailable image preview" />
          <Avatar decorative />
          <Skeleton variant="avatar" />
        </div>
      </section>
      <section className="preview-section preview-section--chips">
        <h2>Status and trust</h2>
        <div className="actions">
          {Object.keys(statuses).map((s) => (
            <StatusChip key={s} status={s} />
          ))}
        </div>
        <h3>Display and interactive chips</h3>
        <div className="actions">
          <Chip label="Category" tone="info" />
          <Chip label="Minor wear" tone="clay" />
          <Chip label="Damaged" tone="danger" />
          <Chip
            label="Toggle filter"
            tone="info"
            selected={filterSelected}
            onClick={() => setFilterSelected(!filterSelected)}
          />
          {filterVisible ? (
            <Chip label="Selected filter" onRemove={() => setFilterVisible(false)} />
          ) : (
            <Button variant="ghost" onClick={() => setFilterVisible(true)}>
              Restore filter chip
            </Button>
          )}
        </div>
        <h3>Trust levels</h3>
        <div className="actions">
          {Object.keys(trustLevels).map((l) => (
            <TrustBadge key={l} level={l} />
          ))}
        </div>
      </section>
      <section className="preview-section">
        <h2>Dialogs and sheets</h2>
        <div className="actions">
          <Button onClick={() => setModal('standard')}>Open dialog</Button>
          <Button variant="secondary" onClick={() => setModal('verified')}>
            Verified students only
          </Button>
          {['compact', 'prompt', 'reject', 'profile', 'form', 'viewer', 'long'].map((size) => (
            <Button key={size} variant="secondary" onClick={() => setModal(size)}>
              Open {size} shell
            </Button>
          ))}
        </div>
      </section>
      <section className="preview-section">
        <h2>Verification presentation</h2>
        <p>Read-only state specimens. No account data or account actions. Real account flows require test accounts.</p>
        <label className="theme-control">
          Verification specimen
          <select value={verificationState} onChange={(e) => setVerificationState(e.target.value)}>
            <option value="email">Email confirmation</option>
            <option value="photo">Add profile photo</option>
            <option value="submit">Ready to submit</option>
            <option value="review">Awaiting admin review</option>
            <option value="rejected">Details need an update</option>
          </select>
        </label>
        <div className="verification-preview">
          <VerificationPanel
            preview
            confirmed={verificationState !== 'email'}
            hasPhoto={['submit', 'review', 'rejected'].includes(verificationState)}
            submitted={verificationState === 'review'}
            rejected={verificationState === 'rejected'}
          />
        </div>
        <h3>Completed stepper specimen</h3>
        <p>Verified accounts retain their existing immediate redirect.</p>
        <VerificationStepper confirmed hasPhoto verified label="Completed verification progress" />
        <Button variant="secondary" onClick={() => setModal('profile-editor')}>Review profile editor</Button>
      </section>
      <section className="preview-section">
        <h2>Profile tabs</h2>
        <Tabs
          label="Profile sections"
          tabs={[
            { value: 'listings', label: 'Listings' },
            { value: 'history', label: 'Condition history' },
          ]}
          value={tab}
          onChange={setTab}
        >
          <p>{tab === 'listings' ? 'No listings to show.' : 'No condition history to show.'}</p>
        </Tabs>
      </section>
      <section className="preview-section">
        <h2>Brand assets</h2>
        <div className="brand-specimens">
          <Logo />
          <Logo variant="mark" size="large" />
          <Logo variant="mono" />
          <Logo variant="stacked" />
          <span className="brand-specimens__reversed"><Logo tone="onMaroon" /></span>
          <span className="brand-specimens__reversed">
            <Logo variant="mark" tone="onMaroon" size="large" />
          </span>
        </div>
        <h2>Navigation variants</h2>
        <p>Presentation specimens only. Authenticated routes and logout require real test accounts.</p>
        <h3>Guest</h3>
        <Navbar role="guest" />
        <h3>Verified student</h3>
        <Navbar role="verified" />
        <h3>Pending verification</h3>
        <Navbar role="unverified" />
        <h3>Admin</h3>
        <Navbar role="admin" activePath="/admin/verification" />
        <h3>Contextual mobile header and tabs</h3>
        <label>
          Navigation specimen
          <select value={navigationPath} onChange={(e) => setNavigationPath(e.target.value)}>
            <option value="/shelf">Browse</option>
            <option value="/items/new">Post an item</option>
            <option value="/activity">My Activity</option>
            <option value="/profile">Profile</option>
            <option value="/items/preview">Item header</option>
            <option value="/requests/preview">Request header</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={floatingNavigation} onChange={(e) => setFloatingNavigation(e.target.checked)} />
          Show floating mobile tab bar specimen
        </label>
        <Navbar role="verified" context={mobileHeader(navigationPath)} />
        {navigationPath !== '/items/preview' && (
          <div className={`tab-bar-preview ${floatingNavigation ? 'tab-bar-preview--floating' : ''}`}>
            <TabBar preview activePath={navigationPath} />
          </div>
        )}
      </section>
      <Modal
        open={Boolean(modal && !['verified', 'profile-editor'].includes(modal))}
        onClose={() => setModal('')}
        title="Dialog review"
        description="Use Tab, Shift+Tab, Escape, the close button, or the backdrop."
        size={['standard', 'long'].includes(modal) ? 'default' : modal}
        footer={
          <>
            <Button
              onClick={() => {
                setModal('');
                notify('Review confirmed.');
              }}
            >
              Confirm
            </Button>
            <Button variant="secondary" onClick={() => setModal('')}>
              Cancel
            </Button>
          </>
        }
      >
        <Field label="Condition notes" placeholder="Enter notes" />
        {modal === 'long' &&
          Array.from({ length: 12 }, (_, index) => (
            <section key={index}>
              <h3>Review section {index + 1}</h3>
              <p>
                Scrollable shell specimen. The title, close button and footer remain available while
                this content scrolls. No student data.
              </p>
            </section>
          ))}
      </Modal>
      <Modal
        open={modal === 'profile-editor'}
        onClose={() => setModal('')}
        title="Edit profile"
        description="Presentation specimen only. Save is disabled; no account is read or changed."
        size="profile"
        className="profile-editor"
        footer={<><Button size="large" disabled>Save changes</Button><Button variant="secondary" size="large" onClick={() => setModal('')}>Cancel</Button></>}
      >
        <form className="form-stack" onSubmit={(e) => e.preventDefault()} noValidate>
          <ProfileEditorFields
            name={editorName}
            course={editorCourse}
            email=""
            file={editorFile}
            hasPhoto={false}
            photo={<Avatar size="lg" name="Your profile photo" />}
            onNameChange={(e) => setEditorName(e.target.value)}
            onCourseChange={(e) => setEditorCourse(e.target.value)}
            onFileChange={(e) => setEditorFile(e.target.files[0] || null)}
          />
        </form>
      </Modal>
      <VerifiedOnlyModal open={modal === 'verified'} onClose={() => setModal('')} />
    </section>
  );
}
