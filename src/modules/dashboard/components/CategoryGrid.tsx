import type { CategoryCardModel, DashboardCategoryId } from '../types';
import { CategoryCard } from './CategoryCard';

interface CategoryGridProps {
  cards: CategoryCardModel[];
  selectedId: DashboardCategoryId | null;
  onSelect: (id: DashboardCategoryId) => void;
}

export function CategoryGrid({ cards, selectedId, onSelect }: CategoryGridProps) {
  return (
    <div className="category-grid">
      {cards.map((card) => (
        <CategoryCard key={card.id} card={card} selected={card.id === selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}
