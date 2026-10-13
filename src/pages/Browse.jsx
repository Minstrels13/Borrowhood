import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { emptyFilters } from '../config/items';
import useItems from '../hooks/useItems';
import ItemCard from '../components/items/ItemCard';
import FilterSidebar from '../components/items/FilterSidebar';
import Button from '../components/ui/Button';
import Modal from '../components/modals/Modal';
import VerifiedOnlyModal from '../components/modals/VerifiedOnlyModal';
import EditProfileModal from '../components/modals/EditProfileModal';

export default function Browse() {
  const { user, isVerified, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [filters, setFilters] = useState(emptyFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [wall, setWall] = useState(false);
  const [editing, setEditing] = useState(false);
  const { items, total, loading, error, retry, loadMore } = useItems({
    search: query,
    filters,
    sort,
  });
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  return (
    <section className="container page-section">
      <div className="section-heading">
        <div>
          <h1>The Shelf</h1>
          <p>
            {error
              ? 'Browse items from BulSU students'
              : loading
                ? 'Loading items…'
                : `${total} item${total === 1 ? '' : 's'} from BulSU students`}
          </p>
        </div>
        {isVerified ? (
          <Button to="/items/new">Post an item</Button>
        ) : (
          <Button onClick={() => setWall(true)}>Post an item</Button>
        )}
      </div>
      {user && !isVerified && !isAdmin && (
        <p>
          <Button variant="ghost" to="/pending">
            Check verification status
          </Button>
        </p>
      )}
      {isVerified && (
        <Button variant="ghost" onClick={() => setEditing(true)}>
          Edit profile
        </Button>
      )}
      <div className="shelf-toolbar">
        <label className="search-field">
          <span className="sr-only">Search items</span>
          <input
            type="search"
            placeholder="Search items"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            maxLength={120}
          />
        </label>
        <Button className="mobile-filters" variant="secondary" onClick={() => setFilterOpen(true)}>
          Filters
        </Button>
        <label className="sort-field">
          <span className="sr-only">Sort items</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="newest">Sort: Newest</option>
            <option value="title">Sort: Title A–Z</option>
          </select>
        </label>
      </div>
      <div className="shelf-layout">
        <aside className="filter-sidebar" aria-label="Listing filters">
          <h2>Filters</h2>
          <FilterSidebar filters={filters} onChange={setFilters} />
        </aside>
        <div>
          {error && (
            <div role="alert" className="notice-card">
              <p>{error}</p>
              <Button variant="secondary" onClick={retry}>
                Try again
              </Button>
            </div>
          )}
          {!loading && !error && !items.length && (
            <div className="notice-card">
              <h2>No items found</h2>
              <p>
                Try another search or clear the filters. Listings appear when verified students
                publish them.
              </p>
            </div>
          )}
          <div className="item-grid">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
          {loading && <p role="status">Loading items…</p>}
          {items.length < total && (
            <div className="actions">
              <Button variant="secondary" onClick={loadMore} disabled={loading}>
                Load more items
              </Button>
            </div>
          )}
        </div>
      </div>
      <Modal open={filterOpen} onClose={() => setFilterOpen(false)} title="Filters">
        <FilterSidebar filters={filters} onChange={setFilters} />
        <div className="actions">
          <Button onClick={() => setFilterOpen(false)}>Show items</Button>
        </div>
      </Modal>
      <VerifiedOnlyModal open={wall} onClose={() => setWall(false)} />
      <EditProfileModal open={editing} onClose={() => setEditing(false)} />
    </section>
  );
}
