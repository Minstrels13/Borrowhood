import { useEffect, useId, useMemo, useState } from 'react';
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
  getLatestProfileChange,
  submitProfileChange,
} from '../../lib/profiles';
import { useToast } from '../ui/Toast';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import { profileChangeDetails } from '../../lib/profileChanges';

export default function EditProfileModal({ open, onClose, resubmit = false, approvedProfile }) {
  const { user, profile: accountProfile, refresh } = useAuth();
  const profile = useMemo(() => approvedProfile ? { ...accountProfile, ...approvedProfile } : accountProfile, [accountProfile, approvedProfile]);
  const notify = useToast();
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [review, setReview] = useState({ loading: true, change: null, error: '' });
  const [reviewRevision, setReviewRevision] = useState(0);
  const needsReview = profile?.verification_status === 'approved';
  const identityLocked = needsReview && (review.loading || Boolean(review.error) || review.change?.status === 'pending');
  const identityChanged = needsReview && (name.trim() !== profile.full_name || Boolean(file));
  const courseChanged = course.trim() !== (profile?.course_year_section || '');
  const formId = useId();
  useEffect(() => {
    if (!open || !needsReview) return;
    let active = true;
    setReview({ loading: true, change: null, error: '' });
    getLatestProfileChange(user.id)
      .then((change) => { if (active) setReview({ loading: false, change, error: '' }); })
      .catch((failure) => { if (active) setReview({ loading: false, change: null, error: failure.message }); });
    return () => { active = false; };
  }, [open, needsReview, user?.id, reviewRevision]);
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
    if (busy || (identityChanged && identityLocked) || (needsReview && !identityChanged && !courseChanged)) return;
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
      if (identityChanged) {
        await submitProfileChange(name, course, uploaded || profile.photo_path, profile);
      } else {
        await saveProfile(name, course, uploaded || profile.photo_path);
      }
      saved = true;
      if (resubmit) await submitProfile();
      // A proposal must not delete the photo that is still approved and visible.
      if (uploaded && !needsReview) await removeUnusedPhoto(profile.photo_path);
      draft.saved();
      await refresh();
      notify(identityChanged ? 'Name or photo changes submitted for review. Course details saved.' : resubmit ? 'Details submitted for admin review.' : 'Profile updated.');
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
          <Button type="submit" form={formId} size="large" disabled={busy || (needsReview && (!identityChanged || identityLocked))} busy={busy}>
            {busy ? 'Saving…' : needsReview ? 'Request change' : resubmit ? 'Submit for review' : 'Save changes'}
          </Button>
          {needsReview && <Button type="submit" form={formId} variant="secondary" size="large" disabled={busy || !courseChanged || identityChanged}>Save course</Button>}
          <Button variant="secondary" size="large" onClick={() => draft.close(onClose)} disabled={busy}>
            Cancel
          </Button>
        </>
      }
    >
      <form id={formId} className="form-stack" onSubmit={submit}>
        {needsReview && <p className="small">Only changed name/photo fields are reviewed. Your approved details and borrowing access stay active. Course, year and section save immediately; use Save course for course-only edits.</p>}
        {needsReview && review.loading && <p role="status">Checking profile change status…</p>}
        {needsReview && review.change?.status === 'pending' && <p role="status">Pending review: {profileChangeDetails(review.change).pending}. You can still edit your course, year and section.</p>}
        {needsReview && review.change?.status === 'rejected' && <p className="profile-change-rejection"><strong>Previous request rejected:</strong> {review.change.rejection_reason}</p>}
        {needsReview && review.error && <div role="alert"><p>{review.error}</p><Button variant="secondary" onClick={() => setReviewRevision((value) => value + 1)}>Retry review status</Button></div>}
        <ProfileEditorFields
          name={name}
          course={course}
          email={user?.email || ''}
          file={file}
          hasPhoto={Boolean(profile?.photo_path)}
          busy={busy}
          error={error}
          needsReview={needsReview}
          identityLocked={identityLocked}
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
