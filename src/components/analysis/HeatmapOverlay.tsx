import { useEffect, useRef } from 'react';

interface HeatmapOverlayProps {
  scanData: {
    screenDimensions: { width: number; height: number };
    trails: Array<Array<{ x: number; y: number }>>;
    settings?: any;
  };
  segmentationData: number[][]; // 2D array of probability values [0-1]
  intensity: number; // Overlay intensity multiplier [0-1]
}

const HeatmapOverlay = ({ scanData, segmentationData, intensity }: HeatmapOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    drawHeatmap();
  }, [segmentationData, intensity, scanData]);

  const drawHeatmap = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !segmentationData.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate display dimensions and scaling
    const containerRect = container.getBoundingClientRect();
    const displayWidth = containerRect.width - 32; // Account for padding
    const displayHeight = containerRect.height - 32;
    
    const scaleX = displayWidth / scanData.screenDimensions.width;
    const scaleY = displayHeight / scanData.screenDimensions.height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up

    const scaledWidth = scanData.screenDimensions.width * scale;
    const scaledHeight = scanData.screenDimensions.height * scale;

    // Set canvas size
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    canvas.style.width = `${scaledWidth}px`;
    canvas.style.height = `${scaledHeight}px`;

    // Clear canvas
    ctx.clearRect(0, 0, scaledWidth, scaledHeight);

    // Draw background (light gray border)
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, scaledWidth, scaledHeight);

    // Draw scan area background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, scaledWidth, scaledHeight);

    // Calculate grid cell size
    const gridSize = 40; // Standard grid size
    const cellWidth = (gridSize * scale);
    const cellHeight = (gridSize * scale);

    // Draw trails first (as light blue paths)
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2 * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    scanData.trails.forEach(trail => {
      if (trail.length < 2) return;
      
      ctx.beginPath();
      ctx.moveTo(trail[0].x * scale, trail[0].y * scale);
      
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].x * scale, trail[i].y * scale);
      }
      
      ctx.stroke();
    });

    // Draw segmentation heatmap overlay
    segmentationData.forEach((row, gridY) => {
      row.forEach((probability, gridX) => {
        if (probability > 0.01) { // Only draw cells with meaningful probability
          const x = gridX * cellWidth;
          const y = gridY * cellHeight;
          
          // Use red color with alpha based on probability and intensity
          const alpha = probability * intensity;
          ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
          ctx.fillRect(x, y, cellWidth, cellHeight);
        }
      });
    });

    // Draw grid overlay (subtle)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 0.5;
    
    // Vertical lines
    for (let x = 0; x <= scaledWidth; x += cellWidth) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, scaledHeight);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= scaledHeight; y += cellHeight) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(scaledWidth, y);
      ctx.stroke();
    }
  };

  const maxProbability = segmentationData.length > 0 
    ? Math.max(...segmentationData.flat()) 
    : 0;

  return (
    <div ref={containerRef} className="w-full h-full p-4 relative">
      {/* Legend */}
      <div className="absolute top-6 right-6 bg-white border rounded-lg p-3 shadow-sm z-10">
        <div className="text-sm font-medium mb-2">Probability Scale</div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Scan Trail</span>
        </div>
        <div className="flex items-center gap-2 text-xs mt-1">
          <div className="w-4 h-4 bg-red-500 opacity-50 rounded"></div>
          <span>High Probability</span>
        </div>
        <div className="flex items-center gap-2 text-xs mt-1">
          <div className="w-4 h-4 bg-red-200 rounded"></div>
          <span>Low Probability</span>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Max: {(maxProbability * 100).toFixed(1)}%
        </div>
      </div>

      {/* Statistics */}
      <div className="absolute top-6 left-6 bg-white border rounded-lg p-3 shadow-sm z-10">
        <div className="text-sm font-medium mb-2">Statistics</div>
        <div className="text-xs space-y-1">
          <div>Grid: {segmentationData[0]?.length || 0} × {segmentationData.length || 0}</div>
          <div>Intensity: {(intensity * 100).toFixed(0)}%</div>
          <div>Trails: {scanData.trails.length}</div>
        </div>
      </div>

      {/* Canvas for heatmap visualization */}
      <div className="flex items-center justify-center h-full">
        <canvas
          ref={canvasRef}
          className="border border-gray-300 rounded"
        />
      </div>
    </div>
  );
};

export default HeatmapOverlay;
