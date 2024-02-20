import React, { useEffect, useState } from "react";
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

import { useVirtualizer } from "@tanstack/react-virtual";

import { makeData, Person } from "./makeData";

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

  // Clone the data array
  const dataWithExpandedRow = [...data];

  if (selectedIndex !== null) {
    // Clone the selected row and insert it into the array
    dataWithExpandedRow.splice(selectedIndex, 0, { ...data[selectedIndex] });
  }

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
  });

  const { rows } = table.getRowModel();

  //The virtualizer needs to know the scrollable container element
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 33, //estimate row height for accurate scrollbar dragging
    getScrollElement: () => tableContainerRef.current,
    //measure dynamic row height, except in firefox because it measures table border height incorrectly
    measureElement:
      typeof window !== "undefined" &&
      navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 100,
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
      <div
        className="container"
        ref={tableContainerRef}
        style={{
          overflow: "auto", //our scrollable table container
          position: "relative", //needed for sticky header
          height: "800px", //should be a fixed height
        }}
      >
        {/* we must use CSS grid and flexbox for dynamic row heights */}
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
                <>
                  <div
                    data-index={virtualRow.index} //needed for dynamic row height measurement
                    ref={(node) => rowVirtualizer.measureElement(node)} //measure dynamic row height
                    key={
                      virtualRow.index === selectedIndex ? "expanded" : row.id
                    }
                    style={{
                      display: "flex",
                      position: "absolute",
                      transform: `translateY(${virtualRow.start}px)`, //this should always be a `style` as it changes on scroll
                      width: "100%",
                      fontSize:
                        virtualRow.index === selectedIndex ? 32 : undefined,
                    }}
                  >
                    {virtualRow.index !== selectedIndex ? (
                      row.getVisibleCells().map((cell) => {
                        return (
                          <div
                            key={cell.id}
                            style={{
                              display: "flex",
                              width: cell.column.getSize(),
                              cursor: "pointer",
                            }}
                            onClick={() => setSelectedIndex(virtualRow.index)}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <DetailPanel />
                    )}
                  </div>
                </>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const DetailPanel = ({}) => {
  const [moreContent, setMoreContent] = useState<string>();
  useEffect(() => {
    // set a timer for 1000ms to add more fake content
    const timer = setTimeout(() => {
      setMoreContent("More dynamically resizing content");
    }, 1000);
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
