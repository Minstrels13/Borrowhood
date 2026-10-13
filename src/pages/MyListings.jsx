import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useItems from '../hooks/useItems';
import ItemCard from '../components/items/ItemCard';
import Tabs from '../components/ui/Tabs';
import Button from '../components/ui/Button';
import RequestList from '../components/requests/RequestList';

const tabs = [
  { value: 'borrowing', label: 'Borrowing' },
  { value: 'lending', label: 'Lending' },
  { value: 'listings', label: 'My listings' },
];

export default function MyListings() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = tabs.some((entry) => entry.value === params.get('tab'))
    ? params.get('tab')
    : 'borrowing';
  const { items, total, loading, error, retry, loadMore } = useItems({ ownerId: user.id });
  return (
    <section className="container page-section">
      <h1>My Activity</h1>
      <Tabs tabs={tabs} value={tab} onChange={(value) => setParams({ tab: value })}>
        {tab === 'listings' ? (
          <>
            <div className="section-heading">
              <h2>My listings</h2>
              <Button to="/items/new">Post an item</Button>
            </div>
            {error && (
              <div role="alert">
                <p>{error}</p>
                <Button onClick={retry}>Try again</Button>
              </div>
            )}
            {!loading && !error && !items.length && (
              <p>You have no listings yet. Publish an item to share it with other students.</p>
            )}
            <div className="item-grid">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} editable />
              ))}
            </div>
            {loading && <p role="status">Loading your listings…</p>}
            {items.length < total && (
              <div className="actions">
                <Button variant="secondary" onClick={loadMore} disabled={loading}>
                  Load more items
                </Button>
              </div>
            )}
          </>
        ) : (
          <RequestList key={tab} userId={user.id} role={tab} />
        )}
      </Tabs>
    </section>
  );
}
