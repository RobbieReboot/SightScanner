import { useState, useEffect } from 'react'

export interface ScanSettings {
  scanDirection: 'leftToRight' | 'alternating'
  scanSpeed: number // milliseconds per step
  gridSize: number // pixels per grid square (also dot size)
  showGrid: boolean
  gridOpacity: number // 0-100 percentage
  showTrail: boolean
  trailColor: string
}

const defaultSettings: ScanSettings = {
  scanDirection: 'leftToRight',
  scanSpeed: 200,
  gridSize: 40,
  showGrid: true,
  gridOpacity: 10,
  showTrail: true,
  trailColor: '#ef4444' // Red color for better visibility
}

export const useScanSettings = () => {
  const [settings, setSettings] = useState<ScanSettings>(defaultSettings)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('scanSettings')
    console.log('Loading saved settings:', saved)
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved)
        console.log('Parsed settings:', parsedSettings)
        setSettings({ ...defaultSettings, ...parsedSettings })
      } catch (error) {
        console.error('Failed to parse saved settings:', error)
      }
    }
    setIsLoaded(true)
  }, [])

  // Save settings to localStorage whenever they change (but not on initial load)
  useEffect(() => {
    if (isLoaded) {
      console.log('Saving settings to localStorage:', settings)
      localStorage.setItem('scanSettings', JSON.stringify(settings))
    }
  }, [settings, isLoaded])

  const updateSettings = (updates: Partial<ScanSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }

  return {
    settings,
    updateSettings
  }
}