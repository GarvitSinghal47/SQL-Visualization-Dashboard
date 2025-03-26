import React from "react";

function FilterBadges({ columnFilters, onRemove }) {
  return (
    <div className="filter-badges">
      {Object.keys(columnFilters).map((col) =>
        (columnFilters[col] || []).map((val, idx) => (
          <span key={`${col}-${idx}`} className="badge">
            {col}: {val}{" "}
            <span className="badge-remove" onClick={() => onRemove(col, val)}>
              ×
            </span>
          </span>
        ))
      )}
    </div>
  );
}

export default FilterBadges;
