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
  const [isScanning, setIsScanning] = useState(false)
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 })
  const [scanData, setScanData] = useState<boolean[][]>([])
  const [trailPositions, setTrailPositions] = useState<Array<{ x: number, y: number }>>([])
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [spaceStartPosition, setSpaceStartPosition] = useState<{ x: number, y: number } | null>(null)
  const [isMousePressed, setIsMousePressed] = useState(false)
  const trailIntervalRef = useRef<NodeJS.Timeout>()
  const scanIntervalRef = useRef<NodeJS.Timeout>()
  
  // Use settings.gridSize for both dot size and grid squares
  const dotSize = settings.gridSize // Size of the scanning dot and grid squares
  const [cols, setCols] = useState(Math.floor(window.innerWidth / dotSize))
  const [rows, setRows] = useState(Math.floor(window.innerHeight / dotSize))

  // Update grid dimensions when dotSize changes
  useEffect(() => {
    const newCols = Math.floor(window.innerWidth / dotSize)
    const newRows = Math.floor(window.innerHeight / dotSize)
    setCols(newCols)
    setRows(newRows)
  }, [dotSize])

  // Calculate center position for the red focus dot
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2

  // Initialize scan data array
  useEffect(() => {
    const initialData = Array(rows).fill(null).map(() => Array(cols).fill(false))
    setScanData(initialData)
  }, [rows, cols])

  // Trail management functions - using refs to avoid closure issues
  const currentPositionRef = useRef(currentPosition)
  currentPositionRef.current = currentPosition

  const startContinuousTrail = useCallback(() => {
    if (!settings.showTrail) {
      console.log('Trail disabled in settings')
      return
    }
    
    console.log('🚀 Starting continuous trail')
    
    // Clear any existing interval first
    if (trailIntervalRef.current) {
      clearInterval(trailIntervalRef.current)
      trailIntervalRef.current = undefined
    }

    // Test if setInterval works at all
    console.log('🧪 Testing setInterval...')
    const testInterval = setInterval(() => {
      console.log('🔥 TEST INTERVAL WORKING!')
    }, 100)
    
    setTimeout(() => {
      clearInterval(testInterval)
      console.log('🧪 Test interval cleared')
    }, 500)

    // Create the actual trail interval
    console.log('📍 Creating trail interval...')
    const intervalId = setInterval(() => {
      console.log('🔴 TRAIL TICK!')
      const pos = currentPositionRef.current
      console.log('🎯 Current position:', pos)
      
      setTrailPositions(prev => {
        const newTrail = [...prev, { x: pos.x, y: pos.y }]
        console.log('🟢 Trail updated, length:', newTrail.length)
        return newTrail
      })
    }, 100) // Slower interval for testing
    
    trailIntervalRef.current = intervalId
    console.log('✅ Interval ID stored:', intervalId)
  }, [settings.showTrail])

  const stopContinuousTrail = useCallback(() => {
    console.log('🛑 Stopping continuous trail, interval ID:', trailIntervalRef.current)
    if (trailIntervalRef.current) {
      clearInterval(trailIntervalRef.current)
      trailIntervalRef.current = undefined
      console.log('✅ Trail interval cleared')
    } else {
      console.log('❌ No interval to clear')
    }
  }, [])

  // Handle keyboard and mouse events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (!isSpacePressed && isScanning) {
          setSpaceStartPosition(currentPosition)
          startContinuousTrail()
        }
        setIsSpacePressed(true)
      }
      if (e.code === 'Escape') {
        onExit()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (isSpacePressed && isScanning && spaceStartPosition) {
          stopContinuousTrail()
          recordHit()
          // Keep trail until scan completes - don't clear it
        }
        setIsSpacePressed(false)
        setSpaceStartPosition(null)
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (isScanning) {
        setIsMousePressed(true)
        setSpaceStartPosition(currentPosition)
        startContinuousTrail()
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (isMousePressed && isScanning && spaceStartPosition) {
        stopContinuousTrail()
        recordHit()
        // Keep trail until scan completes - don't clear it
      }
      setIsMousePressed(false)
      setSpaceStartPosition(null)
    }

    const recordHit = () => {
      console.log('Recording hit at position:', currentPosition, 'showTrail:', settings.showTrail)
      // Apply reaction time offset to input release
      const pixelsPerMs = dotSize / settings.scanSpeed
      const offsetPixels = reactionTimeOffset * pixelsPerMs
      
      let adjustedX = currentPosition.x
      let adjustedY = currentPosition.y
      
      // Adjust position based on scan direction
      if (settings.scanDirection === 'leftToRight') {
        adjustedX = Math.max(0, currentPosition.x - offsetPixels)
      } else if (settings.scanDirection === 'alternating') {
        const currentRow = Math.floor(currentPosition.y / dotSize)
        const isLeftToRight = currentRow % 2 === 0
        if (isLeftToRight) {
          adjustedX = Math.max(0, currentPosition.x - offsetPixels)
        } else {
          adjustedX = Math.min(window.innerWidth, currentPosition.x + offsetPixels)
        }
      }
      
      const gridX = Math.floor(adjustedX / dotSize)
      const gridY = Math.floor(adjustedY / dotSize)
      
      console.log('Adjusted position:', { adjustedX, adjustedY }, 'Grid:', { gridX, gridY })
      
      if (gridX >= 0 && gridX < cols && gridY >= 0 && gridY < rows) {
        setScanData(prev => {
          const newData = [...prev]
          newData[gridY][gridX] = true
          return newData
        })
      } else {
        console.log('Position outside grid bounds')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      if (trailIntervalRef.current) {
        clearInterval(trailIntervalRef.current)
      }
    }
  }, [onExit, isSpacePressed, isMousePressed, isScanning, currentPosition, spaceStartPosition, dotSize, cols, rows, settings, reactionTimeOffset])


  // Scanning logic with smooth movement
  const startScan = useCallback(() => {
    setIsScanning(true)
    setCurrentPosition({ x: dotSize / 2, y: dotSize / 2 })
    // Don't clear trail positions on scan start - keep accumulated trail
    setIsComplete(false)
    setIsTransitioning(false)
    
    let x = 0
    let y = 0
    let direction = 1 // 1 for right, -1 for left
    let transitioning = false
    
    const scan = () => {
      if (transitioning) {
        // Show cursor at new row position
        const targetX = x * dotSize + dotSize / 2
        const targetY = y * dotSize + dotSize / 2
        setCurrentPosition({ x: targetX, y: targetY })
        setIsTransitioning(false)
        transitioning = false
        return
      }
      
      // Calculate the center position of the current grid square
      const targetX = x * dotSize + dotSize / 2
      const targetY = y * dotSize + dotSize / 2
      
      // Update position
      setCurrentPosition({ x: targetX, y: targetY })
      
      // Move to next position
      if (settings.scanDirection === 'alternating') {
        x += direction
        if (x >= cols || x < 0) {
          // Reset to start of next row
          x = direction === 1 ? cols - 1 : 0
          y++
          direction *= -1
           if (y >= rows) {
             setIsComplete(true)
             setIsScanning(false)
             console.log('Scan complete! Final trail has', trailPositions.length, 'points')
             return
           }
          // Hide cursor and prepare for next row
          setIsTransitioning(true)
          transitioning = true
        }
      } else {
        // left-to-right only
        x++
        if (x >= cols) {
          // Reset to start of next row
          x = 0
          y++
           if (y >= rows) {
             setIsComplete(true)
             setIsScanning(false)
             console.log('Scan complete! Final trail has', trailPositions.length, 'points')
             return
           }
          // Hide cursor and prepare for next row
          setIsTransitioning(true)
          transitioning = true
        }
      }
    }
    
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
      dotSize: dotSize
    }
    
    try {
      // Save to database
      const { error } = await supabase
        .from('scan_history')
        .insert({
          calibration_reaction_time: reactionTimeOffset,
          scan_data: data as any
        })

      if (error) {
        throw error
      }

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

    // Also download as JSON for backup
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sight-analysis-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
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

      {/* Grid overlay - using dotSize for grid squares */}
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

      {/* Trail dots */}
      {settings.showTrail && (
        <>
          {console.log('🎨 Rendering trail - showTrail:', settings.showTrail, 'trail points:', trailPositions.length, 'trailColor:', settings.trailColor)}
          {trailPositions.map((pos, i) => (
            <div
              key={`trail-${i}`}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: pos.x - (dotSize / 4),
                top: pos.y - (dotSize / 4),
                width: `${dotSize / 2}px`,
                height: `${dotSize / 2}px`,
                backgroundColor: settings.trailColor,
                zIndex: 5,
                border: '1px solid red', // Debug border to see if dots are rendered
              }}
            />
          ))}
        </>
      )}

      {/* Scanning dot with smooth transition */}
      {isScanning && !isTransitioning && (
        <div
          className="absolute rounded-full bg-primary animate-pulse pointer-events-none transition-all duration-200 ease-linear"
          style={{
            left: currentPosition.x - (dotSize / 2),
            top: currentPosition.y - (dotSize / 2),
            width: `${dotSize}px`,
            height: `${dotSize}px`,
          }}
        />
      )}

      {/* Control panel - moves to top when cursor is in bottom half */}
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
              <Button onClick={() => { 
                // Reset all state properly and clear trail only on restart
                setIsComplete(false)
                setIsScanning(false)
                setCurrentPosition({ x: 0, y: 0 })
                setScanData(Array(rows).fill(null).map(() => Array(cols).fill(false)))
                setTrailPositions([]) // Clear trail only on restart
                setIsSpacePressed(false)
                setIsMousePressed(false)
                setSpaceStartPosition(null)
                setIsTransitioning(false)
                if (scanIntervalRef.current) {
                  clearInterval(scanIntervalRef.current)
                }
                // Start fresh scan
                setTimeout(() => startScan(), 100)
              }} variant="outline">
                Restart
              </Button>
            </div>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground">
          Focus on the red dot in the center • Press SPACE or hold mouse when you see the scanning dot disappear • ESC to exit
        </p>
      </div>
    </div>
  )
}

export default ScanScreen
