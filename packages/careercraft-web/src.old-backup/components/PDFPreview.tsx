import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ZoomIn, 
  ZoomOut, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Maximize2,
  Minimize2,
  RotateCw,
  FileText,
  Loader2
} from 'lucide-react';
import { pdfBytesToDataUrl, downloadPDF } from '@/lib/pdfService';

interface PDFPreviewProps {
  pdfBytes?: Uint8Array;
  pdfUrl?: string;
  filename?: string;
  className?: string;
  showControls?: boolean;
  onClose?: () => void;
}

export function PDFPreview({ 
  pdfBytes, 
  pdfUrl,
  filename = 'document.pdf',
  className = '',
  showControls = true,
  onClose
}: PDFPreviewProps) {
  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Generate data URL from bytes or use provided URL
  const dataUrl = pdfBytes ? pdfBytesToDataUrl(pdfBytes) : pdfUrl;

  useEffect(() => {
    if (dataUrl) {
      setIsLoading(false);
    }
  }, [dataUrl]);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const handleResetZoom = () => setScale(1);

  const handleDownload = () => {
    if (pdfBytes) {
      downloadPDF(pdfBytes, filename);
    } else if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = filename;
      link.click();
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  if (!dataUrl) {
    return (
      <Card className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No PDF to preview</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center text-destructive">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative bg-muted/30 rounded-lg overflow-hidden ${className}`}
    >
      {/* Controls */}
      {showControls && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-0 left-0 right-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border p-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                className="h-8 w-8"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={scale >= 3}
                className="h-8 w-8"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleResetZoom}
                className="h-8 w-8"
              >
                <RotateCw className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="h-8 w-8"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* PDF Viewer */}
      <div 
        className={`overflow-auto ${showControls ? 'pt-12' : ''}`}
        style={{ 
          height: isFullscreen ? '100vh' : '600px',
          maxHeight: isFullscreen ? '100vh' : '80vh'
        }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        
        <div 
          className="flex justify-center p-4"
          style={{ 
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease'
          }}
        >
          <iframe
            ref={iframeRef}
            src={`${dataUrl}#toolbar=0&navpanes=0&scrollbar=0`}
            className="w-full bg-white shadow-lg rounded"
            style={{ 
              width: '100%',
              maxWidth: '800px',
              height: `${600 / scale}px`,
              border: 'none'
            }}
            title="PDF Preview"
            onLoad={() => setIsLoading(false)}
            onError={() => setError('Failed to load PDF')}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Simple inline PDF preview for cards
 */
export function PDFThumbnail({ 
  pdfBytes,
  pdfUrl,
  className = '',
  onClick
}: {
  pdfBytes?: Uint8Array;
  pdfUrl?: string;
  className?: string;
  onClick?: () => void;
}) {
  const dataUrl = pdfBytes ? pdfBytesToDataUrl(pdfBytes) : pdfUrl;

  if (!dataUrl) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <FileText className="w-8 h-8 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div 
      className={`relative overflow-hidden cursor-pointer group ${className}`}
      onClick={onClick}
    >
      <iframe
        src={`${dataUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
        className="w-full h-full pointer-events-none"
        title="PDF Thumbnail"
        style={{ border: 'none' }}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 className="w-6 h-6 text-white drop-shadow-lg" />
        </div>
      </div>
    </div>
  );
}
