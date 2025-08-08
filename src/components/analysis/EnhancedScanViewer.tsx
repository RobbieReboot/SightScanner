import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface EnhancedScanViewerProps {
  scanData: {
    timestamp: string;
    settings: any;
    trails: Array<Array<{ x: number; y: number }>>;
    screenDimensions: { width: number; height: number };
    gridDimensions?: { cols: number; rows: number };
    reactionTimeOffset?: number;
  };
  analysisResults?: {
    prediction: {
      label: string;
      confidence: number;
    };
    grad_cam_map_url?: string;
    metrics?: {
      peak_intensity: number;
      focus_area: number;
    };
  } | null;
  onExit: () => void;
}

const EnhancedScanViewer = ({ scanData, analysisResults, onExit }: EnhancedScanViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showGradCam, setShowGradCam] = useState(true);
  const [gradCamImage, setGradCamImage] = useState<HTMLImageElement | null>(null);
  const [gradCamLoading, setGradCamLoading] = useState(false);

  // Calculate display dimensions while maintaining aspect ratio
  const maxWidth = 800;
  const maxHeight = 600;
  const aspectRatio = scanData.screenDimensions.width / scanData.screenDimensions.height;
  
  let scaledWidth = maxWidth;
  let scaledHeight = maxWidth / aspectRatio;
  
  if (scaledHeight > maxHeight) {
    scaledHeight = maxHeight;
    scaledWidth = maxHeight * aspectRatio;
  }

  // Load Grad-CAM image if available
  useEffect(() => {
    if (analysisResults?.grad_cam_map_url) {
      setGradCamLoading(true);
      const img = new Image();
      img.onload = () => {
        setGradCamImage(img);
        setGradCamLoading(false);
      };
      img.onerror = () => {
        console.error('Failed to load Grad-CAM image');
        setGradCamImage(null);
        setGradCamLoading(false);
      };
      // Add crossOrigin attribute for better compatibility
      img.crossOrigin = 'anonymous';
      img.src = analysisResults.grad_cam_map_url;
    } else {
      setGradCamImage(null);
      setGradCamLoading(false);
    }
  }, [analysisResults?.grad_cam_map_url]);

  // Draw scan with optional Grad-CAM overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = scaledWidth;
    canvas.height = scaledHeight;

    // Clear canvas
    ctx.fillStyle = '#1f2937'; // dark background
    ctx.fillRect(0, 0, scaledWidth, scaledHeight);

    // Calculate scale factors
    const scaleX = scaledWidth / scanData.screenDimensions.width;
    const scaleY = scaledHeight / scanData.screenDimensions.height;

    // Draw Grad-CAM heatmap first (if enabled and available)
    if (showGradCam && gradCamImage) {
      ctx.save();
      ctx.globalAlpha = 0.7; // Semi-transparent overlay
      ctx.drawImage(gradCamImage, 0, 0, scaledWidth, scaledHeight);
      ctx.restore();
    }

    // Draw central red focus dot
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(scaledWidth / 2, scaledHeight / 2, 12, 0, 2 * Math.PI);
    ctx.fill();

    // Draw scan trails
    if (scanData.trails && scanData.trails.length > 0) {
      ctx.strokeStyle = showGradCam && gradCamImage ? '#ffffff' : '#ef4444'; // White on heatmap, red otherwise
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      scanData.trails.forEach((trail) => {
        if (trail && trail.length > 1) {
          ctx.beginPath();
          trail.forEach((point, index) => {
            if (point && typeof point.x === 'number' && typeof point.y === 'number') {
              const x = point.x * scaleX;
              const y = point.y * scaleY;
              if (index === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
          });
          ctx.stroke();
        }
      });
    }
  }, [scanData, gradCamImage, showGradCam, scaledWidth, scaledHeight]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-start justify-between gap-4">
        {/* Left: Back button and scan details */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" onClick={onExit} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to History
          </Button>
          
          {/* Scan details */}
          <div className="flex gap-4">
            {/* Basic info */}
            <div className="bg-card border rounded-lg p-3">
              <div className="text-sm space-y-1">
                <div className="font-medium text-foreground">Scan Info</div>
                <div className="text-muted-foreground">Trails: {scanData.trails?.length || 0}</div>
                <div className="text-muted-foreground">Screen: {scanData.screenDimensions.width} × {scanData.screenDimensions.height}</div>
                <div className="text-muted-foreground">Date: {new Date(scanData.timestamp).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Analysis results */}
            {analysisResults && (
              <div className="bg-card border rounded-lg p-3">
                <div className="text-sm space-y-1">
                  <div className="font-medium text-foreground">Analysis Results</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{analysisResults.prediction.label}</Badge>
                    <span className="text-muted-foreground">
                      {(analysisResults.prediction.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  {analysisResults.metrics && (
                    <div className="text-muted-foreground">
                      <div>Peak Intensity: {analysisResults.metrics.peak_intensity.toFixed(2)}</div>
                      <div>Focus Area: {analysisResults.metrics.focus_area.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Grad-CAM toggle */}
        {analysisResults?.grad_cam_map_url && (
          <Button
            variant={showGradCam ? "default" : "outline"}
            onClick={() => setShowGradCam(!showGradCam)}
            disabled={gradCamLoading}
          >
            {gradCamLoading ? (
              'Loading...'
            ) : (
              <>
                {showGradCam ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showGradCam ? 'Hide' : 'Show'} Grad-CAM
              </>
            )}
          </Button>
        )}
      </div>

      {/* Centered scan display */}
      <div className="flex items-center justify-center min-h-screen pt-24 pb-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">
              {analysisResults ? 'Enhanced Scan with Grad-CAM Analysis' : 'Scan Replay'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <canvas
              ref={canvasRef}
              className="border border-border/50 rounded"
              style={{
                maxWidth: '100%',
                height: 'auto',
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedScanViewer;
