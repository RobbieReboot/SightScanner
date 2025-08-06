import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Eye, Settings, History } from 'lucide-react'
import { useState } from 'react'
import ScanScreen from '@/components/ScanScreen'
import SettingsPanel from '@/components/SettingsPanel'
import CalibrationPage from '@/components/CalibrationPage'
import ScanHistory from '@/pages/ScanHistory'
import ScanReplay from '@/components/ScanReplay'

const Dashboard = () => {
  const [currentView, setCurrentView] = useState<'home' | 'scan' | 'settings' | 'calibration' | 'history' | 'replay'>('home')
  const [reactionTimeOffset, setReactionTimeOffset] = useState(0)
  const [replayScanData, setReplayScanData] = useState<any>(null)

  const handleCalibrationComplete = (averageReactionTime: number) => {
    setReactionTimeOffset(averageReactionTime)
    setCurrentView('scan')
  }

  const handleStartScan = () => {
    setCurrentView('calibration')
  }

  const handleViewScan = (scanData: any) => {
    setReplayScanData(scanData)
    setCurrentView('replay')
  }

  return (
    <>
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold text-foreground">Sight Analysis Tool</h1>
            <p className="text-muted-foreground">Sign in to start analyzing your vision</p>
            <SignInButton mode="modal">
              <Button size="lg">Sign In</Button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>
      
      <SignedIn>
        {currentView === 'calibration' ? (
          <CalibrationPage 
            onCalibrationComplete={handleCalibrationComplete}
            onExit={() => setCurrentView('home')}
          />
        ) : currentView === 'scan' ? (
          <ScanScreen 
            onExit={() => setCurrentView('home')} 
            reactionTimeOffset={reactionTimeOffset}
          />
        ) : currentView === 'history' ? (
          <ScanHistory 
            onViewScan={handleViewScan}
            onBack={() => setCurrentView('home')}
          />
        ) : currentView === 'replay' ? (
          <ScanReplay 
            scanData={replayScanData}
            onExit={() => setCurrentView('history')}
          />
        ) : (
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
                          <SidebarMenuButton onClick={() => setCurrentView('settings')}>
                            <Settings className="h-4 w-4" />
                            Settings
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
                  <UserButton />
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
        )}
      </SignedIn>
    </>
  )
}

export default Dashboard