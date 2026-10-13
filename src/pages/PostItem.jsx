import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { categories } from '../config/items';
import useItem from '../hooks/useItem';
import { removeItemPhotos, saveItem, uploadItemPhoto } from '../lib/items';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import ItemCard from '../components/items/ItemCard';
import ItemPhoto from '../components/items/ItemPhoto';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/modals/Modal';

const initialValues = {
  title: '',
  category: '',
  description: '',
  condition_note: '',
  listing_type: 'free',
  price_label: '',
  max_borrow_days: 7,
  meetup_note: '',
};

export default function PostItem() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const { item, loading, error: loadError, retry } = useItem(id);
  const [values, setValues] = useState(initialValues);
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const urls = useRef(new Set());
  const navigate = useNavigate();
  const notify = useToast();
  useEffect(() => {
    if (item) {
      setValues(
        Object.fromEntries(Object.keys(initialValues).map((key) => [key, item[key] ?? ''])),
      );
      setPhotos(item.item_photos.map((photo) => ({ path: photo.storage_path, key: photo.id })));
    } else if (!id) {
      setValues(initialValues);
      setPhotos([]);
    }
  }, [item, id]);
  useEffect(
    () => () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );
  function update(event) {
    setValues((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  }
  function addPhotos(event) {
    const files = Array.from(event.target.files);
    event.target.value = '';
    setError('');
    if (photos.length + files.length > 3) {
      setError('Choose up to three photos in total.');
      return;
    }
    if (
      files.some(
        (file) =>
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
          file.size > 10 * 1024 * 1024,
      )
    ) {
      setError('Choose JPEG, PNG or WebP photos, each smaller than 10 MB.');
      return;
    }
    const selected = files.map((file) => {
      const src = URL.createObjectURL(file);
      urls.current.add(src);
      return { file, src, key: crypto.randomUUID() };
    });
    setPhotos((previous) => [...previous, ...selected]);
  }
  function removePhoto(photo) {
    if (photo.src) {
      URL.revokeObjectURL(photo.src);
      urls.current.delete(photo.src);
    }
    setPhotos((previous) => previous.filter((entry) => entry.key !== photo.key));
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (values.title.trim().length < 2 || values.condition_note.trim().length < 2) {
      setError('Enter a title and condition note with at least two characters.');
      return;
    }
    if (values.listing_type === 'rent' && !values.price_label.trim()) {
      setError('Describe your rental price. Payment is settled in person.');
      return;
    }
    setBusy(true);
    setError('');
    const uploaded = [];
    let saved = false;
    try {
      const paths = [];
      for (const photo of photos) {
        const path = photo.path || (await uploadItemPhoto(user.id, photo.file));
        if (!photo.path) uploaded.push(path);
        paths.push(path);
      }
      await saveItem(id, values, paths);
      saved = true;
      const obsolete = (item?.item_photos || [])
        .map((photo) => photo.storage_path)
        .filter((path) => !paths.includes(path));
      try {
        await removeItemPhotos(obsolete);
      } catch {
        notify('Listing saved. Some unused photos could not be cleaned up.');
      }
      notify(id ? 'Listing updated.' : 'Listing published.');
      navigate('/activity?tab=listings');
    } catch (failure) {
      if (!saved) {
        try {
          await removeItemPhotos(uploaded);
        } catch {
          notify('Some unused uploads could not be cleaned up.');
        }
      }
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <p className="container page-section" role="status">
        Loading listing…
      </p>
    );
  if (loadError)
    return (
      <section className="container page-section">
        <h1>Unable to load listing</h1>
        <p role="alert">{loadError}</p>
        <Button onClick={retry}>Try again</Button>
      </section>
    );
  if (id && (!item || item.owner_id !== user.id))
    return (
      <section className="container page-section">
        <h1>Listing unavailable</h1>
        <p>You can edit only your own listings.</p>
        <Button to="/shelf">Back to shelf</Button>
      </section>
    );
  const preview = {
    ...values,
    is_active: true,
    previewPhoto: photos[0]?.src,
    item_photos: photos[0]?.path ? [{ storage_path: photos[0].path }] : [],
    owner: profile ? { ...profile, trust_level: 'new' } : null,
  };
  return (
    <section className="container page-section">
      <h1>{id ? 'Edit listing' : 'Post an item'}</h1>
      <p>Share something other BulSU students can borrow.</p>
      <div className="post-layout">
        <form onSubmit={submit}>
          <fieldset className="form-stack post-fields" disabled={busy}>
            <legend className="sr-only">Listing details</legend>
            <Field
              label="Title"
              name="title"
              value={values.title}
              onChange={update}
              required
              minLength={2}
              maxLength={120}
            />
            <div className="form-columns">
              <Field label="Category" id="item-category">
                <select
                  id="item-category"
                  name="category"
                  value={values.category}
                  onChange={update}
                  required
                >
                  <option value="">Choose a category</option>
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="Maximum borrow length (days)"
                name="max_borrow_days"
                type="number"
                min={1}
                step={1}
                max={2147483647}
                required
                value={values.max_borrow_days}
                onChange={update}
              />
            </div>
            <Field label="Description" id="item-description">
              <textarea
                id="item-description"
                name="description"
                value={values.description}
                onChange={update}
                maxLength={3000}
                rows={4}
              />
            </Field>
            <Field
              label="Condition note"
              name="condition_note"
              value={values.condition_note}
              onChange={update}
              required
              minLength={2}
              maxLength={1000}
            />
            <fieldset className="listing-type">
              <legend>Listing type</legend>
              {[
                ['free', 'Free'],
                ['rent', 'For rent'],
              ].map(([value, label]) => (
                <label key={value} className="check-option">
                  <input
                    type="radio"
                    name="listing_type"
                    value={value}
                    checked={values.listing_type === value}
                    onChange={update}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            {values.listing_type === 'rent' && (
              <Field
                label="Price label"
                name="price_label"
                value={values.price_label}
                onChange={update}
                required
                maxLength={120}
                hint="Just describe it. Payment is settled in person."
              />
            )}
            <Field
              label="Photos (up to 3)"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={addPhotos}
              disabled={busy || photos.length >= 3}
              hint="We resize photos for you. Show the item clearly in good light."
            />
            <div className="upload-previews">
              {photos.map((photo, index) => (
                <div key={photo.key}>
                  <ItemPhoto path={photo.path} src={photo.src} alt={`Listing photo ${index + 1}`} />
                  <Button variant="ghost" onClick={() => removePhoto(photo)}>
                    Remove photo {index + 1}
                  </Button>
                </div>
              ))}
            </div>
            <Field
              label="Meetup note"
              name="meetup_note"
              value={values.meetup_note}
              onChange={update}
              maxLength={500}
            />
            <Button
              className="mobile-preview"
              variant="secondary"
              onClick={() => setPreviewOpen(true)}
            >
              Preview your listing
            </Button>
            {error && (
              <p role="alert" className="field__error">
                {error}
              </p>
            )}
            <div className="actions">
              <Button type="submit">
                {busy ? 'Saving…' : id ? 'Save changes' : 'Publish listing'}
              </Button>
              <Button variant="secondary" onClick={() => navigate(id ? `/items/${id}` : '/shelf')}>
                Cancel
              </Button>
            </div>
          </fieldset>
        </form>
        <aside className="listing-preview">
          <h2>Preview</h2>
          <p>This is how your listing looks on the shelf.</p>
          <ItemCard item={preview} preview />
          <h3>Tips for a good listing</h3>
          <p>
            Add a clear photo. State the condition honestly. Suggest a public meetup spot on campus.
          </p>
        </aside>
      </div>
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Preview your listing">
        {previewOpen && <ItemCard item={preview} preview />}
        <div className="actions">
          <Button variant="secondary" onClick={() => setPreviewOpen(false)}>
            Close preview
          </Button>
        </div>
      </Modal>
    </section>
  );
}
