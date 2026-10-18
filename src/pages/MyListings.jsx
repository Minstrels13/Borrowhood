import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useItems from '../hooks/useItems';
import ListingRow from '../components/items/ListingRow';
import Skeleton from '../components/ui/Skeleton';
import { brand } from '../config/brand';
import Tabs from '../components/ui/Tabs';
import Button from '../components/ui/Button';
import RequestList from '../components/requests/RequestList';
import { useState } from 'react';
import DeleteItemModal from '../components/modals/DeleteItemModal';

const tabs = [
  { value: 'requests', label: 'Requests' },
  { value: 'borrowing', label: 'Borrowing' },
  { value: 'lending', label: 'Lending' },
  { value: 'listings', label: 'My listings' },
];

export default function MyListings() {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(null);
  const [params, setParams] = useSearchParams();
  const tab = tabs.some((entry) => entry.value === params.get('tab'))
    ? params.get('tab')
    : 'requests';
  const { items, total, loading, error, retry, loadMore } = useItems({ ownerId: user.id });
  return (
    <>
    <section className="container page-section activity-page">
      <h1>My Activity</h1>
      <Tabs tabs={tabs} value={tab} onChange={(value) => setParams({ tab: value })}>
        {tab === 'listings' ? (
          <>
            <h2 className="sr-only">My listings</h2>
            {error && (
              <div role="alert">
                <p>{error}</p>
                <Button onClick={retry}>Try again</Button>
              </div>
            )}
            {!loading && !error && !items.length && (
              <p>You have no listings yet. Publish an item to share it with other students.</p>
            )}
            <div className="listing-rows">
              {items.map((item) => (
                <ListingRow key={item.id} item={item} editable onDelete={setDeleting} />
              ))}
            </div>
            {loading && <><p role="status">Loading your listings…</p><Skeleton variant="text" lines={3} /></>}
            {!loading && <Button variant="secondary" to="/items/new">Post another item</Button>}
            {items.length < total && (
              <div className="actions">
                <Button variant="secondary" onClick={loadMore} disabled={loading}>
                  Load more items
                </Button>
              </div>
            )}
          </>
        ) : (
          <RequestList key={`${user.id}:${tab}`} userId={user.id} role={tab} />
        )}
      </Tabs>
      {deleting && (
        <DeleteItemModal item={deleting} onClose={() => setDeleting(null)} onDeleted={retry} />
      )}
    </section>
    <footer className="account-page-footer">{brand.name} | {brand.project}</footer>
    </>
  );
}
