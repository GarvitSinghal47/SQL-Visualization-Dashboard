import React, { useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import TableHeader from "./components/TableHeader";
import Pagination from "./components/Pagination";
import FilterBadges from "./components/FilterBadges";
import { useCSVData } from "./hooks/useCSVData";
import { applyColumnFilters, generateQuery } from "./utils/filterUtils";
import "./App.css";

function App() {
  const [selectedTable, setSelectedTable] = useState("categories");
  const { csvData, loadingCSV, uniqueValues } = useCSVData(selectedTable);

  const [mode, setMode] = useState("filter"); // Only filter mode is implemented here.
  const [columnFilters, setColumnFilters] = useState({});
  const [activeFilterColumn, setActiveFilterColumn] = useState("");
  const [error, setError] = useState("");
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [resultData, setResultData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Update resultData when CSV data changes.
  React.useEffect(() => {
    setResultData(csvData);
  }, [csvData]);

  const filteredData = useMemo(() => {
    return mode === "filter"
      ? applyColumnFilters(csvData, columnFilters)
      : csvData;
  }, [csvData, columnFilters, mode]);

  const queryText = useMemo(() => {
    return generateQuery(selectedTable, uniqueValues, columnFilters);
  }, [selectedTable, uniqueValues, columnFilters]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleHeaderClick = (col) => {
    setActiveFilterColumn((prev) => (prev === col ? "" : col));
  };

  const handleDropdownToggle = (col, value) => {
    setColumnFilters((prev) => {
      const current = prev[col] || [];
      let updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [col]: updated };
    });
  };

  const removeFilterBadge = (col, value) => {
    setColumnFilters((prev) => {
      const current = prev[col] || [];
      return { ...prev, [col]: current.filter((v) => v !== value) };
    });
  };

  const runQuery = () => {
    setError("");
    setLoadingQuery(true);
    setTimeout(() => {
      setResultData(filteredData);
      setCurrentPage(1);
      setLoadingQuery(false);
    }, 1000);
  };

  const resetFilters = () => {
    setColumnFilters({});
    setResultData(csvData);
    setError("");
    setCurrentPage(1);
  };

  const downloadPDF = () => {
    const doc = new jsPDF("p", "pt");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(`Results for table: ${selectedTable}`, 40, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    if (resultData && resultData.length > 0) {
      const headers = Object.keys(resultData[0]);
      const data = resultData.map((row) =>
        headers.map((header) => (row[header] ? row[header].toString() : ""))
      );
      autoTable(doc, {
        head: [headers],
        body: data,
        startY: 60,
        theme: "striped",
        headStyles: { fillColor: [22, 160, 133] },
        styles: { font: "helvetica", fontSize: 10 },
      });
    } else {
      doc.text("No data available.", 40, 60);
    }
    doc.save(`${selectedTable}_results.pdf`);
  };

  const goToPreviousPage = () =>
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <div className="App">
      <h1>Northwind CSV Dashboard</h1>
      <p className="instruction">
        Tip: Click on any table header (with the arrow) to open the filter
        dropdown.
      </p>
      <div className="top-dashboard">
        <div className="table-selection">
          <label>
            Select Table:{" "}
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
            >
              {[
                "categories",
                "customers",
                "employees",
                "orders",
                "products",
              ].map((table) => (
                <option key={table} value={table}>
                  {table}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <hr />
      <div className="query-area">
        <div className="generated-query">
          <h3>Generated Query</h3>
          <input type="text" readOnly value={queryText} />
        </div>
        <button onClick={runQuery} disabled={loadingCSV || loadingQuery}>
          {loadingQuery ? "Running Query..." : "Run Query"}
        </button>
        <button onClick={resetFilters} disabled={loadingCSV || loadingQuery}>
          Reset
        </button>
        {error && <p className="error">{error}</p>}
      </div>
      <FilterBadges
        columnFilters={columnFilters}
        onRemove={removeFilterBadge}
      />
      <div className="result-area">
        <h2>Query Results</h2>
        <div className="table-container">
          {loadingCSV ? (
            <p>Loading CSV data...</p>
          ) : loadingQuery ? (
            <p>Running query...</p>
          ) : resultData && resultData.length > 0 ? (
            <table>
              <thead>
                <tr>
                  {csvData.length > 0 &&
                    Object.keys(csvData[0]).map((col, index) => (
                      <TableHeader
                        key={index}
                        col={col}
                        active={activeFilterColumn === col}
                        onHeaderClick={handleHeaderClick}
                        arrow={activeFilterColumn === col ? "▲" : "▼"}
                        dropdownItems={uniqueValues[col] || []}
                        selectedItems={columnFilters[col] || []}
                        onToggle={(val) => handleDropdownToggle(col, val)}
                        onClose={() => setActiveFilterColumn("")}
                      />
                    ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.keys(row).map((col, cellIndex) => (
                      <td key={cellIndex}>{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No data to display.</p>
          )}
        </div>
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={goToPreviousPage}
            onNext={goToNextPage}
            pageSize={pageSize}
            onPageSizeChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          />
        )}
        <br />
        <button onClick={downloadPDF}>Download as PDF</button>
      </div>
    </div>
  );
}

export default App;
