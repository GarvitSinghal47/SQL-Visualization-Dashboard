import React from 'react';
import MultiSelectDropdown from './MultiSelectDropdown';

function TableHeader({ col, active, onHeaderClick, arrow, dropdownItems, selectedItems, onToggle, onClose }) {
  return (
    <th onClick={() => onHeaderClick(col)}>
      {col} <span className="header-arrow">{arrow}</span>
      {active && (
        <MultiSelectDropdown
          items={dropdownItems}
          selectedItems={selectedItems}
          onToggle={onToggle}
          onClose={onClose}
        />
      )}
    </th>
  );
}

export default TableHeader;
