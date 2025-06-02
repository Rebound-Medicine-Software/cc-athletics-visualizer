
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, Activity } from "lucide-react";
import { ForcePlateData } from "@/types/forcePlateTypes";
import { generateSampleData } from "@/utils/dataGenerator";
import { toast } from "sonner";

interface DataUploadProps {
  onDataUpload: (data: ForcePlateData) => void;
  isAnalyzing: boolean;
}

export const DataUpload = ({ onDataUpload, isAnalyzing }: DataUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    console.log("Processing file:", file.name);
    // For demo purposes, generate sample data
    const sampleData = generateSampleData();
    onDataUpload(sampleData);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleSampleData = () => {
    const sampleData = generateSampleData();
    onDataUpload(sampleData);
    toast.info("Loading sample biomechanical data...");
  };

  return (
    <Card className="border-2 border-dashed border-blue-300 bg-white/70 backdrop-blur-sm shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-xl text-gray-800 flex items-center justify-center gap-2">
          <Activity className="w-6 h-6 text-blue-600" />
          Upload Force Plate Data
        </CardTitle>
        <p className="text-gray-600">
          Import your biomechanical data or connect to CC Athletics API
        </p>
      </CardHeader>
      <CardContent>
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
            dragActive
              ? "border-blue-500 bg-blue-50 shadow-inner"
              : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {isAnalyzing ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              </div>
              <p className="text-lg font-medium text-gray-700">Processing Data...</p>
              <p className="text-gray-600">Analyzing biomechanical measurements</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drop your force plate data here
                </p>
                <p className="text-gray-600 mb-4">
                  Supports CSV, TXT, JSON and CC Analytics formats
                </p>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Browse Files
                </Button>
                
                <div className="text-gray-500">or</div>
                
                <Button
                  variant="outline"
                  onClick={handleSampleData}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  Load Sample Data
                </Button>
              </div>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".csv,.txt,.dat,.json"
            onChange={handleFileInput}
          />
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Supported formats: CSV, TXT, DAT, JSON • Max file size: 50MB
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
