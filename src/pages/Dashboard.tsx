import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Eye, Settings, History, Brain, TrendingUp, Database, Layers } from 'lucide-react'
import { useState } from 'react'
import ScanScreen from '@/components/ScanScreen'
import SettingsPanel from '@/components/SettingsPanel'
import CalibrationPage from '@/components/CalibrationPage'
import ScanHistory from '@/pages/ScanHistory'
import ScanReplay from '@/components/ScanReplay'
import EnhancedScanViewer from '@/components/analysis/EnhancedScanViewer'
import GradCamAnalysis from '@/pages/GradCamAnalysis'
import TrendAnalysis from '@/pages/TrendAnalysis'
import SegmentationHeatmap from '@/pages/SegmentationHeatmap'
import TrendTestData from '@/components/dev/TrendTestData'

// Development features flag
const DEV_FEATURES = true;

const Dashboard = () => {
  const [currentView, setCurrentView] = useState<'home' | 'scan' | 'settings' | 'calibration' | 'history' | 'replay' | 'enhanced-view' | 'gradcam' | 'trends' | 'heatmap' | 'test-data'>('home')
  const [reactionTimeOffset, setReactionTimeOffset] = useState(0)
  const [replayScanData, setReplayScanData] = useState<any>(null)
  const [selectedScanRecord, setSelectedScanRecord] = useState<any>(null)
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null)

  const handleCalibrationComplete = (averageReactionTime: number) => {
    setReactionTimeOffset(averageReactionTime)
    setCurrentView('scan')
  }

  const handleStartScan = () => {
    setCurrentView('calibration')
  }

  const handleViewScan = (scanRecord: any) => {
    setSelectedScanRecord(scanRecord)
    // Use enhanced viewer if analysis results are available, otherwise use basic replay
    if (scanRecord.analysis_status === 'completed' && scanRecord.analysis_results) {
      setCurrentView('enhanced-view')
    } else {
      setReplayScanData(scanRecord.scan_data)
      setCurrentView('replay')
    }
  }

  const handleRunAnalysis = (scanId: string) => {
    setSelectedScanId(scanId)
    setCurrentView('gradcam')
  }

  // Full-screen views
  if (currentView === 'calibration') {
    return (
      <CalibrationPage 
        onCalibrationComplete={handleCalibrationComplete}
        onExit={() => setCurrentView('home')}
      />
    )
  }

  if (currentView === 'scan') {
    return (
      <ScanScreen 
        onExit={() => setCurrentView('home')} 
        reactionTimeOffset={reactionTimeOffset}
      />
    )
  }

  if (currentView === 'history') {
    return (
      <ScanHistory 
        onViewScan={handleViewScan}
        onRunAnalysis={handleRunAnalysis}
        onViewTrends={() => setCurrentView('trends')}
        onBack={() => setCurrentView('home')}
      />
    )
  }

  if (currentView === 'replay') {
    return (
      <ScanReplay 
        scanData={replayScanData}
        onExit={() => setCurrentView('history')}
      />
    )
  }

  if (currentView === 'enhanced-view') {
    return (
      <EnhancedScanViewer 
        scanData={selectedScanRecord.scan_data}
        analysisResults={selectedScanRecord.analysis_results}
        onExit={() => setCurrentView('history')}
      />
    )
  }

  if (currentView === 'gradcam') {
    return (
      <div className="min-h-screen p-6">
        <GradCamAnalysis scanId={selectedScanId} onBack={() => setCurrentView('home')} />
      </div>
    )
  }

  if (currentView === 'trends') {
    return (
      <div className="min-h-screen p-6">
        <TrendAnalysis onBack={() => setCurrentView('home')} />
      </div>
    )
  }

  if (currentView === 'heatmap') {
    return (
      <div className="min-h-screen">
        <SegmentationHeatmap onBack={() => setCurrentView('home')} />
      </div>
    )
  }

  if (currentView === 'test-data') {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <TrendTestData onClose={() => setCurrentView('home')} />
      </div>
    )
  }

  // Main dashboard with sidebar
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleStartScan}>
                      <Eye className="h-4 w-4" />
                      Start Scan
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setCurrentView('history')}>
                      <History className="h-4 w-4" />
                      Scan History
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setCurrentView('gradcam')}>
                      <Brain className="h-4 w-4" />
                      Grad-CAM Analysis
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setCurrentView('trends')}>
                      <TrendingUp className="h-4 w-4" />
                      Trend Analysis
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {DEV_FEATURES && (
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setCurrentView('heatmap')}>
                        <Layers className="h-4 w-4" />
                        Segmentation Heatmap
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setCurrentView('settings')}>
                      <Settings className="h-4 w-4" />
                      Settings
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            {/* Development Tools */}
            <SidebarGroup>
              <SidebarGroupLabel>Development</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setCurrentView('test-data')}>
                      <Database className="h-4 w-4" />
                      Generate Test Data
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        
        <SidebarInset>
          <div className="flex h-14 items-center gap-2 px-4 border-b">
            <SidebarTrigger />
            <div className="flex-1" />
            {/* Authentication disabled for development */}
          </div>
          
          <div className="flex-1 p-6">
            {currentView === 'home' && (
              <div className="space-y-6">
                <h1 className="text-3xl font-bold">Sight Analysis Dashboard</h1>
                <p className="text-muted-foreground">
                  Welcome to your sight analysis tool. Use the menu to start a scan or adjust settings.
                </p>
                <Button onClick={handleStartScan} size="lg">
                  <Eye className="h-4 w-4 mr-2" />
                  Start Scan
                </Button>
              </div>
            )}
            
            {currentView === 'settings' && <SettingsPanel />}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

export default Dashboard