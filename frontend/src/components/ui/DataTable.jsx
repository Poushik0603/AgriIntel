import { useMemo, useState } from "react";
import Button from "./Button";
import EmptyState from "./EmptyState";

export default function DataTable({
  title,
  description,
  columns,
  data,
  searchKeys = [],
  searchPlaceholder = "Search records",
  pageSize = 5,
  toolbarContent = null,
  emptyTitle = "No records found",
  emptyMessage = "Try adjusting your search or adding new data.",
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: columns.find((column) => column.sortable !== false)?.key,
    direction: "asc",
  });
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return data;
    }

    return data.filter((item) =>
      searchKeys.some((key) => String(item[key] ?? "").toLowerCase().includes(normalized))
    );
  }, [data, searchKeys, searchTerm]);

  const sorted = useMemo(() => {
    if (!sortConfig.key) {
      return filtered;
    }

    const items = [...filtered];
    items.sort((left, right) => {
      const a = left[sortConfig.key];
      const b = right[sortConfig.key];
      if (a === b) {
        return 0;
      }
      if (a === null || a === undefined) {
        return 1;
      }
      if (b === null || b === undefined) {
        return -1;
      }
      const result = String(a).localeCompare(String(b), undefined, { numeric: true });
      return sortConfig.direction === "asc" ? result : -result;
    });
    return items;
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paginated = sorted.slice(start, start + pageSize);

  function changeSort(key) {
    setPage(1);
    setSortConfig((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  }

  return (
    <div className="table-card">
      <div className="table-toolbar">
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        <div className="table-toolbar-actions">
          <input
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
          />
          {toolbarContent}
        </div>
      </div>

      {!paginated.length ? (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      ) : (
        <>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key}>
                      {column.sortable === false ? (
                        column.header
                      ) : (
                        <button type="button" className="sort-button" onClick={() => changeSort(column.key)}>
                          {column.header}
                          {sortConfig.key === column.key ? <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span> : null}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((row, index) => (
                  <tr key={row.id ?? `${row.name ?? "row"}-${index}`}>
                    {columns.map((column) => (
                      <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-pagination">
            <span>
              Showing {start + 1}-{Math.min(start + pageSize, sorted.length)} of {sorted.length}
            </span>
            <div className="pagination-actions">
              <Button variant="ghost" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1}>
                Previous
              </Button>
              <span>Page {currentPage} / {totalPages}</span>
              <Button variant="ghost" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={currentPage === totalPages}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
