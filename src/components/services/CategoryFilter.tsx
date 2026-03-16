import React from 'react';
import { Badge } from '@/components/ui/badge';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const categories = [
  { id: 'all', label: 'All Services', icon: '🌟' },
  { id: 'pet_care', label: 'Pet Care', icon: '🐕' },
  { id: 'lawn_care', label: 'Lawn Care', icon: '🌱' },
  { id: 'tutoring', label: 'Tutoring', icon: '📚' },
  { id: 'cleaning', label: 'Cleaning', icon: '🧹' },
  { id: 'tech_support', label: 'Tech Support', icon: '💻' },
  { id: 'sports_coaching', label: 'Sports Coaching', icon: '🏆' },
  { id: 'art_commissions', label: 'Art Commissions', icon: '🎨' },
  { id: 'beauty', label: 'Beauty', icon: '💄' },
  { id: 'photography', label: 'Photography', icon: '📷' },
  { id: 'graphic_design', label: 'Graphic Design', icon: '🖼️' },
];

export default function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap gap-3">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedCategory === category.id
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-sky-300 hover:bg-sky-50'
            }`}
          >
            <span className="text-base">{category.icon}</span>
            <span>{category.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
