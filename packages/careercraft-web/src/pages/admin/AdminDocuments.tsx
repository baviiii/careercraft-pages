import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, FileText, Trash2, CheckCircle2, 
  Loader2, RefreshCw, FileSearch, CloudUpload, AlertCircle, Clock, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const PDF_UPLOAD_URL = import.meta.env.VITE_PDF_UPLOAD_URL || 'https://careercraft-functions-dev.azurewebsites.net/api/pdf-upload';

interface ProcessingStatus {
  blobName: string;
  status: 'pending' | 'starting' | 'analyzing' | 'chunking' | 'embedding' | 'indexing' | 'completed' | 'failed' | 'requires_manual';
  progress: number;
  steps: Array<{ step: string; timestamp: string }>;
  lastUpdated?: string;
  error?: string;
  result?: {
    pages: number;
    textChunks: number;
    tableRows: number;
    chartsFound?: number;
    totalIndexed: number;
    embeddingsGenerated?: number;
    embeddingCoverage?: number;
    tablesFound?: number;
    processingTime: string;
    quality?: {
      coverage: number;
      status: 'EXCELLENT' | 'GOOD' | 'LOW';
      hasEmbeddings: boolean;
      hasTables: boolean;
      hasCharts: boolean;
    };
  };
}

interface BlobFile {
  name: string;
  size: number;
  lastModified: string;
  estimatedPages?: number;
  processingStatus?: ProcessingStatus | null;
  metadata?: {
    processing_status?: string;
    estimated_pages?: string;
    reason?: string;
  };
}

interface UploadedFile {
  originalName: string;
  blobName: string;
  size: number;
  uploadedAt: string;
}

