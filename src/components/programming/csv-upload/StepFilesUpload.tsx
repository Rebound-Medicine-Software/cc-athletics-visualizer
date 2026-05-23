import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UploadedFileState } from './types';

interface Props {
  files: UploadedFileState[];
  onAdd: (files: File[]) => void;
  onRemove: (idx: number) => void;
}

export const StepFilesUpload = ({ files, onAdd, onRemove }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      const csv = Array.from(list).filter(
        (f) => f.name.toLowerCase().endsWith('.csv') || f.type.includes('csv'),
      );
      if (csv.length) onAdd(csv);
    },
    [onAdd],
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Upload CSV files</h3>
        <p className="text-sm text-muted-foreground">
          Drop one or more CSV files exported from your testing hardware/software.
        </p>
      </div>

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
          drag ? 'border-primary bg-primary/5' : 'border-border'
        }`}
      >
        <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
        <p className="mt-3 text-sm">Drag & drop CSV files here</p>
        <Button variant="outline" className="mt-4" onClick={() => inputRef.current?.click()}>
          Browse files
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".csv,text/csv"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {files.length} file{files.length === 1 ? '' : 's'} selected
          </div>
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center justify-between border rounded-md p-3 bg-card"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{f.file.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {(f.file.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemove(i)}
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
