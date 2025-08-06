import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { useScanSettings } from '@/hooks/useScanSettings'

const SettingsPanel = () => {
  const { settings, updateSettings } = useScanSettings()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your sight analysis preferences (changes save automatically)</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Scan Behavior</CardTitle>
            <CardDescription>Control how the scanning dot moves</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scan-direction">Scan Direction</Label>
              <Select
                value={settings.scanDirection}
                onValueChange={(value: 'leftToRight' | 'alternating') => 
                  updateSettings({ scanDirection: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leftToRight">Left to Right (each row)</SelectItem>
                  <SelectItem value="alternating">Left to Right, then Right to Left</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scan-speed">Scan Speed (ms per step)</Label>
              <Slider
                value={[settings.scanSpeed]}
                onValueChange={(value) => updateSettings({ scanSpeed: value[0] })}
                min={50}
                max={1000}
                step={50}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">{settings.scanSpeed}ms</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grid Settings</CardTitle>
            <CardDescription>Configure the detection grid</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="grid-size">Grid Square Size (pixels)</Label>
              <Slider
                value={[settings.gridSize]}
                onValueChange={(value) => updateSettings({ gridSize: value[0] })}
                min={32}
                max={128}
                step={8}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">{settings.gridSize}px squares</p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-grid"
                checked={settings.showGrid}
                onCheckedChange={(checked) => updateSettings({ showGrid: checked })}
              />
              <Label htmlFor="show-grid">Show Grid Lines</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grid-opacity">Grid Opacity (%)</Label>
              <Slider
                value={[settings.gridOpacity]}
                onValueChange={(value) => updateSettings({ gridOpacity: value[0] })}
                min={5}
                max={50}
                step={5}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">{settings.gridOpacity}% opacity</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trail Settings</CardTitle>
            <CardDescription>Configure the visual trail when space is pressed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-trail"
                checked={settings.showTrail}
                onCheckedChange={(checked) => updateSettings({ showTrail: checked })}
              />
              <Label htmlFor="show-trail">Show Trail</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trail-color">Trail Color</Label>
              <Input
                id="trail-color"
                type="color"
                value={settings.trailColor}
                onChange={(e) => updateSettings({ trailColor: e.target.value })}
                className="w-20 h-10"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SettingsPanel