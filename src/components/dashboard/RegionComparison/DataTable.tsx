
import React from "react";
import { Trophy, Medal } from "lucide-react";

interface DataTableProps {
  tableData: {
    id: number;
    teamName: string;
    athleteName: string;
    metricType: string;
    metricValue: number | null;
  }[];
}

const getRankIcon = (position: number) => {
  switch (position) {
    case 1:
      return <Trophy className="w-5 h-5 text-yellow-500" />;
    case 2:
      return <Medal className="w-5 h-5 text-gray-400" />;
    case 3:
      return <Medal className="w-5 h-5 text-amber-600" />;
    default:
      return null;
  }
};

export const DataTable = ({ tableData }: DataTableProps) => (
  <div className="w-full border border-gray-300 rounded-lg">
    {/* Compact scrollable container - shows only 3 rows at a time */}
    <div className="max-h-[180px] overflow-auto">
      <table className="w-full border-collapse">
        <thead className="bg-gray-800 text-white sticky top-0">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-semibold">#</th>
            <th className="px-4 py-2 text-left text-sm font-semibold">Team Name</th>
            <th className="px-4 py-2 text-left text-sm font-semibold">Athlete Name</th>
            <th className="px-4 py-2 text-left text-sm font-semibold">Metric Type</th>
            <th className="px-4 py-2 text-left text-sm font-semibold">Value</th>
          </tr>
        </thead>
        <tbody>
          {tableData.length > 0 ? (
            tableData.map((row, index) => {
              const position = index + 1;
              const rowClassName = index % 2 === 0 ? "bg-gray-50" : "bg-white";
              const isTopThree = position <= 3;
              
              return (
                <tr 
                  key={row.id} 
                  className={`${rowClassName} hover:bg-gray-100 transition-colors ${
                    !isTopThree ? 'blur-sm opacity-60' : ''
                  }`}
                  style={{ height: '48px' }} // Fixed row height for consistent 3-row display
                >
                  <td className="px-4 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      {getRankIcon(position)}
                      <span className="font-medium">{position}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm font-medium">{row.teamName}</td>
                  <td className="px-4 py-2 text-sm">{row.athleteName}</td>
                  <td className="px-4 py-2 text-sm">{row.metricType}</td>
                  <td className="px-4 py-2 text-sm font-mono">
                    {row.metricValue != null ? row.metricValue.toFixed(2) : "N/A"}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                No data available with current filters
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);
