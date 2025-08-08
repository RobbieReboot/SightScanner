import { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import * as tf from '@tensorflow/tfjs';
import { heatmapToImageData } from '@/lib/gradcam';

interface AnalysisResults {
  grad_cam_map_url?: string;
  predicted_label: string;
  confidence: number;
  percent_affected: number;
  centroid: { x: number; y: number };
  lcc_size: number;
  sym_lr: number;
  sym_tb: number;
}

interface GradCamViewerProps {
  scanData: any;
  analysisResults?: AnalysisResults | null;
  heatmap?: tf.Tensor2D | null;
  isAnalyzing?: boolean;
}

const GradCamViewer = ({ 
  scanData, 
  analysisResults, 
  heatmap, 
  isAnalyzing = false 
}: GradCamViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });

  useEffect(() => {
    if (canvasRef.current) {
      redrawCanvas();
    }
  }, [scanData, heatmap, analysisResults]);

  const redrawCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw scan data if available
    if (scanData) {
      await drawScanData(ctx);
    }

    // Draw heatmap overlay if available
    if (heatmap) {
      await drawHeatmapOverlay(ctx);
    }

    // Draw analysis results from saved data if available
    if (analysisResults?.grad_cam_map_url) {
      await drawSavedHeatmap(ctx);
    }
  };

  const drawScanData = async (ctx: CanvasRenderingContext2D) => {
    if (!scanData.trails || scanData.trails.length === 0) return;

    const scaleX = canvasSize.width / (scanData.screenDimensions?.width || 1920);
    const scaleY = canvasSize.height / (scanData.screenDimensions?.height || 1080);

    // Draw trails
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    scanData.trails.forEach((trail: Array<{x: number, y: number}>) => {
      if (trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(trail[0].x * scaleX, trail[0].y * scaleY);
        
        trail.forEach((point, index) => {
          if (index > 0) {
            ctx.lineTo(point.x * scaleX, point.y * scaleY);
          }
        });
        
        ctx.stroke();
      }
    });

    // Draw grid if enabled in settings
    if (scanData.settings?.showGrid) {
      drawGrid(ctx, scaleX, scaleY);
    }
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, scaleX: number, scaleY: number) => {
    const gridSize = scanData.settings?.gridSize || 20;
    const scaledGridX = gridSize * scaleX;
    const scaledGridY = gridSize * scaleY;

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;

    // Vertical lines
    for (let x = scaledGridX; x < canvasSize.width; x += scaledGridX) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasSize.height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = scaledGridY; y < canvasSize.height; y += scaledGridY) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasSize.width, y);
      ctx.stroke();
    }
  };

  const drawHeatmapOverlay = async (ctx: CanvasRenderingContext2D) => {
    if (!heatmap) return;

    try {
      const imageData = await heatmapToImageData(heatmap, canvasSize.width, canvasSize.height);
      ctx.putImageData(imageData, 0, 0);
    } catch (error) {
      console.error('Error drawing heatmap overlay:', error);
    }
  };

  const drawSavedHeatmap = async (ctx: CanvasRenderingContext2D) => {
    if (!analysisResults?.grad_cam_map_url) return;

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      return new Promise<void>((resolve) => {
        img.onload = () => {
          ctx.globalAlpha = 0.7;
          ctx.drawImage(img, 0, 0, canvasSize.width, canvasSize.height);
          ctx.globalAlpha = 1.0;
          resolve();
        };
        img.onerror = () => {
          console.error('Failed to load saved heatmap image');
          resolve();
        };
        img.src = analysisResults.grad_cam_map_url;
      });
    } catch (error) {
      console.error('Error drawing saved heatmap:', error);
    }
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatCoordinate = (value: number) => value.toFixed(1);

  return (
    <div className="space-y-4">
      {/* Canvas Display */}
      <Card>
        <CardHeader>
          <CardTitle>Scan Visualization</CardTitle>
          <CardDescription>
            {isAnalyzing 
              ? 'Running analysis...' 
              : 'View scan data with Grad-CAM heatmap overlay'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="border rounded-lg w-full max-w-full"
              style={{ aspectRatio: `${canvasSize.width}/${canvasSize.height}` }}
            />
            
            {isAnalyzing && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <div className="text-sm text-muted-foreground">Analyzing...</div>
                </div>
              </div>
            )}
            
            {!scanData && !isAnalyzing && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-muted/50">
                <div className="text-muted-foreground">Select a scan to view</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResults && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>Grad-CAM analysis metrics and predictions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Prediction */}
              <div className="space-y-1">
                <div className="text-sm font-medium">Prediction</div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">{analysisResults.predicted_label}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatPercentage(analysisResults.confidence)}
                  </span>
                </div>
              </div>

              {/* Percent Affected */}
              <div className="space-y-1">
                <div className="text-sm font-medium">Affected Area</div>
                <div className="text-lg font-semibold">
                  {formatPercentage(analysisResults.percent_affected / 100)}
                </div>
              </div>

              {/* Centroid */}
              <div className="space-y-1">
                <div className="text-sm font-medium">Centroid</div>
                <div className="text-sm">
                  ({formatCoordinate(analysisResults.centroid.x)}, {formatCoordinate(analysisResults.centroid.y)})
                </div>
              </div>

              {/* LCC Size */}
              <div className="space-y-1">
                <div className="text-sm font-medium">LCC Size</div>
                <div className="text-lg font-semibold">{analysisResults.lcc_size}</div>
              </div>

              {/* Left-Right Symmetry */}
              <div className="space-y-1">
                <div className="text-sm font-medium">L-R Symmetry</div>
                <div className="text-lg font-semibold">
                  {formatPercentage(analysisResults.sym_lr)}
                </div>
              </div>

              {/* Top-Bottom Symmetry */}
              <div className="space-y-1">
                <div className="text-sm font-medium">T-B Symmetry</div>
                <div className="text-lg font-semibold">
                  {formatPercentage(analysisResults.sym_tb)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GradCamViewer;
