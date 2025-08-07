import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { useScanSettings } from '@/hooks/useScanSettings'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface ScanScreenProps {
  onExit: () => void
  reactionTimeOffset?: number
}

const ScanScreen = ({ onExit, reactionTimeOffset = 0 }: ScanScreenProps) => {
  const { settings } = useScanSettings()
  const { toast } = useToast()
  
  // Core scanning state
  const [isScanning, setIsScanning] = useState(false)
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 })
  const [currentGridPosition, setCurrentGridPosition] = useState({ x: 0, y: 0 })
  const [isComplete, setIsComplete] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  // Trail state
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [trailPositions, setTrailPositions] = useState<Array<{ x: number, y: number }>>([])
  
  // Data storage - boolean array matching the grid
  const [scanData, setScanData] = useState<boolean[][]>([])
  
  const scanIntervalRef = useRef<NodeJS.Timeout>()
  
  // Grid calculations
  const dotSize = settings.gridSize
  const cols = Math.floor(window.innerWidth / dotSize)
  const rows = Math.floor(window.innerHeight / dotSize)
  
  // Calculate center position for the red focus dot
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2

  // Initialize scan data array
  useEffect(() => {
    const initialData = Array(rows).fill(null).map(() => Array(cols).fill(false))
    setScanData(initialData)
  }, [rows, cols])

  // Apply reaction time offset to position
  const applyReactionTimeOffset = (gridX: number, gridY: number, isStart: boolean) => {
    const pixelsPerMs = dotSize / settings.scanSpeed
    const offsetPixels = reactionTimeOffset * pixelsPerMs
    const offsetGridSquares = Math.round(offsetPixels / dotSize)
    
    let adjustedX = gridX
    
    if (settings.scanDirection === 'alternating') {
      const isLeftToRight = gridY % 2 === 0
      if (isLeftToRight) {
        adjustedX = isStart ? 
          Math.max(0, gridX - offsetGridSquares) : 
          Math.max(0, gridX - offsetGridSquares)
      } else {
        adjustedX = isStart ? 
          Math.min(cols - 1, gridX + offsetGridSquares) : 
          Math.min(cols - 1, gridX + offsetGridSquares)
      }
    } else {
      // Left to right only
      adjustedX = isStart ? 
        Math.max(0, gridX - offsetGridSquares) : 
        Math.max(0, gridX - offsetGridSquares)
    }
    
    return { x: adjustedX, y: gridY }
  }

  // Record trail positions to boolean array
  const recordTrailToData = useCallback((startGridPos: { x: number, y: number }, endGridPos: { x: number, y: number }) => {
    setScanData(prev => {
      const newData = [...prev.map(row => [...row])]
      
      // Mark all positions between start and end as true
      const minX = Math.min(startGridPos.x, endGridPos.x)
      const maxX = Math.max(startGridPos.x, endGridPos.x)
      
      // Only mark positions on the same row
      if (startGridPos.y === endGridPos.y) {
        for (let x = minX; x <= maxX; x++) {
          if (x >= 0 && x < cols && startGridPos.y >= 0 && startGridPos.y < rows) {
            newData[startGridPos.y][x] = true
          }
        }
      }
      
      return newData
    })
  }, [cols, rows])

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed && isScanning) {
        e.preventDefault()
        setIsSpacePressed(true)
        
        // Apply reaction time offset to start position
        const adjustedStart = applyReactionTimeOffset(currentGridPosition.x, currentGridPosition.y, true)
        
        // Start recording trail from current scanning position
        const startPixelPos = {
          x: adjustedStart.x * dotSize + dotSize / 2,
          y: adjustedStart.y * dotSize + dotSize / 2
        }
        setTrailPositions([startPixelPos])
      }
      
      if (e.code === 'Escape') {
        onExit()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isSpacePressed && isScanning) {
        e.preventDefault()
        setIsSpacePressed(false)
        
        // Apply reaction time offset to end position
        const adjustedEnd = applyReactionTimeOffset(currentGridPosition.x, currentGridPosition.y, false)
        
        // Record the trail data to boolean array
        if (trailPositions.length > 0) {
          const startGridPos = {
            x: Math.floor((trailPositions[0].x - dotSize / 2) / dotSize),
            y: Math.floor((trailPositions[0].y - dotSize / 2) / dotSize)
          }
          recordTrailToData(startGridPos, adjustedEnd)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isSpacePressed, isScanning, currentGridPosition, trailPositions, recordTrailToData, reactionTimeOffset, dotSize, settings.scanSpeed, settings.scanDirection])

  // Add positions to trail while space is pressed
  useEffect(() => {
    if (isSpacePressed && isScanning) {
      const currentPixelPos = {
        x: currentGridPosition.x * dotSize + dotSize / 2,
        y: currentGridPosition.y * dotSize + dotSize / 2
      }
      
      setTrailPositions(prev => {
        // Only add if position has changed
        const lastPos = prev[prev.length - 1]
        if (!lastPos || lastPos.x !== currentPixelPos.x || lastPos.y !== currentPixelPos.y) {
          return [...prev, currentPixelPos]
        }
        return prev
      })
    }
  }, [isSpacePressed, isScanning, currentGridPosition, dotSize])

  // Main scanning logic
  const startScan = useCallback(() => {
    setIsScanning(true)
    setIsComplete(false)
    setIsTransitioning(false)
    setTrailPositions([])
    
    let x = 0
    let y = 0
    let direction = 1 // 1 for right, -1 for left (for alternating)
    
    const scan = () => {
      // Update grid position
      setCurrentGridPosition({ x, y })
      
      // Calculate pixel position (center of grid square)
      const targetX = x * dotSize + dotSize / 2
      const targetY = y * dotSize + dotSize / 2
      setCurrentPosition({ x: targetX, y: targetY })
      
      // Move to next position
      if (settings.scanDirection === 'alternating') {
        x += direction
        if (x >= cols || x < 0) {
          // Move to next row
          y++
          if (y >= rows) {
            // Scan complete
            setIsComplete(true)
            setIsScanning(false)
            return
          }
          // Reset x position and flip direction
          x = direction === 1 ? cols - 1 : 0
          direction *= -1
        }
      } else {
        // Left to right only
        x++
        if (x >= cols) {
          // Move to next row
          x = 0
          y++
          if (y >= rows) {
            // Scan complete
            setIsComplete(true)
            setIsScanning(false)
            return
          }
        }
      }
    }
    
    // Start with initial position
    setCurrentGridPosition({ x: 0, y: 0 })
    setCurrentPosition({ x: dotSize / 2, y: dotSize / 2 })
    
    scanIntervalRef.current = setInterval(scan, settings.scanSpeed)
  }, [dotSize, cols, rows, settings.scanDirection, settings.scanSpeed])

  const stopScan = useCallback(() => {
    setIsScanning(false)
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
    }
  }, [])

  const saveScanData = async () => {
    const data = {
      timestamp: new Date().toISOString(),
      settings: settings,
      gridData: scanData,
      screenDimensions: { width: window.innerWidth, height: window.innerHeight },
      gridDimensions: { cols, rows },
      dotSize: dotSize,
      reactionTimeOffset: reactionTimeOffset
    }
    
    try {
      const { error } = await supabase
        .from('scan_history')
        .insert({
          calibration_reaction_time: reactionTimeOffset,
          scan_data: data as any
        })

      if (error) throw error

      toast({
        title: "Scan saved",
        description: "Your scan has been saved to your history.",
      })
    } catch (error) {
      console.error('Error saving scan:', error)
      toast({
        title: "Save failed",
        description: "Failed to save scan to history. Please try again.",
        variant: "destructive",
      })
    }

    // Download as JSON backup
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `visual-field-scan-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const restartScan = () => {
    setIsComplete(false)
    setIsScanning(false)
    setCurrentPosition({ x: 0, y: 0 })
    setCurrentGridPosition({ x: 0, y: 0 })
    setTrailPositions([])
    setIsSpacePressed(false)
    setIsTransitioning(false)
    setScanData(Array(rows).fill(null).map(() => Array(cols).fill(false)))
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
    }
    
    setTimeout(() => startScan(), 100)
  }

  return (
    <div className="fixed inset-0 bg-background">
      {/* Exit button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 z-50"
        onClick={onExit}
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Grid overlay */}
      {settings.showGrid && (
        <div className="absolute inset-0 pointer-events-none">
          <svg width="100%" height="100%" style={{ opacity: settings.gridOpacity / 100 }}>
            {Array.from({ length: rows + 1 }).map((_, i) => (
              <line
                key={`h-${i}`}
                x1="0"
                y1={i * dotSize}
                x2="100%"
                y2={i * dotSize}
                stroke="currentColor"
                strokeWidth="1"
              />
            ))}
            {Array.from({ length: cols + 1 }).map((_, i) => (
              <line
                key={`v-${i}`}
                x1={i * dotSize}
                y1="0"
                x2={i * dotSize}
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
        className="absolute rounded-full bg-red-500 pointer-events-none z-10"
        style={{
          left: centerX - 12,
          top: centerY - 12,
          width: '24px',
          height: '24px',
        }}
      />

      {/* Trail visualization - continuous solid line */}
      {settings.showTrail && trailPositions.length > 1 && (
        <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
          <polyline
            points={trailPositions.map(pos => `${pos.x},${pos.y}`).join(' ')}
            stroke={settings.trailColor || '#000000'}
            strokeWidth={dotSize}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.8}
          />
        </svg>
      )}

      {/* Scanning dot - always black, always visible */}
      {isScanning && (
        <div
          className="absolute rounded-full bg-black pointer-events-none"
          style={{
            left: currentPosition.x - (dotSize / 2),
            top: currentPosition.y - (dotSize / 2),
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            zIndex: 30,
          }}
        />
      )}

      {/* Control panel */}
      <div className={`absolute left-1/2 transform -translate-x-1/2 bg-card border rounded-lg p-4 space-y-2 ${
        currentPosition.y > window.innerHeight / 2 ? 'top-4' : 'bottom-4'
      }`}>
        {!isScanning && !isComplete && (
          <Button onClick={startScan}>Start Scan</Button>
        )}
        
        {isScanning && (
          <Button onClick={stopScan} variant="destructive">Stop Scan</Button>
        )}
        
        {isComplete && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Scan completed!</p>
            <div className="flex gap-2">
              <Button onClick={saveScanData}>Save Data</Button>
              <Button onClick={restartScan} variant="outline">Restart</Button>
            </div>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground">
          Focus on the red dot in the center • Press and hold SPACE when you can't see the black scanning dot • ESC to exit
        </p>
        
        {/* Debug info */}
        <div className="text-xs text-muted-foreground">
          Position: ({currentGridPosition.x}, {currentGridPosition.y}) | Trail: {trailPositions.length} points
        </div>
      </div>
    </div>
  )
}

export default ScanScreen
