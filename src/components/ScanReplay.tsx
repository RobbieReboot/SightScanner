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
            
            return (
              <polyline
                key={trailIndex}
                points={points}
                fill="none"
                stroke={scanData.settings?.trailColor || '#10b981'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          })}
        </svg>
      </div>

      {/* Info panel */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-card border rounded-lg p-4 space-y-2">
        <div className="text-sm text-muted-foreground text-center">
          <div>Trails: {scanData.trails?.length || 0}</div>
          <div>Screen: {scanData.screenDimensions.width} × {scanData.screenDimensions.height}</div>
          <div>Scan Direction: {scanData.settings?.scanDirection || 'unknown'}</div>
          <div>Scan Speed: {scanData.settings?.scanSpeed || 'unknown'}ms</div>
          {scanData.reactionTimeOffset && (
            <div>Reaction Time: {scanData.reactionTimeOffset}ms</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScanReplay