
import React from "react";

interface DataTableProps {
  tableData: {
    id: number;
    teamName: string;
    athleteName: string;
    sex: string | null;
    sport: string | null;
    ageGroup: string | null;
    weightCategory: number | null;
    cmjJumpHeight: number | null;
    cmjPeakPower: number | null;
    cmjRelPeakPower: number | null;
    cmjRSI: number | null;
    imtpPeakForce: number | null;
    imtpRelPeakForce: number | null;
  }[];
}

export const DataTable = ({ tableData }: DataTableProps) => (
  <div className="min-w-0 w-full">
    <table className="w-full table-fixed md:table-auto min-w-0 border-collapse">
      <thead className="bg-gray-800 text-white">
        <tr>
          <th className="px-2 md:px-4 py-2 text-left text-xs md:text-sm">#</th>
          <th className="px-2 md:px-4 py-2 text-left text-xs md:text-sm">Team Name</th>
          <th className="px-2 md:px-4 py-2 text-left text-xs md:text-sm">Athlete Name</th>
          <th className="px-2 md:px-4 py-2 text-left text-xs md:text-sm">Sex</th>
          <th className="px-2 md:px-4 py-2 text-left text-xs md:text-sm">Sport</th>
          <th className="px-2 md:px-4 py-2 text-left text-xs md:text-sm">Age Group</th>
          <th className="px-2 md:px-4 py-2 text-left text-xs md:text-sm">Weight Category (kg)</th>
          <th className="px-2 md:px-4 py-2 text-left text-xs md:text-sm">CMJ Jump Height (cm)</th>
          <th className="px-2 md:px-4 py-2 text-left text-xs md:text-sm">CMJ Peak Power (W)</th>
          <th className="px-2 md:px-4 py-2 text-left text-xs md:text-sm">CMJ Relative Peak Power (W/kg)</th>
          <th className="px-2 md:px-4 py-2 text-left text-xs md:text-sm">CMJ Reactive Strength Index</th>
          <th className="px-2 md:px-4 py-2 text-left text-xs md:text-sm">IMTP Peak Force (N)</th>
          <th className="px-2 md:px-4 py-2 text-left text-xs md:text-sm">IMTP Rel Peak Force (N/kg)</th>
        </tr>
      </thead>
      <tbody>
        {tableData.length > 0 ? (
          tableData.map((row, index) => (
            <tr key={row.id} className={index % 2 === 0 ? "bg-teal-100" : "bg-white"}>
              <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{row.id}</td>
              <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{row.teamName}</td>
              <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{row.athleteName}</td>
              <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{row.sex ?? ""}</td>
              <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{row.sport ?? ""}</td>
              <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{row.ageGroup ?? ""}</td>
              <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{row.weightCategory != null ? row.weightCategory.toFixed(1) : ""}</td>
              <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{row.cmjJumpHeight != null ? row.cmjJumpHeight.toFixed(2) : ""}</td>
              <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{row.cmjPeakPower != null ? row.cmjPeakPower.toFixed(0) : ""}</td>
              <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{row.cmjRelPeakPower != null ? row.cmjRelPeakPower.toFixed(2) : ""}</td>
              <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{row.cmjRSI != null ? row.cmjRSI.toFixed(2) : ""}</td>
              <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{row.imtpPeakForce != null ? row.imtpPeakForce.toFixed(0) : ""}</td>
              <td className="px-2 md:px-4 py-2 text-xs md:text-sm">{row.imtpRelPeakForce != null ? row.imtpRelPeakForce.toFixed(2) : ""}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={13} className="px-2 md:px-4 py-8 text-center text-gray-500 text-xs md:text-sm">
              No data available with current filters
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);
