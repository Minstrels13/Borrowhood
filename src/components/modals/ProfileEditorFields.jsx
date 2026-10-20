import { useId } from 'react';
import Field from '../ui/Field';

// A pure form view: the owning dialog keeps validation, uploads and save actions.
export default function ProfileEditorFields({
  name, course, email, file, hasPhoto, photo, busy, error,
  onNameChange, onCourseChange, onFileChange, identityLocked = false, needsReview = false,
}) {
  const photoId = useId();
  const photoHintId = useId();
  return (
    <fieldset className="form-stack post-fields" disabled={busy}>
      <legend className="sr-only">Profile details</legend>
      <div className="profile-editor__upload">
        {photo}
        <div className="profile-editor__file">
          <input
            id={photoId}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileChange}
            required={!hasPhoto}
            disabled={identityLocked}
            aria-describedby={photoHintId}
          />
          <label htmlFor={photoId} className="button button--secondary" aria-disabled={identityLocked || undefined}>
            {hasPhoto ? 'Change photo' : 'Add photo'}
          </label>
          {file && <span className="small">{file.name}</span>}
        </div>
      </div>
      <p id={photoHintId} className="field__hint profile-editor__hint">
        Required. You can replace your photo but not remove it. JPEG, PNG or WebP, up to 10 MB.
        {needsReview && ' A replacement photo needs admin approval.'}
      </p>
      <Field
        label="Full name"
        value={name}
        onChange={onNameChange}
        minLength={2}
        maxLength={100}
        required
        readOnly={identityLocked}
        hint={needsReview ? 'Name changes need admin approval. Your approved name stays visible until then.' : undefined}
      />
      <Field
        label="Course, year and section"
        value={course}
        onChange={onCourseChange}
        minLength={2}
        maxLength={100}
        required
      />
      <Field
        label="BulSU email"
        value={email}
        readOnly
        hint="Your student email cannot be changed."
      />
      {error && (
        <p role="alert" className="field__error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
