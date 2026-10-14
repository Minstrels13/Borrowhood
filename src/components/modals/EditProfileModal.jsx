import { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';
import Field from '../ui/Field';
import ProfilePhoto from '../ui/ProfilePhoto';
import { useAuth } from '../../context/AuthContext';
import { compressImage } from '../../lib/compressImage';
import {
  removeUnusedPhoto,
  saveProfile,
  submitProfile,
  uploadProfilePhoto,
} from '../../lib/profiles';
import { useToast } from '../ui/Toast';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';

export default function EditProfileModal({ open, onClose, resubmit = false }) {
  const { user, profile, refresh } = useAuth();
  const notify = useToast();
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const draft = useUnsavedChanges(
    open &&
      (name !== (profile?.full_name || '') ||
        course !== (profile?.course_year_section || '') ||
        Boolean(file)),
    busy,
  );
  useEffect(() => {
    if (open) {
      setName(profile?.full_name || '');
      setCourse(profile?.course_year_section || '');
      setFile(null);
      setError('');
    }
  }, [open, profile]);
  async function submit(event) {
    event.preventDefault();
    setError('');
    if (name.trim().length < 2 || course.trim().length < 2) {
      setError('Enter your full name and course, year and section.');
      return;
    }
    setBusy(true);
    let uploaded;
    let saved = false;
    try {
      uploaded = file ? await uploadProfilePhoto(user.id, await compressImage(file)) : null;
      await saveProfile(name, course, uploaded || profile.photo_path);
      saved = true;
      if (resubmit) await submitProfile();
      if (uploaded) await removeUnusedPhoto(profile.photo_path);
      draft.saved();
      await refresh();
      notify(resubmit ? 'Details submitted for admin review.' : 'Profile updated.');
      onClose();
    } catch (err) {
      if (uploaded && !saved) await removeUnusedPhoto(uploaded);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={() => {
        draft.close(onClose);
      }}
      title={resubmit ? 'Update details and resubmit' : 'Edit profile'}
    >
      {open && profile?.photo_path && (
        <ProfilePhoto path={profile.photo_path} name={profile.full_name} size="lg" />
      )}
      <form className="form-stack" onSubmit={submit}>
        <fieldset className="form-stack post-fields" disabled={busy}>
          <legend className="sr-only">Profile details</legend>
          <Field
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={100}
            required
          />
          <Field
            label="Course, year and section"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            minLength={2}
            maxLength={100}
            required
          />
          <Field
            label="BulSU email"
            value={user?.email || ''}
            readOnly
            hint="Your student email cannot be changed."
          />
          <Field
            label={profile?.photo_path ? 'Change profile photo' : 'Profile photo'}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files[0] || null)}
            required={!profile?.photo_path}
            hint="A clear photo of you. JPEG, PNG or WebP, up to 10 MB."
          />
          {error && (
            <p role="alert" className="field__error">
              {error}
            </p>
          )}
          <div className="actions">
            <Button variant="secondary" onClick={() => draft.close(onClose)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : resubmit ? 'Submit for review' : 'Save changes'}
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
