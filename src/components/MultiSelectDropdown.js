import React, { useEffect, useRef } from 'react';
import './MultiSelectDropdown.css';

function MultiSelectDropdown({ items, selectedItems, onToggle, onClose }) {
  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  return (
    <div className="dropdown" ref={dropdownRef}>
      {items.map((item, idx) => {
        const isSelected = selectedItems.includes(item);
        return (
          <div
            key={idx}
            className="dropdown-item"
            onClick={(e) => {
              e.stopPropagation(); // Keep dropdown open for multiple selections
              onToggle(item);
            }}
          >
            <input type="checkbox" readOnly checked={isSelected} style={{ marginRight: '8px' }} />
            {item}
          </div>
        );
      })}
      <div className="dropdown-close" onClick={onClose}>
        Close
      </div>
    </div>
  );
}

export default MultiSelectDropdown;
