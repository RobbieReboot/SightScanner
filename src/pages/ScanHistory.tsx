import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, ArrowLeft } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { format } from 'date-fns'

interface ScanHistoryRecord {
  id: string
  scan_date: string
  calibration_reaction_time: number
  scan_data: any
}

interface ScanHistoryProps {
  onViewScan: (scanData: any) => void
  onBack: () => void
}

const ScanHistory = ({ onViewScan, onBack }: ScanHistoryProps) => {
  const [scans, setScans] = useState<ScanHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadScanHistory()
  }, [])

  const loadScanHistory = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('scan_history')
        .select('*')
        .order('scan_date', { ascending: false })

      if (error) {
        throw error
      }

      setScans(data || [])
    } catch (err) {
      console.error('Error loading scan history:', err)
      setError('Failed to load scan history')
    } finally {
      setLoading(false)
    }
  }

  const generateThumbnail = (gridData: boolean[][], cols: number, rows: number) => {
    // Create a small canvas representation of the scan data
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    const thumbnailSize = 60
    canvas.width = thumbnailSize
    canvas.height = thumbnailSize

    // Fill background
    ctx.fillStyle = '#1f2937' // dark background
    ctx.fillRect(0, 0, thumbnailSize, thumbnailSize)

    // Draw scan points
    ctx.fillStyle = '#10b981' // green for detected points
    const scaleX = thumbnailSize / cols
    const scaleY = thumbnailSize / rows

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (gridData[row] && gridData[row][col]) {
          ctx.fillRect(
            col * scaleX,
            row * scaleY,
            Math.max(1, scaleX),
            Math.max(1, scaleY)
          )
        }
      }
    }

    return canvas.toDataURL()
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Scan History</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading scan history...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Scan History</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-500">
              {error}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Scan History</h1>
      </div>

      {scans.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              No scans found. Complete a scan to see it in your history.
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Scan History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Thumbnail</TableHead>
                  <TableHead>Reaction Time</TableHead>
                  <TableHead>Grid Size</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scans.map((scan) => (
                  <TableRow 
                    key={scan.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onViewScan(scan.scan_data)}
                  >
                    <TableCell>
                      {format(new Date(scan.scan_date), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="w-12 h-12 rounded border bg-card flex items-center justify-center overflow-hidden">
                        <img
                          src={generateThumbnail(
                            scan.scan_data.gridData,
                            scan.scan_data.gridDimensions.cols,
                            scan.scan_data.gridDimensions.rows
                          )}
                          alt="Scan thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {scan.calibration_reaction_time}ms
                    </TableCell>
                    <TableCell>
                      {scan.scan_data.gridDimensions.cols} × {scan.scan_data.gridDimensions.rows}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          onViewScan(scan.scan_data)
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ScanHistory