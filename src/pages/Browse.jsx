import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { emptyFilters } from '../config/items';
import useItems from '../hooks/useItems';
import ItemCard from '../components/items/ItemCard';
import FilterSidebar from '../components/items/FilterSidebar';
import Button from '../components/ui/Button';
import Modal from '../components/modals/Modal';
import Chip from '../components/ui/Chip';
import Skeleton from '../components/ui/Skeleton';
import Icon from '../components/ui/Icon';

export default function Browse() {
  const { user, isVerified, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [filters, setFilters] = useState(emptyFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const { items, total, loading, error, retry, loadMore } = useItems({
    search: query,
    filters,
    sort,
  });
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const hasFilters = Boolean(filters.categories.length || filters.types.length || filters.available);
  const narrowed = Boolean(search.trim() || hasFilters);
  const count = loading ? 'Loading items…' : error ? 'Browse items from BulSU students' : `${total} item${total === 1 ? '' : 's'}`;
  function clearAll() {
    setSearch('');
    setFilters(emptyFilters);
  }
  return (
    <>
    <section className="container page-section shelf-page">
      {!user && (
        <div className="shelf-guest-notice">
          <p>Log in with your BulSU email to borrow, post, or comment.</p>
          <div className="actions">
            <Button variant="secondary" to="/login">Log in</Button>
            <Button className="shelf-guest-signup" variant="secondary" to="/signup">Sign up</Button>
          </div>
        </div>
      )}
      {user && !isVerified && !isAdmin && (
        <div className="shelf-guest-notice">
          <p>Complete verification to borrow, post, or comment.</p>
          <Button variant="secondary" to="/pending">Check verification status</Button>
        </div>
      )}
      <div className="shelf-heading">
        <h1>The Shelf</h1>
        <p className="shelf-count-desktop">{count}{!loading && !error && ' from BulSU students'}</p>
        {isVerified && !isAdmin && <Button className="shelf-post" to="/items/new">Post an item</Button>}
      </div>
      <div className="shelf-toolbar">
        <label className="search-field">
          <span className="sr-only">Search items</span>
          <Icon name="search" />
          <input type="search" placeholder="Search items" value={search}
            onChange={(event) => setSearch(event.target.value)} maxLength={120} />
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
      <div className="shelf-results-meta">
        {hasFilters && <div className="shelf-applied" aria-label="Applied filters">
          {filters.categories.map((label) => <Chip key={label} label={label} tone="info"
            onRemove={() => setFilters({ ...filters, categories: filters.categories.filter((value) => value !== label) })} />)}
          {filters.types.map((value) => <Chip key={value} label={value === 'rent' ? 'For rent' : 'Free'} tone="info"
            onRemove={() => setFilters({ ...filters, types: filters.types.filter((type) => type !== value) })} />)}
          {filters.available && <Chip label="Available now" tone="info" onRemove={() => setFilters({ ...filters, available: false })} />}
        </div>}
        <p className="shelf-count-mobile">{count}</p>
      </div>
      <div className="shelf-layout">
        <aside className="filter-sidebar" aria-label="Listing filters">
          <h2>Filters</h2>
          <FilterSidebar filters={filters} onChange={setFilters} />
        </aside>
        <div className="shelf-results" aria-busy={loading}>
          {error && <div role="alert" className="notice-card shelf-state">
            <h2>Unable to load items</h2><p>{error}</p>
            <Button variant="secondary" onClick={retry}>Try again</Button>
          </div>}
          {!loading && !error && !items.length && <div className="notice-card shelf-state">
            <h2>{narrowed ? 'No items found' : 'The shelf is empty'}</h2>
            <p>{narrowed ? 'Try another search or clear the filters.' : 'Listings appear when verified students publish them.'}</p>
            {narrowed && <Button variant="secondary" onClick={clearAll}>Clear search and filters</Button>}
          </div>}
          <div className="item-grid">
            {items.map((item) => <ItemCard key={item.id} item={item} />)}
            {loading && !items.length && Array.from({ length: 6 }, (_, index) => <Skeleton key={index} variant="card" lines={3} />)}
          </div>
          <p className="sr-only" role="status">{loading ? 'Loading items…' : error ? '' : `${total} item${total === 1 ? '' : 's'} found`}</p>
          {items.length < total && <div className="shelf-load-more">
            <Button variant="secondary" onClick={loadMore} busy={loading} busyLabel="Loading items…">Load more items</Button>
          </div>}
        </div>
      </div>
      <Modal open={filterOpen} onClose={() => setFilterOpen(false)} title="Filters" className="filters-sheet"
        footer={<><Button variant="ghost" onClick={() => setFilters(emptyFilters)}>Clear filters</Button>
          <Button size="large" onClick={() => setFilterOpen(false)}>Show items</Button></>}>
        <FilterSidebar filters={filters} onChange={setFilters} showClear={false} />
      </Modal>
    </section>
    </>
  );
}
