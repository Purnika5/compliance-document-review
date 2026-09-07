/**
 * DOCU: Renders a typed, reusable data table.
 * Last Updated Date: September 3, 2026
 * @returns A configurable data table view.
 * @author Keith
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  toolbar?: React.ReactNode;
  emptyState?: React.ReactNode;
  rowClassName?: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  toolbar,
  emptyState,
  rowClassName,
  onRowClick,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("space-y-3", className)}>
      {toolbar}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn("px-4 py-3 align-middle", column.className)}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-8 text-center">
                    {emptyState ?? (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-800">No records found</p>
                        <p className="text-xs text-slate-500">Try adjusting the filters or search term.</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr
                    key={index}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "transition-colors hover:bg-slate-50/80",
                      onRowClick && "cursor-pointer",
                      rowClassName?.(row)
                    )}
                  >
                    {columns.map((column) => (
                      <td key={`${index}-${column.key}`} className={cn("px-4 py-3 align-middle", column.className)}>
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
