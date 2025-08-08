import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, ArrowLeft } from 'lucide-react'

interface ScanReplayProps {
  scanData: {
    timestamp: string
    settings: any
    trails: Array<Array<{ x: number; y: number }>>
    gridData?: boolean[][] // Legacy compatibility
    screenDimensions: { width: number; height: number }
    gridDimensions?: { cols: number; rows: number }
    reactionTimeOffset?: number
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

  const scaledWidth = scanData.screenDimensions.width * scale
  const scaledHeight = scanData.screenDimensions.height * scale

  // Center the replay in the viewport
  const offsetX = (window.innerWidth - scaledWidth) / 2
  const offsetY = (window.innerHeight - scaledHeight) / 2

  return (
    <div className="fixed inset-0 bg-background">
      {/* Header with Back button, Scan details, and Date */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-start justify-between gap-4">
        {/* Left: Back button and scan details */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" onClick={onExit} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to History
          </Button>
          
          {/* Scan details sections */}
          <div className="flex gap-4">
            {/* Section 1: Basic info */}
            <div className="bg-card border rounded-lg p-3">
              <div className="text-sm space-y-1">
                <div className="font-medium text-foreground">Basic Info</div>
                <div className="text-muted-foreground">Trails: {scanData.trails?.length || 0}</div>
                <div className="text-muted-foreground">Screen: {scanData.screenDimensions.width} × {scanData.screenDimensions.height}</div>
              </div>
            </div>
            
            {/* Section 2: Scan settings */}
            <div className="bg-card border rounded-lg p-3">
              <div className="text-sm space-y-1">
                <div className="font-medium text-foreground">Settings</div>
                <div className="text-muted-foreground">Direction: {scanData.settings?.scanDirection || 'unknown'}</div>
                <div className="text-muted-foreground">Speed: {scanData.settings?.scanSpeed || 'unknown'}ms</div>
              </div>
            </div>
            
            {/* Section 3: Reaction time */}
            {scanData.reactionTimeOffset && (
              <div className="bg-card border rounded-lg p-3">
                <div className="text-sm space-y-1">
                  <div className="font-medium text-foreground">Timing</div>
                  <div className="text-muted-foreground">Reaction Time: {scanData.reactionTimeOffset}ms</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Date panel and close button */}
        <div className="flex items-start gap-4">
          {/* Date panel */}
          <div className="bg-card border rounded-lg p-3">
            <div className="text-sm">
              <div className="font-medium text-foreground">Scan Date</div>
              <div className="text-muted-foreground">{new Date(scanData.timestamp).toLocaleString()}</div>
            </div>
          </div>
          
          <Button variant="ghost" size="sm" onClick={onExit} className="shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Centered framed replay container */}
      <div className="flex items-center justify-center min-h-screen pt-24 pb-8">
        <div
          className="bg-card border-2 border-border rounded-lg shadow-lg relative"
          style={{
            width: scaledWidth + 32, // Add padding
            height: scaledHeight + 32, // Add padding
            padding: '16px',
          }}
        >
          {/* Scan screen container */}
          <div
            className="relative bg-background border border-border/50 rounded"
            style={{
              width: scaledWidth,
              height: scaledHeight,
            }}
          >
            {/* Central red focus dot */}
            <div
              className="absolute rounded-full bg-red-500 pointer-events-none z-10"
              style={{
                left: (scaledWidth / 2) - 12,
                top: (scaledHeight / 2) - 12,
                width: '24px',
                height: '24px',
              }}
            />

            {/* Trail visualization using SVG */}
            <svg 
              className="absolute inset-0 pointer-events-none"
              width="100%" 
              height="100%"
              viewBox={`0 0 ${scanData.screenDimensions.width} ${scanData.screenDimensions.height}`}
              preserveAspectRatio="none"
            >
              {scanData.trails && scanData.trails.map((trail, trailIndex) => {
                if (!trail || trail.length < 2) return null
                
                // Convert trail points to polyline points string
                const points = trail.map(point => `${point.x},${point.y}`).join(' ')
                
                // Use the same stroke width as the real scan screen (dotSize from settings)
                const strokeWidth = scanData.settings?.gridSize || 40
                
                return (
                  <polyline
                    key={trailIndex}
                    points={points}
                    fill="none"
                    stroke={scanData.settings?.trailColor || '#6b7280'}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScanReplay