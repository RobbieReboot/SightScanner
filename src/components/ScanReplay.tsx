import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, ArrowLeft } from 'lucide-react'

interface ScanReplayProps {
  scanData: {
    timestamp: string
    settings: any
    gridData: boolean[][]
    screenDimensions: { width: number; height: number }
    gridDimensions: { cols: number; rows: number }
    dotSize: number
  }
  onExit: () => void
}

const ScanReplay = ({ scanData, onExit }: ScanReplayProps) => {
  const [scale, setScale] = useState(1)

  // Calculate scale to fit the replay in current window
  useEffect(() => {
    const scaleX = window.innerWidth / scanData.screenDimensions.width
    const scaleY = window.innerHeight / scanData.screenDimensions.height
    setScale(Math.min(scaleX, scaleY, 1)) // Don't scale up, only down
  }, [scanData.screenDimensions])

  const scaledDotSize = scanData.dotSize * scale
  const scaledWidth = scanData.screenDimensions.width * scale
  const scaledHeight = scanData.screenDimensions.height * scale

  // Center the replay in the viewport
  const offsetX = (window.innerWidth - scaledWidth) / 2
  const offsetY = (window.innerHeight - scaledHeight) / 2

  return (
    <div className="fixed inset-0 bg-background">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onExit}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to History
          </Button>
          <div className="text-sm text-muted-foreground">
            Scan from {new Date(scanData.timestamp).toLocaleString()}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onExit}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Replay container */}
      <div
        className="absolute bg-card/10 border border-border"
        style={{
          left: offsetX,
          top: offsetY,
          width: scaledWidth,
          height: scaledHeight,
        }}
      >
        {/* Grid overlay */}
        {scanData.settings.showGrid && (
          <div className="absolute inset-0 pointer-events-none">
            <svg 
              width="100%" 
              height="100%" 
              style={{ opacity: scanData.settings.gridOpacity / 100 }}
            >
              {Array.from({ length: scanData.gridDimensions.rows + 1 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="0"
                  y1={i * scaledDotSize}
                  x2="100%"
                  y2={i * scaledDotSize}
                  stroke="currentColor"
                  strokeWidth="1"
                />
              ))}
              {Array.from({ length: scanData.gridDimensions.cols + 1 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={i * scaledDotSize}
                  y1="0"
                  x2={i * scaledDotSize}
                  y2="100%"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              ))}
            </svg>
          </div>
        )}

        {/* Central red focus dot */}
        <div
          className="absolute rounded-full bg-red-500 pointer-events-none"
          style={{
            left: (scaledWidth / 2) - 12,
            top: (scaledHeight / 2) - 12,
            width: '24px',
            height: '24px',
          }}
        />

        {/* Detected points */}
        {scanData.gridData.map((row, rowIndex) =>
          row.map((detected, colIndex) => {
            if (!detected) return null
            
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: colIndex * scaledDotSize + (scaledDotSize / 4),
                  top: rowIndex * scaledDotSize + (scaledDotSize / 4),
                  width: scaledDotSize / 2,
                  height: scaledDotSize / 2,
                  backgroundColor: scanData.settings.trailColor || '#10b981',
                }}
              />
            )
          })
        )}
      </div>

      {/* Info panel */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-card border rounded-lg p-4 space-y-2">
        <div className="text-sm text-muted-foreground text-center">
          <div>Grid: {scanData.gridDimensions.cols} × {scanData.gridDimensions.rows}</div>
          <div>Dot Size: {scanData.dotSize}px</div>
          <div>Scan Direction: {scanData.settings.scanDirection}</div>
          <div>Scan Speed: {scanData.settings.scanSpeed}ms</div>
        </div>
      </div>
    </div>
  )
}

export default ScanReplay