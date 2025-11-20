import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, File, FileImage, FileVideo, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileWithPreview {
  file: File;
  preview?: string;
  type: 'image' | 'video' | 'pdf' | 'other';
}

interface MultiFileUploadProps {
  files: FileWithPreview[];
  onChange: (files: FileWithPreview[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  maxTotalSize?: number; // in MB
}

export const MultiFileUpload = ({
  files,
  onChange,
  maxFiles = 5,
  maxFileSize = 10,
  maxTotalSize = 50
}: MultiFileUploadProps) => {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'application/pdf',
    'video/mp4'
  ];

  const getFileType = (file: File): 'image' | 'video' | 'pdf' | 'other' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type === 'application/pdf') return 'pdf';
    return 'other';
  };

  const processFiles = async (selectedFiles: FileList | File[]) => {
    setIsProcessing(true);
    const newFiles: FileWithPreview[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles instanceof FileList ? selectedFiles[i] : selectedFiles[i];
      
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: `${file.name} is not supported. Only images, PDFs, and MP4 videos are allowed.`,
        });
        continue;
      }

      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: `${file.name} exceeds ${maxFileSize}MB limit.`,
        });
        continue;
      }

      // Create preview for images
      let preview: string | undefined;
      const fileType = getFileType(file);
      
      if (fileType === 'image') {
        preview = URL.createObjectURL(file);
      }

      newFiles.push({ file, preview, type: fileType });
    }

    const combined = [...files, ...newFiles];

    // Check max files
    if (combined.length > maxFiles) {
      toast({
        variant: "destructive",
        title: "Too Many Files",
        description: `Maximum ${maxFiles} files allowed.`,
      });
      setIsProcessing(false);
      return;
    }

    // Check total size
    const totalSize = combined.reduce((sum, f) => sum + f.file.size, 0);
    if (totalSize > maxTotalSize * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Total Size Exceeded",
        description: `Total file size must be under ${maxTotalSize}MB.`,
      });
      setIsProcessing(false);
      return;
    }

    onChange(combined);
    setIsProcessing(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    if (newFiles[index].preview) {
      URL.revokeObjectURL(newFiles[index].preview!);
    }
    newFiles.splice(index, 1);
    onChange(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: FileWithPreview['type']) => {
    switch (type) {
      case 'image': return <FileImage className="h-5 w-5" />;
      case 'video': return <FileVideo className="h-5 w-5" />;
      case 'pdf': return <File className="h-5 w-5" />;
      default: return <File className="h-5 w-5" />;
    }
  };

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="p-8 text-center">
          {isProcessing ? (
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                Images (JPG, PNG, WebP), PDF, MP4 video
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Max {maxFileSize}MB per file • {maxFiles} files max • {maxTotalSize}MB total
              </p>
            </>
          )}
        </div>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={allowedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </span>
            <span className="text-muted-foreground">
              {formatFileSize(totalSize)} / {maxTotalSize}MB
            </span>
          </div>

          <div className="grid gap-2">
            {files.map((fileItem, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-center gap-3">
                  {/* Preview or Icon */}
                  {fileItem.type === 'image' && fileItem.preview ? (
                    <img
                      src={fileItem.preview}
                      alt={fileItem.file.name}
                      className="h-12 w-12 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      {getFileIcon(fileItem.type)}
                    </div>
                  )}

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {fileItem.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(fileItem.file.size)}
                    </p>
                  </div>

                  {/* Remove Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
