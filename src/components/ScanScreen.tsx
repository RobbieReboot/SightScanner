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
  const [isComplete, setIsComplete] = useState(false)
  
  // Trail state - SIMPLE
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [trailPositions, setTrailPositions] = useState<Array<{ x: number, y: number }>>([])
  const [allTrails, setAllTrails] = useState<Array<Array<{ x: number, y: number }>>>([])
  
  const scanIntervalRef = useRef<NodeJS.Timeout>()
  
  // Grid calculations
  const dotSize = settings.gridSize
  const cols = Math.floor(window.innerWidth / dotSize)
  const rows = Math.floor(window.innerHeight / dotSize)
  
  // Calculate center position for the red focus dot
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2

  // SIMPLE: Add current position to trail whenever position changes AND space is pressed
  useEffect(() => {
    if (isSpacePressed && isScanning) {
      console.log('Adding position to trail:', currentPosition)
      setTrailPositions(prev => {
        // Check if this is a line break (y position changed significantly)
        if (prev.length > 0) {
          const lastPos = prev[prev.length - 1]
          const yDiff = Math.abs(currentPosition.y - lastPos.y)
          
          // If Y position changed by more than half the dot size, it's a new line
          if (yDiff > dotSize / 2) {
            console.log('Line break detected, ending current trail and starting new one')
            // Save current trail to completed trails
            setAllTrails(prevTrails => [...prevTrails, prev])
            // Start new trail with current position
            return [currentPosition]
          }
        }
        
        const newTrail = [...prev, currentPosition]
        console.log('Trail now has', newTrail.length, 'positions')
        return newTrail
      })
    }
  }, [currentPosition, isSpacePressed, isScanning, dotSize])

  // SIMPLE: Handle space key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed && isScanning) {
        e.preventDefault()
        setIsSpacePressed(true)
        setTrailPositions([currentPosition]) // Start new trail
      }
      if (e.code === 'Escape') {
        onExit()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isSpacePressed && isScanning) {
        e.preventDefault()
        setIsSpacePressed(false)
        // Save completed trail
        if (trailPositions.length > 0) {
          setAllTrails(prev => [...prev, trailPositions])
        }
        setTrailPositions([]) // Clear current trail
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isSpacePressed, isScanning, currentPosition, trailPositions, onExit])

  // SIMPLE: Main scanning logic
  const startScan = useCallback(() => {
    setIsScanning(true)
    setIsComplete(false)
    setTrailPositions([])
    setAllTrails([])
    
    let pixelX = dotSize / 2
    let pixelY = dotSize / 2
    
    // Calculate movement speed
    const pixelsPerStep = Math.max(1, Math.round(dotSize / 4)) // Move 1/4 of dot size per step
    const intervalMs = settings.scanSpeed / 4 // Divide scan speed for smooth movement
    
    const scan = () => {
      // Update position
      console.log('Scanning to position:', pixelX, pixelY)
      setCurrentPosition({ x: pixelX, y: pixelY })
      
      // Move right
      pixelX += pixelsPerStep
      
      // If reached end of row, move to next row
      if (pixelX >= window.innerWidth - dotSize / 2) {
        console.log('End of row reached, moving to next row')
        pixelX = dotSize / 2
        pixelY += dotSize
        
        // If reached end of screen, complete scan
        if (pixelY >= window.innerHeight - dotSize / 2) {
          console.log('Scan complete')
          setIsComplete(true)
          setIsScanning(false)
          return
        }
      }
    }
    
    // Start scanning
    setCurrentPosition({ x: pixelX, y: pixelY })
    scanIntervalRef.current = setInterval(scan, intervalMs)
  }, [dotSize, settings.scanSpeed])

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
      trails: allTrails,
      screenDimensions: { width: window.innerWidth, height: window.innerHeight },
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
  }

  const restartScan = () => {
    setIsComplete(false)
    setIsScanning(false)
    setCurrentPosition({ x: 0, y: 0 })
    setTrailPositions([])
    setAllTrails([])
    setIsSpacePressed(false)
    
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

      {/* SIMPLE: Trail visualization */}
      {settings.showTrail && (
        <svg 
          className="absolute inset-0 pointer-events-none" 
          style={{ zIndex: 20 }}
          width="100%"
          height="100%"
          viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
        >
          {/* Completed trails */}
          {allTrails.map((trail, index) => (
            trail.length > 1 && (
              <polyline
                key={`trail-${index}`}
                points={trail.map(pos => `${pos.x},${pos.y}`).join(' ')}
                stroke={settings.trailColor}
                strokeWidth={dotSize}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={0.8}
              />
            )
          ))}
          
          {/* Current trail */}
          {trailPositions.length > 1 && (
            <polyline
              points={trailPositions.map(pos => `${pos.x},${pos.y}`).join(' ')}
              stroke={settings.trailColor}
              strokeWidth={dotSize}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.8}
            />
          )}
          
          {/* Debug: Show trail positions as circles */}
          {trailPositions.map((pos, index) => (
            <circle
              key={`debug-${index}`}
              cx={pos.x}
              cy={pos.y}
              r="2"
              fill="blue"
              opacity={0.5}
            />
          ))}
        </svg>
      )}

      {/* Scanning dot */}
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
          Focus on the red dot • Hold SPACE when you can't see the black dot • ESC to exit
        </p>
        
        <div className="text-xs text-muted-foreground">
          Current Trail: {trailPositions.length} | Completed: {allTrails.length} | Position: {currentPosition.x.toFixed(0)},{currentPosition.y.toFixed(0)} | Space: {isSpacePressed ? 'PRESSED' : 'NOT PRESSED'}
        </div>
      </div>
    </div>
  )
}

export default ScanScreen
