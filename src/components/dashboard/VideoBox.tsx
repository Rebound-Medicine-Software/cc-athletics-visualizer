import { TestData } from "@/types/forcePlateTypes";
import { LimbSymmetryChart } from "./chart/LimbSymmetryChart";

interface VideoBoxProps {
  testName: string;
  data: TestData[];
  metricType?: string;
}

export const VideoBox = ({ testName, data, metricType }: VideoBoxProps) => {
  return (
    <div className="w-full max-w-[420px]">
      <div
        className="bg-white border border-teal-200 rounded-lg shadow p-4 flex flex-col items-center min-h-[370px] max-h-[480px] h-[480px] box-border"
        style={{
          // Force the main box to be a fixed height/match chart height: 480px
          overflow: "hidden",
        }}
      >
        <LimbSymmetryChart data={data} testName={testName} metricType={metricType} />
      </div>
    </div>
  );
};