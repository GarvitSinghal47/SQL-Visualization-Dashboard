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

  const [mode, setMode] = useState("filter"); // "filter" or "sample"
  const [columnFilters, setColumnFilters] = useState({});
  const [activeFilterColumn, setActiveFilterColumn] = useState("");
  const [error, setError] = useState("");
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [resultData, setResultData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sample query mode state:
  const [selectedSampleQuery, setSelectedSampleQuery] = useState("");
  const [sampleQueryText, setSampleQueryText] = useState("");

  // Generate sample queries based on CSV data.
  const sampleQueries = useMemo(() => {
    const samples = [];
    if (!csvData || csvData.length === 0) return samples;
    const headers = Object.keys(uniqueValues);
    for (let i = 0; i < 4; i++) {
      const candidateHeaders = headers.filter(
        (col) => uniqueValues[col].length > 1
      );
      if (candidateHeaders.length === 0) break;
      const randomCol =
        candidateHeaders[Math.floor(Math.random() * candidateHeaders.length)];
      const values = uniqueValues[randomCol];
      const randomValue = values[Math.floor(Math.random() * values.length)];
      const sampleQuery = `SELECT * FROM ${selectedTable} WHERE ${randomCol} = '${randomValue}';`;
      samples.push({ id: `sample${i + 1}`, query: sampleQuery });
    }
    return samples;
  }, [selectedTable, uniqueValues, csvData]);

  // When switching to sample mode, initialize sample query.
  React.useEffect(() => {
    if (mode === "sample" && sampleQueries.length > 0) {
      setSelectedSampleQuery(sampleQueries[0].id);
      setSampleQueryText(sampleQueries[0].query);
    }
  }, [mode, sampleQueries]);

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
    return mode === "filter"
      ? generateQuery(selectedTable, uniqueValues, columnFilters)
      : sampleQueryText;
  }, [selectedTable, uniqueValues, columnFilters, sampleQueryText, mode]);

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

  const handleModeChange = (e) => {
    setMode(e.target.value);
    setError("");
  };

  const handleSampleQueryChange = (e) => {
    const sampleId = e.target.value;
    setSelectedSampleQuery(sampleId);
    const sample = sampleQueries.find((s) => s.id === sampleId);
    if (sample) {
      setSampleQueryText(sample.query);
    }
  };

  const validateQuery = (query) => {
    if (!query.trim()) return "Query cannot be empty.";
    if (
      !/^SELECT\s+\*\s+FROM\s+\w+\s+WHERE\s+\w+\s*=\s*'[^']+';?$/i.test(
        query.trim()
      )
    ) {
      return "Invalid query format. Expected: SELECT * FROM table WHERE column = 'value';";
    }
    return "";
  };

  const runQuery = () => {
    setError("");
    setLoadingQuery(true);
    setTimeout(() => {
      if (mode === "filter") {
        setResultData(filteredData);
        setCurrentPage(1);
      } else if (mode === "sample") {
        const validationError = validateQuery(sampleQueryText);
        if (validationError) {
          setError(validationError);
          setLoadingQuery(false);
          return;
        }
        // For simplicity, we'll parse the sample query (expects format: SELECT * FROM table WHERE col = 'value';)
        const regex =
          /^SELECT\s+\*\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*'([^']+)'/i;
        const match = regex.exec(sampleQueryText.trim());
        if (!match) {
          setError("Failed to parse query.");
          setLoadingQuery(false);
          return;
        }
        const tableName = match[1];
        const col = match[2];
        const value = match[3];
        if (tableName.toLowerCase() !== selectedTable.toLowerCase()) {
          setError(
            `Table name in query (${tableName}) does not match selected table (${selectedTable}).`
          );
          setLoadingQuery(false);
          return;
        }
        const filtered = csvData.filter((row) => row[col] === value);
        setResultData(filtered);
        setCurrentPage(1);
      }
      setLoadingQuery(false);
    }, 1000);
  };

  const resetFilters = () => {
    setColumnFilters({});
    setResultData(csvData);
    setError("");
    setCurrentPage(1);
    if (mode === "sample" && sampleQueries.length > 0) {
      setSelectedSampleQuery(sampleQueries[0].id);
      setSampleQueryText(sampleQueries[0].query);
    }
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
      <div className="mode-selection">
        <label>
          <input
            type="radio"
            value="filter"
            checked={mode === "filter"}
            onChange={handleModeChange}
          />{" "}
          Filter Mode
        </label>
        <label>
          <input
            type="radio"
            value="sample"
            checked={mode === "sample"}
            onChange={handleModeChange}
          />{" "}
          Sample Query Mode
        </label>
      </div>
      {mode === "sample" && (
        <div className="sample-query">
          <h2>Sample Queries</h2>
          <label>
            Choose a Sample Query:{" "}
            <select
              className="sample-select"
              value={selectedSampleQuery}
              onChange={handleSampleQueryChange}
              title={
                sampleQueries.find((s) => s.id === selectedSampleQuery)
                  ?.query || ""
              }
            >
              {sampleQueries.map((sample) => (
                <option key={sample.id} value={sample.id}>
                  {sample.query}
                </option>
              ))}
            </select>
          </label>
          <textarea
            rows="3"
            value={sampleQueryText}
            onChange={(e) => setSampleQueryText(e.target.value)}
          />
        </div>
      )}
      <div className="query-area">
        {mode === "filter" && (
          <div className="generated-query">
            <h3>Generated Query</h3>
            <input type="text" readOnly value={queryText} />
          </div>
        )}
        <button onClick={runQuery} disabled={loadingCSV || loadingQuery}>
          {loadingQuery ? "Running Query..." : "Run Query"}
        </button>
        <button onClick={resetFilters} disabled={loadingCSV || loadingQuery}>
          Reset
        </button>
        {error && <p className="error">{error}</p>}
      </div>
      {mode === "filter" && (
        <FilterBadges
          columnFilters={columnFilters}
          onRemove={removeFilterBadge}
        />
      )}
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
