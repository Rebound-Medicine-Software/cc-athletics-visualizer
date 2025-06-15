
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
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gray-800 text-white">
        <tr>
          <th className="px-4 py-2 text-left">#</th>
          <th className="px-4 py-2 text-left">Team Name</th>
          <th className="px-4 py-2 text-left">Athlete Name</th>
          <th className="px-4 py-2 text-left">Sex</th>
          <th className="px-4 py-2 text-left">Sport</th>
          <th className="px-4 py-2 text-left">Age Group</th>
          <th className="px-4 py-2 text-left">Weight Category (kg)</th>
          <th className="px-4 py-2 text-left">CMJ Jump Height (cm)</th>
          <th className="px-4 py-2 text-left">CMJ Peak Power (W)</th>
          <th className="px-4 py-2 text-left">CMJ Relative Peak Power (W/kg)</th>
          <th className="px-4 py-2 text-left">CMJ Reactive Strength Index</th>
          <th className="px-4 py-2 text-left">IMTP Peak Force (N)</th>
          <th className="px-4 py-2 text-left">IMTP Rel Peak Force (N/kg)</th>
        </tr>
      </thead>
      <tbody>
        {tableData.length > 0 ? (
          tableData.map((row, index) => (
            <tr key={row.id} className={index % 2 === 0 ? "bg-teal-100" : "bg-white"}>
              <td className="px-4 py-2">{row.id}</td>
              <td className="px-4 py-2">{row.teamName}</td>
              <td className="px-4 py-2">{row.athleteName}</td>
              <td className="px-4 py-2">{row.sex ?? ""}</td>
              <td className="px-4 py-2">{row.sport ?? ""}</td>
              <td className="px-4 py-2">{row.ageGroup ?? ""}</td>
              <td className="px-4 py-2">{row.weightCategory != null ? row.weightCategory.toFixed(1) : ""}</td>
              <td className="px-4 py-2">{row.cmjJumpHeight != null ? row.cmjJumpHeight.toFixed(2) : ""}</td>
              <td className="px-4 py-2">{row.cmjPeakPower != null ? row.cmjPeakPower.toFixed(0) : ""}</td>
              <td className="px-4 py-2">{row.cmjRelPeakPower != null ? row.cmjRelPeakPower.toFixed(2) : ""}</td>
              <td className="px-4 py-2">{row.cmjRSI != null ? row.cmjRSI.toFixed(2) : ""}</td>
              <td className="px-4 py-2">{row.imtpPeakForce != null ? row.imtpPeakForce.toFixed(0) : ""}</td>
              <td className="px-4 py-2">{row.imtpRelPeakForce != null ? row.imtpRelPeakForce.toFixed(2) : ""}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={13} className="px-4 py-8 text-center text-gray-500">
              No data available with current filters
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);
