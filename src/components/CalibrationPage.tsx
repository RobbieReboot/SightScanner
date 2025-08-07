import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'

interface CalibrationPageProps {
  onCalibrationComplete: (averageReactionTime: number) => void
  onExit: () => void
}

const CalibrationPage = ({ onCalibrationComplete, onExit }: CalibrationPageProps) => {
  const [measurements, setMeasurements] = useState<number[]>([])
  const [phase, setPhase] = useState<'ready' | 'countdown' | 'getready' | 'measuring' | 'wait' | 'preparing' | 'complete'>('ready')
  const [countdown, setCountdown] = useState(3)
  const [dotStartTime, setDotStartTime] = useState<number>(0)
  const [currentTrial, setCurrentTrial] = useState(0)
  
  const timeoutRef = useRef<NodeJS.Timeout>()
  const intervalRef = useRef<NodeJS.Timeout>()

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = undefined
    }
  }, [])

  // Start a single measurement cycle
  const startSingleMeasurement = useCallback(() => {
    clearTimers()
    setCurrentTrial(prev => prev + 1)
    
    // Phase 1: 3-2-1 countdown
    setPhase('countdown')
    setCountdown(3)
    
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          intervalRef.current = undefined
          
          // Phase 2: "Get Ready" with random delay
          setPhase('getready')
          
          const randomDelay = 2000 + Math.random() * 2000 // 2-4 seconds
          timeoutRef.current = setTimeout(() => {
            // Phase 3: Show red dot
            setPhase('measuring')
            setDotStartTime(Date.now())
          }, randomDelay)
          
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [clearTimers])

  // Handle user click/keypress
  const handleReaction = useCallback(() => {
    if (phase !== 'measuring') return
    
    const reactionTime = Date.now() - dotStartTime
    const newMeasurements = [...measurements, reactionTime]
    setMeasurements(newMeasurements)
    
    // Clear all timers to prevent any race conditions
    clearTimers()
    
    // Phase 4: Show result immediately, dot disappears
    setPhase('wait')
    
    timeoutRef.current = setTimeout(() => {
      if (newMeasurements.length >= 5) {
        // All 5 measurements complete
        setPhase('complete')
      } else {
        // Start next measurement directly without showing preparing phase
        startSingleMeasurement()
      }
    }, 1500) // Longer wait to prevent text flashing
  }, [phase, dotStartTime, measurements, startSingleMeasurement, clearTimers])

  // Start calibration process
  const handleStartCalibration = useCallback(() => {
    setMeasurements([])
    setCurrentTrial(0)
    setPhase('ready')
    setTimeout(() => startSingleMeasurement(), 100)
  }, [startSingleMeasurement])

  // Handle keyboard and mouse clicks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        handleReaction()
      }
      if (e.code === 'Escape') {
        onExit()
      }
    }

    const handleMouseClick = () => {
      handleReaction()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('click', handleMouseClick)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('click', handleMouseClick)
    }
  }, [handleReaction, onExit])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [clearTimers])

  const averageReactionTime = measurements.length > 0 
    ? Math.round(measurements.reduce((sum, time) => sum + time, 0) / measurements.length)
    : 0

  const handleStartScan = () => {
    onCalibrationComplete(averageReactionTime)
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center">
      {/* Title */}
      <h1 className="text-4xl font-bold text-center mb-4">
        Reaction Time Calibration
      </h1>

      {/* Instructions */}
      <p className="text-lg text-muted-foreground text-center mb-12 max-w-md">
        Click or press any key as soon as you see the red dot appear.
      </p>

      {/* Main content area */}
      <div className="h-32 flex items-center justify-center">
        {phase === 'ready' && (
          <div className="text-center">
            <p className="text-lg text-muted-foreground mb-6">
              Ready to start calibration? We'll take 5 measurements.
            </p>
            <Button onClick={handleStartCalibration} size="lg">
              Start Calibration
            </Button>
          </div>
        )}

        {phase === 'countdown' && countdown > 0 && (
          <div className="text-6xl font-bold text-primary">
            {countdown}
          </div>
        )}

        {phase === 'getready' && (
          <div className="text-xl text-muted-foreground">
            Get ready...
          </div>
        )}

        {phase === 'measuring' && (
          <div
            className="w-16 h-16 bg-red-500 rounded-full cursor-pointer"
            onClick={handleReaction}
          />
        )}

        {phase === 'wait' && (
          <div className="text-lg text-green-600">
            Recorded! ({measurements[measurements.length - 1]}ms)
          </div>
        )}

        {phase === 'complete' && (
          <div className="text-center">
            <p className="text-lg text-green-600 mb-4">
              Calibration complete!
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Average reaction time: {averageReactionTime}ms
            </p>
            <Button onClick={handleStartScan} size="lg">
              Start Scan
            </Button>
          </div>
        )}
      </div>

      {/* Progress indicator */}
      <div className="h-12 flex items-center justify-center mt-8">
        {phase !== 'ready' && phase !== 'complete' && (
          <div className="text-xl font-medium text-foreground">
            Measurement {currentTrial} of 5
          </div>
        )}
      </div>

      {/* Results display */}
      {measurements.length > 0 && phase !== 'complete' && (
        <div className="mt-4 text-sm text-muted-foreground">
          Previous times: {measurements.map(t => `${t}ms`).join(', ')}
        </div>
      )}

      {/* Exit button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4"
        onClick={onExit}
      >
        Cancel
      </Button>
    </div>
  )
}

export default CalibrationPage