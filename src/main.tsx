import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";

import "./index.css";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  Row,
  useReactTable,
} from "@tanstack/react-table";

import {
  defaultRangeExtractor,
  type Range,
  useVirtualizer,
  type VirtualItem,
} from "@tanstack/react-virtual";

import { makeData, Person } from "./makeData";

const RECORD_LOAD_INCREMENT = 150;

function App() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const columns = React.useMemo<ColumnDef<Person>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 60,
      },
      {
        accessorKey: "firstName",
        cell: (info) => info.getValue(),
      },
      {
        accessorFn: (row) => row.lastName,
        id: "lastName",
        cell: (info) => info.getValue(),
        header: () => <span>Last Name</span>,
      },
      {
        accessorKey: "age",
        header: () => "Age",
        size: 50,
      },
      {
        accessorKey: "visits",
        header: () => <span>Visits</span>,
        size: 50,
      },
      {
        accessorKey: "status",
        header: "Status",
      },
      {
        accessorKey: "progress",
        header: "Profile Progress",
        size: 80,
      },
      {
        accessorKey: "createdAt",
        header: "Created At",
        cell: (info) => info.getValue<Date>().toLocaleString(),
        size: 250,
      },
    ],
    []
  );

  const [data] = React.useState(() => makeData(50_000));
  const [revealedRowCount, setRevealedRowCount] = React.useState<number>(RECORD_LOAD_INCREMENT);
  const [lastVisibleRow, setLastVisibleRow] = React.useState<number>();

  useEffect(() => {
    let timeoutId: number;
    if (lastVisibleRow && lastVisibleRow > revealedRowCount) {
      timeoutId = setTimeout(() => {
        setRevealedRowCount(revealedRowCount + RECORD_LOAD_INCREMENT);
      }, 500);
    }
    return () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  }, [lastVisibleRow, revealedRowCount])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
  });

  const { rows } = useMemo(() => table.getRowModel(), [table]);

  //The virtualizer needs to know the scrollable container element
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 33, //estimate row height for accurate scrollbar dragging
    getScrollElement: () => tableContainerRef.current,
    getItemKey: useCallback((index: number) => rows[index].id, [rows]),
    // Define the range of rows to render based on the scroll position
    rangeExtractor: useCallback(
      (range: Range) => {
        if (lastVisibleRow === undefined || range.endIndex > lastVisibleRow) {
          setLastVisibleRow(range.endIndex);
        }
        const next = new Set([
          // Always render the expanded row
          ...(selectedIndex !== null ? [selectedIndex] : []),
          // Fill in with default row-rendering logic
          ...defaultRangeExtractor(range),
        ]);
        return [...next].sort((a, b) => a - b);
      },
      [selectedIndex, lastVisibleRow]
    ),
    //measure dynamic row height, except in firefox because it measures table border height incorrectly
    // measureElement:
    //   typeof window !== "undefined" &&
    //   navigator.userAgent.indexOf("Firefox") === -1
    //     ? (element) => element?.getBoundingClientRect().height
    //     : undefined,
    // Firefox fix not necessary since we're not working with table markup and its weird border behavior
    measureElement:
      typeof window !== "undefined"
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 10,
  });

  //All important CSS styles are included as inline styles for this example. This is not recommended for your code.
  return (
    <div className="app">
      {process.env.NODE_ENV === "development" ? (
        <p>
          <strong>Notice:</strong> You are currently running React in
          development mode. Virtualized rendering performance will be slightly
          degraded until this application is built for production.
        </p>
      ) : null}
      ({data.length} rows)
      <div>Last row scrolled into view: {lastVisibleRow}</div>
      <div>Rows loaded: {revealedRowCount}</div>
      <div
        className="container"
        ref={tableContainerRef}
        style={{
          overflow: "auto", //our scrollable table container
          position: "relative", //needed for sticky header
          height: "800px", //should be a fixed height
        }}
      >
        {/* we must use CSS grid and flexbox for dynamic row heights, HTML table layout doesn't work */}
        <div style={{ display: "grid" }} role="table">
          <div
            style={{
              display: "grid",
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <div
                key={headerGroup.id}
                style={{ display: "flex", width: "100%" }}
              >
                {headerGroup.headers.map((header) => {
                  return (
                    <div
                      key={header.id}
                      style={{
                        display: "flex",
                        width: header.getSize(),
                      }}
                      role="columnheader"
                    >
                      <div
                        {...{
                          className: header.column.getCanSort()
                            ? "cursor-pointer select-none"
                            : "",
                          onClick: header.column.getToggleSortingHandler(),
                        }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: " 🔼",
                          desc: " 🔽",
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "grid",
              height: `${rowVirtualizer.getTotalSize()}px`, //tells scrollbar how big the table is
              position: "relative", //needed for absolute positioning of rows
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index] as Row<Person>;
              return (
                <div
                  ref={(node) => rowVirtualizer.measureElement(node)}
                  data-index={virtualRow.index} //needed for dynamic row height measurement
                  // key={virtualRow.key}
                  // I read that using a stable id (instead of a virtual row id) helps us more solidly memoize the row renderer component
                  key={row.id}
                  style={{
                    position: "absolute",
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`, //this should always be a `style` as it changes on scroll
                  }}
                >
                  <TableRow
                    rows={rows}
                    key={virtualRow.key}
                    virtualRow={virtualRow}
                    // measureElement={rowVirtualizer.measureElement}
                    setSelectedIndex={setSelectedIndex}
                    expanded={virtualRow.index === selectedIndex}
                    isSkeletonRow={row.index > revealedRowCount}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const TableRow = React.memo(
  ({
    rows,
    virtualRow,
    expanded,
    setSelectedIndex,
    isSkeletonRow,
  }: {
    rows: Row<Person>[];
    virtualRow: VirtualItem;
    expanded: boolean;
    setSelectedIndex: React.Dispatch<React.SetStateAction<number | null>>;
    isSkeletonRow: boolean;
  }) => {
    const row = rows[virtualRow.index] as Row<Person>;
    return (
      <>
        <div
          style={{
            display: "flex",
          }}
        >
          <>
            {row.getVisibleCells().map((cell) => {
              return (
                <div
                  key={cell.id}
                  style={{
                    display: "flex",
                    width: cell.column.getSize(),
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    setSelectedIndex((selectedIndex) =>
                      selectedIndex === virtualRow.index
                        ? null
                        : virtualRow.index
                    )
                  }
                >
                  {isSkeletonRow ? "---" : flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              );
            })}
          </>
        </div>
        {expanded ? <DetailPanel /> : null}
      </>
    );
  }
);
TableRow.displayName = "TableRow";

const DetailPanel = () => {
  const [moreContent, setMoreContent] = useState<string>();
  // simulate dynamic content, like a network request
  useEffect(() => {
    const timer = setTimeout(() => {
      setMoreContent("More dynamically resizing content");
    }, 500);
    return () => clearTimeout(timer);
  });
  return (
    <div
      style={{
        display: "block",
        width: "100%",
        cursor: "pointer",
      }}
    >
      <>
        Expanded detail panel
        {moreContent ? <div>{moreContent}</div> : null}
      </>
    </div>
  );
};

const rootElement = document.getElementById("root");

if (!rootElement) throw new Error("Failed to find the root element");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
