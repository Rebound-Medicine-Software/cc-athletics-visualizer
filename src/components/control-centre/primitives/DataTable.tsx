import React from 'react';

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
  maxHeight?: number | string;
}

export function DataTable<T extends Record<string, any>>({ columns, rows, empty = 'No records', maxHeight = 540 }: DataTableProps<T>) {
  return (
    <div className="cc-glass overflow-hidden">
      <div style={{ maxHeight, overflow: 'auto' }}>
        <table className="cc-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} style={{ width: c.width, textAlign: c.align ?? 'left' }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: 36, color: 'hsl(var(--cc-fg-dim))' }}>{empty}</td></tr>
            )}
            {rows.map((row, i) => (
              <tr key={row.id ?? i}>
                {columns.map((c) => (
                  <td key={c.key} style={{ textAlign: c.align ?? 'left' }}>
                    {c.render ? c.render(row) : (row as any)[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
