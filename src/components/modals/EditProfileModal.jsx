import { useEffect, useId, useState } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';
import ProfileEditorFields from './ProfileEditorFields';
import ProfilePhoto from '../ui/ProfilePhoto';
import Avatar from '../ui/Avatar';
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
  const [previewUrl, setPreviewUrl] = useState(null);
  const formId = useId();
  useEffect(() => {
    if (!open || !file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [open, file]);
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
      size="profile"
      className="profile-editor"
      footer={
        <>
          <Button type="submit" form={formId} size="large" disabled={busy} busy={busy}>
            {busy ? 'Saving…' : resubmit ? 'Submit for review' : 'Save changes'}
          </Button>
          <Button variant="secondary" size="large" onClick={() => draft.close(onClose)} disabled={busy}>
            Cancel
          </Button>
        </>
      }
    >
      <form id={formId} className="form-stack" onSubmit={submit}>
        <ProfileEditorFields
          name={name}
          course={course}
          email={user?.email || ''}
          file={file}
          hasPhoto={Boolean(profile?.photo_path)}
          busy={busy}
          error={error}
          onNameChange={(e) => setName(e.target.value)}
          onCourseChange={(e) => setCourse(e.target.value)}
          onFileChange={(e) => setFile(e.target.files[0] || null)}
          photo={previewUrl ? (
            <Avatar src={previewUrl} name="Selected profile photo" size="lg" />
          ) : open && profile?.photo_path ? (
            <ProfilePhoto path={profile.photo_path} name={profile.full_name} size="lg" />
          ) : (
            <Avatar size="lg" name="Your profile photo" />
          )}
        />
      </form>
    </Modal>
  );
}
