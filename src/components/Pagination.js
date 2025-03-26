import React from 'react';

function Pagination({ currentPage, totalPages, onPrevious, onNext, pageSize, onPageSizeChange }) {
  return (
    <div className="pagination">
      <button onClick={onPrevious} disabled={currentPage === 1}>Previous</button>
      <span>
        Page {currentPage} of {totalPages}
      </span>
      <button onClick={onNext} disabled={currentPage === totalPages}>Next</button>
      <span className="page-size">
        Rows per page:{" "}
        <select value={pageSize} onChange={onPageSizeChange}>
          {[5, 10, 20, 50].map(size => <option key={size} value={size}>{size}</option>)}
        </select>
      </span>
    </div>
  );
}

export default Pagination;
