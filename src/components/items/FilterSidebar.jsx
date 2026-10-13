import { categories, emptyFilters } from '../../config/items';
import Button from '../ui/Button';

export default function FilterSidebar({ filters, onChange }) {
  function toggle(group, value) {
    onChange({
      ...filters,
      [group]: filters[group].includes(value)
        ? filters[group].filter((entry) => entry !== value)
        : [...filters[group], value],
    });
  }
  return (
    <div className="filter-fields">
      <fieldset>
        <legend>Category</legend>
        {categories.map((category) => (
          <label key={category} className="check-option">
            <input
              type="checkbox"
              checked={filters.categories.includes(category)}
              onChange={() => toggle('categories', category)}
            />
            {category}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Type</legend>
        {[
          ['free', 'Free'],
          ['rent', 'For rent'],
        ].map(([value, label]) => (
          <label key={value} className="check-option">
            <input
              type="checkbox"
              checked={filters.types.includes(value)}
              onChange={() => toggle('types', value)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Availability</legend>
        <label className="check-option">
          <input
            type="checkbox"
            checked={filters.available}
            onChange={(event) => onChange({ ...filters, available: event.target.checked })}
          />
          Available now
        </label>
      </fieldset>
      <Button variant="ghost" onClick={() => onChange(emptyFilters)}>
        Clear filters
      </Button>
    </div>
  );
}
