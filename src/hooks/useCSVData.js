import { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";

export function useCSVData(selectedTable) {
  const [csvData, setCsvData] = useState([]);
  const [loadingCSV, setLoadingCSV] = useState(false);

  useEffect(() => {
    setLoadingCSV(true);
    Papa.parse(`${process.env.PUBLIC_URL}/csv/${selectedTable}.csv`, {
      header: true,
      download: true,
      complete: (results) => {
        setCsvData(results.data);
        setLoadingCSV(false);
      },
      error: (err) => {
        console.error("Error loading CSV:", err);
        setLoadingCSV(false);
      },
    });
  }, [selectedTable]);

  const uniqueValues = useMemo(() => {
    const result = {};
    if (csvData.length > 0) {
      const headers = Object.keys(csvData[0]);
      headers.forEach((header) => {
        result[header] = [...new Set(csvData.map((row) => row[header]))];
      });
    }
    return result;
  }, [csvData]);

  return { csvData, loadingCSV, uniqueValues };
}
