import { statusLabel } from '../snapshot';
import type { CategoryCardModel } from '../types';

interface CategoryCardProps {
  card: CategoryCardModel;
  selected: boolean;
  onSelect: (id: CategoryCardModel['id']) => void;
}

export function CategoryCard({ card, selected, onSelect }: CategoryCardProps) {
  return (
    <button
      type="button"
      className={`category-card category-card--${card.status}${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(card.id)}
    >
      <span className="category-card__top">
        <span className="category-card__title">{card.label}</span>
        <span className="category-card__status">{statusLabel(card.status)}</span>
      </span>
      <span className="category-card__description">{card.description}</span>
      <span className="category-card__stats">
        <span>{card.checked} checked</span>
        <span>{card.issues} issues</span>
        <span>{card.warnings} warnings</span>
      </span>
    </button>
  );
}