export default function AdminDocuments() {
  const [recentUploads, setRecentUploads] = useState<UploadedFile[]>([]);
  const [blobFiles, setBlobFiles] = useState<BlobFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load existing files
  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${PDF_UPLOAD_URL}?action=list`);
      const data = await response.json();
      if (data.success) {
        setBlobFiles(data.files || []);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check if any files are actively processing
  const hasActiveProcessing = blobFiles.some(f => 
    f.processingStatus && 
    !['completed', 'failed', 'requires_manual'].includes(f.processingStatus.status)
  );

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Poll for updates when files are processing
  useEffect(() => {
    if (!hasActiveProcessing) return;
    
    const interval = setInterval(loadFiles, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [hasActiveProcessing, loadFiles]);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:application/pdf;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setIsUploading(true);
    setUploadError(null);
    const uploaded: UploadedFile[] = [];

    for (const file of acceptedFiles) {
      try {
        const fileData = await fileToBase64(file);
        
        const response = await fetch(`${PDF_UPLOAD_URL}?action=upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileData
          }),
        });
        
        const data = await response.json();
        
        if (data.success && data.file) {
          uploaded.push(data.file);
          toast({
            title: "Uploaded!",
            description: `${file.name} uploaded successfully`,
          });
        } else {
          throw new Error(data.error || 'Upload failed');
        }
      } catch (error: any) {
        console.error('Upload failed:', error);
        setUploadError(error.message || 'Upload failed');
        toast({
          title: "Upload Failed",
          description: error.message || 'Failed to upload file',
          variant: "destructive",
        });
      }
    }
    
    if (uploaded.length > 0) {
      setRecentUploads(prev => [...uploaded, ...prev].slice(0, 10));
      await loadFiles();
    }
    
    setIsUploading(false);
  }, [loadFiles, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  });

  // Delete a file
  const deleteFile = async (blobName: string) => {
    if (!confirm('Delete this file?')) return;
    
    try {
      await fetch(`${PDF_UPLOAD_URL}?action=delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blobName }),
      });
      toast({
        title: "Deleted",
        description: "File removed from storage",
      });
      await loadFiles();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CloudUpload className="w-6 h-6" />
            Document Upload
          </h1>
          <p className="text-muted-foreground">
            Upload PDFs to blob storage for processing
          </p>
        </div>
        <Button onClick={loadFiles} variant="outline" disabled={isLoading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-green-900 dark:text-green-100">Automatic Processing Enabled</p>
              <p className="text-green-700 dark:text-green-300 mt-1">
                Files are automatically processed when uploaded. Small PDFs (under ~100 pages) are indexed within 5-10 minutes.
                Large PDFs will be flagged for manual processing.
              </p>
              <details className="mt-2">
                <summary className="text-xs text-green-600 cursor-pointer">Manual processing command</summary>
                <code className="block mt-2 bg-green-100 dark:bg-green-900/50 px-3 py-2 rounded text-xs">
                  .\process-pdfs.ps1 -ResourceGroupName rg-careercraft-dev -SingleBlobName "filename.pdf" -GenerateEmbeddings
                </code>
              </details>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Zone */}
      <Card className="border-2 border-dashed hover:border-primary/50 transition-colors">
        <CardContent className="p-0">
          <div
            {...getRootProps()}
            className={cn(
              "p-12 text-center cursor-pointer transition-all duration-200",
              isDragActive && "bg-primary/5 border-primary",
              isUploading && "opacity-50 pointer-events-none"
            )}
          >
            <input {...getInputProps()} />
            
            <div className="flex flex-col items-center gap-4">
              {isUploading ? (
                <>
                  <Loader2 className="w-16 h-16 text-primary animate-spin" />
                  <p className="text-lg font-medium">Uploading...</p>
                </>
              ) : isDragActive ? (
                <>
                  <Upload className="w-16 h-16 text-primary animate-bounce" />
                  <p className="text-lg font-medium text-primary">Drop PDFs here!</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">Drag & drop PDFs here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </div>
                  <Badge variant="secondary" className="mt-2">
                    PDF files only
                  </Badge>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Error */}
      {uploadError && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{uploadError}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Uploads */}
      {recentUploads.length > 0 && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle2 className="w-4 h-4" />
              Just Uploaded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentUploads.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                  <FileText className="w-4 h-4" />
                  <span>{file.originalName}</span>
                  <span className="text-xs text-green-600">({formatBytes(file.size)})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents in Storage
          </CardTitle>
          <CardDescription>{blobFiles.length} PDF files</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : blobFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No documents uploaded yet</p>
              <p className="text-sm">Drop PDFs above to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {blobFiles.map((file) => {
                const status = file.processingStatus;
                const isProcessing = status && !['completed', 'failed', 'requires_manual'].includes(status.status);
                const isCompleted = status?.status === 'completed';
                const isFailed = status?.status === 'failed';
                const needsManual = file.metadata?.processing_status === 'requires_manual';
                
                return (
                  <div 
                    key={file.name}
                    className={cn(
                      "p-3 rounded-lg border bg-card transition-colors",
                      isProcessing && "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20",
                      isCompleted && "border-green-300 bg-green-50/50 dark:bg-green-950/20",
                      isFailed && "border-red-300 bg-red-50/50 dark:bg-red-950/20"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded flex items-center justify-center",
                          isProcessing && "bg-blue-100 dark:bg-blue-900/50",
                          isCompleted && "bg-green-100 dark:bg-green-900/50",
                          isFailed && "bg-red-100 dark:bg-red-900/50",
                          !status && "bg-red-100 dark:bg-red-950/30"
                        )}>
                          {isProcessing ? (
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                          ) : isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : isFailed ? (
                            <XCircle className="w-5 h-5 text-red-600" />
                          ) : (
                            <FileText className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(file.size)} • ~{file.estimatedPages || '?'} pages • {new Date(file.lastModified).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Status badges */}
                        {needsManual && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Manual Required
                          </Badge>
                        )}
                        
                        {isProcessing && (
                          <Badge variant="secondary" className="gap-1 capitalize">
                            <Clock className="w-3 h-3" />
                            {status.status}
                          </Badge>
                        )}
                        
                        {isCompleted && (
                          <Badge variant="outline" className="text-green-600 border-green-600 gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Indexed
                          </Badge>
                        )}
                        
                        {isFailed && (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="w-3 h-3" />
                            Failed
                          </Badge>
                        )}
                        
                        {!status && !needsManual && (
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="w-3 h-3" />
                            Pending
                          </Badge>
                        )}
                        
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => deleteFile(file.name)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Progress bar for active processing */}
                    {isProcessing && status && (
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{status.steps?.[status.steps.length - 1]?.step || 'Starting...'}</span>
                          <span>{status.progress}%</span>
                        </div>
                        <Progress value={status.progress} className="h-2" />
                      </div>
                    )}
                    
                    {/* Result summary for completed files */}
                    {isCompleted && status?.result && (
                      <div className="mt-3 space-y-2">
                        {/* Quality Score Card */}
                        {status.result.quality && (
                          <div className={cn(
                            "p-2 rounded text-xs",
                            status.result.quality.status === 'EXCELLENT' && "bg-green-100 dark:bg-green-900/30 border border-green-300",
                            status.result.quality.status === 'GOOD' && "bg-blue-100 dark:bg-blue-900/30 border border-blue-300",
                            status.result.quality.status === 'LOW' && "bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300"
                          )}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold">Quality Score</span>
                              <Badge variant={
                                status.result.quality.status === 'EXCELLENT' ? 'default' :
                                status.result.quality.status === 'GOOD' ? 'secondary' : 'outline'
                              } className={cn(
                                status.result.quality.status === 'EXCELLENT' && "bg-green-600 text-white",
                                status.result.quality.status === 'GOOD' && "bg-blue-600 text-white"
                              )}>
                                {status.result.quality.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{status.result.quality.coverage.toFixed(1)}%</span>
                              <span className="text-muted-foreground">coverage</span>
                              {status.result.quality.hasEmbeddings && (
                                <Badge variant="outline" className="text-xs">✓ Embeddings</Badge>
                              )}
                              {status.result.quality.hasTables && (
                                <Badge variant="outline" className="text-xs">✓ Tables</Badge>
                              )}
                              {status.result.quality.hasCharts && (
                                <Badge variant="outline" className="text-xs">✓ Charts</Badge>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Detailed Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div className="p-2 bg-muted/50 rounded">
                            <div className="text-muted-foreground">Pages</div>
                            <div className="font-semibold text-lg">{status.result.pages}</div>
                          </div>
                          <div className="p-2 bg-muted/50 rounded">
                            <div className="text-muted-foreground">Text Chunks</div>
                            <div className="font-semibold text-lg">{status.result.textChunks}</div>
                          </div>
                          <div className="p-2 bg-muted/50 rounded">
                            <div className="text-muted-foreground">Table Rows</div>
                            <div className="font-semibold text-lg">{status.result.tableRows || 0}</div>
                          </div>
                          <div className="p-2 bg-muted/50 rounded">
                            <div className="text-muted-foreground">Total Indexed</div>
                            <div className="font-semibold text-lg">{status.result.totalIndexed}</div>
                          </div>
                        </div>
                        
                        {/* Additional Metrics */}
                        {(status.result.chartsFound !== undefined || status.result.embeddingsGenerated !== undefined || status.result.embeddingCoverage !== undefined) && (
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-1 border-t">
                            {status.result.chartsFound !== undefined && (
                              <span><strong>{status.result.chartsFound}</strong> charts found</span>
                            )}
                            {status.result.embeddingsGenerated !== undefined && (
                              <span><strong>{status.result.embeddingsGenerated}</strong> embeddings</span>
                            )}
                            {status.result.embeddingCoverage !== undefined && (
                              <span className={cn(
                                status.result.embeddingCoverage >= 95 && "text-green-600",
                                status.result.embeddingCoverage >= 80 && "text-blue-600",
                                "text-yellow-600"
                              )}>
                                <strong>{status.result.embeddingCoverage.toFixed(1)}%</strong> embedding coverage
                              </span>
                            )}
                            <span className="text-green-600 ml-auto">{status.result.processingTime}</span>
                          </div>
                        )}
                        
                        {/* Fallback for old format */}
                        {!status.result.quality && (
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span><strong>{status.result.pages}</strong> pages</span>
                            <span><strong>{status.result.textChunks}</strong> chunks</span>
                            <span><strong>{status.result.tableRows}</strong> table rows</span>
                            <span><strong>{status.result.totalIndexed}</strong> indexed</span>
                            <span className="text-green-600">{status.result.processingTime}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Error message */}
                    {isFailed && status?.error && (
                      <div className="mt-2 text-xs text-red-600 bg-red-100 dark:bg-red-900/30 p-2 rounded">
                        {status.error}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
