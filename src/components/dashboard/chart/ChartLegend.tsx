
import React from "react";

export const ChartLegend = () => (
  <div className="flex gap-3 mt-2 items-center justify-center text-xs">
    <span className="flex items-center"><span className="w-4 h-3 rounded mr-1" style={{background:'#bbf7d0'}}></span> The Best (90-100%)</span>
    <span className="flex items-center"><span className="w-4 h-3 rounded mr-1" style={{background:'#fde68a'}}></span> Good (75-90%)</span>
    <span className="flex items-center"><span className="w-4 h-3 rounded mr-1" style={{background:'#fed7aa'}}></span> Modest (50-75%)</span>
  </div>
);
