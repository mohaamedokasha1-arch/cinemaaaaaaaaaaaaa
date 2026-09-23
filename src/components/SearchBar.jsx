import React from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'ابحث عن فيلم، مسلسل أو تصنيف...' }) {
  return (
    <div className="search-field">
      <Search className="search-field__icon" size={19} strokeWidth={1.9} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label="البحث في الأعمال"
      />
      {value && <button type="button" onClick={() => onChange('')} aria-label="مسح البحث" className="search-field__clear"><X size={16} /></button>}
    </div>
  );
}
