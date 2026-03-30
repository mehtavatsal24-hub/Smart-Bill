import { useState, useRef } from "react";
import { Camera, FileText, Loader2, X, Upload } from "lucide-react";
import { Button } from "./Button";
import { analyzeDocument } from "../services/geminiService";
import { AIDocumentAnalysis, DocumentHistoryItem } from "../types";

interface DocumentUploadProps {
  onAnalysisComplete: (analysis: AIDocumentAnalysis, mergeSimilar: boolean) => void;
  industry?: string;
  history?: DocumentHistoryItem[];
  letterhead?: string;
  businessName?: string;
  disabled?: boolean;
}

export const DocumentUpload = ({ onAnalysisComplete, industry, history, letterhead, businessName, disabled = false }: DocumentUploadProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [mergeSimilar, setMergeSimilar] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const analysis = await analyzeDocument(file, industry, history, letterhead, businessName);
      if (analysis && (analysis.products.length > 0 || analysis.customer)) {
        onAnalysisComplete(analysis, mergeSimilar);
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={disabled}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.removeAttribute("capture");
              fileInputRef.current.click();
            }
          }}
          isLoading={isProcessing}
          className="hidden sm:flex"
          disabled={disabled}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Doc
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.setAttribute("capture", "environment");
              fileInputRef.current.click();
            }
          }}
          isLoading={isProcessing}
          title="Camera"
          disabled={disabled}
        >
          <Camera className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.removeAttribute("capture");
              fileInputRef.current.click();
            }
          }}
          isLoading={isProcessing}
          className="sm:hidden"
          title="Upload"
          disabled={disabled}
        >
          <Upload className="h-4 w-4" />
        </Button>
      </div>
      <label className={`flex items-center gap-2 text-[10px] text-muted-foreground transition-colors ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:text-foreground"}`}>
        <input 
          type="checkbox" 
          checked={mergeSimilar} 
          onChange={(e) => setMergeSimilar(e.target.checked)}
          className="rounded border-muted h-3 w-3"
          disabled={disabled}
        />
        Merge same products
      </label>
    </div>
  );
};
