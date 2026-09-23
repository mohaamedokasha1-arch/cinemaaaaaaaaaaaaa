import React from 'react';

export default function CategoryFilter({ categories, selectedCategory, onSelectCategory }) {
  return (
    <div className="category-scroll" aria-label="التصفية حسب التصنيف">
      <div className="category-list">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={selectedCategory === category}
            className={`category-pill ${selectedCategory === category ? 'category-pill--active' : ''}`}
            onClick={() => onSelectCategory(category)}
          >{category}</button>
        ))}
      </div>
    </div>
  );
}
