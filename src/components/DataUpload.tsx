
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2 } from "lucide-react";
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
    toast.info("Loading sample force plate data...");
  };

  return (
    <Card className="border-2 border-dashed border-blue-300 bg-white/50 backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl text-slate-800">Upload Force Plate Data</CardTitle>
        <p className="text-slate-600">
          Drag and drop your data file or click to browse
        </p>
      </CardHeader>
      <CardContent>
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {isAnalyzing ? (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
              <p className="text-lg font-medium text-slate-700">Processing Data...</p>
              <p className="text-slate-600">Analyzing force plate measurements</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="w-12 h-12 text-slate-400 mx-auto" />
              <div>
                <p className="text-lg font-medium text-slate-700 mb-2">
                  Drop your force plate data here
                </p>
                <p className="text-slate-600 mb-4">
                  Supports CSV, TXT, and other common formats
                </p>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Browse Files
                </Button>
                
                <div className="text-slate-500">or</div>
                
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
            accept=".csv,.txt,.dat"
            onChange={handleFileInput}
          />
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Supported formats: CSV, TXT, DAT • Max file size: 10MB
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
