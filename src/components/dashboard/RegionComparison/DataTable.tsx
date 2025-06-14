
import React from "react";

interface DataTableProps {
  tableData: {
    id: number;
    sport: string;
    teamName: string;
    athleteName: string;
    metricSelected: string;
    value: string | number;
  }[];
}

export const DataTable = ({ tableData }: DataTableProps) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gray-800 text-white">
        <tr>
          <th className="px-4 py-2 text-left">#</th>
          <th className="px-4 py-2 text-left">Sport</th>
          <th className="px-4 py-2 text-left">Team Name</th>
          <th className="px-4 py-2 text-left">Athlete Name</th>
          <th className="px-4 py-2 text-left">Metric Selected</th>
          <th className="px-4 py-2 text-left">Individual Data Values</th>
        </tr>
      </thead>
      <tbody>
        {tableData.length > 0 ? (
          tableData.map((row, index) => (
            <tr key={row.id} className={index % 2 === 0 ? "bg-teal-100" : "bg-white"}>
              <td className="px-4 py-2">{row.id}</td>
              <td className="px-4 py-2">{row.sport}</td>
              <td className="px-4 py-2">{row.teamName}</td>
              <td className="px-4 py-2">{row.athleteName}</td>
              <td className="px-4 py-2">{row.metricSelected}</td>
              <td className="px-4 py-2 font-mono">
                {typeof row.value === 'number' ? row.value.toFixed(2) : row.value}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
              No data available with current filters
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);
