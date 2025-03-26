export function applyColumnFilters(data, columnFilters) {
  if (!data) return [];
  return data.filter((row) =>
    Object.keys(columnFilters).every((col) => {
      const filterVals = columnFilters[col] || [];
      if (filterVals.length === 0) return true;
      return filterVals.includes(row[col]);
    })
  );
}

export function generateQuery(selectedTable, uniqueValues, columnFilters) {
  let query = `SELECT * FROM ${selectedTable}`;
  const conditions = [];
  Object.keys(uniqueValues).forEach((col) => {
    const selectedVals = columnFilters[col] || [];
    if (selectedVals.length > 0) {
      if (selectedVals.length === 1) {
        conditions.push(`${col} = '${selectedVals[0]}'`);
      } else {
        const vals = selectedVals.map((v) => `'${v}'`).join(", ");
        conditions.push(`${col} IN (${vals})`);
      }
    }
  });
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += ";";
  return query;
}
