import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Eye, ArrowLeft, Brain, TrendingUp, Trash2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

interface ScanHistoryRecord {
  id: string
  scan_date: string
  calibration_reaction_time: number
  scan_data: any
  analysis_status: 'not_processed' | 'processing' | 'completed' | 'error' | null
  analysis_date: string | null
  analysis_results: {
    prediction: {
      label: string
      confidence: number
    }
    grad_cam_map_url?: string
    metrics?: {
      peak_intensity: number
      focus_area: number
    }
  } | null
}

interface ScanHistoryProps {
  onViewScan: (scan: ScanHistoryRecord) => void
  onRunAnalysis: (scanId: string) => void
  onViewTrends?: () => void
  onBack: () => void
}

const ScanHistory = ({ onViewScan, onRunAnalysis, onViewTrends, onBack }: ScanHistoryProps) => {
  const [scans, setScans] = useState<ScanHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadScanHistory()
  }, [])

  const loadScanHistory = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('scan_history')
        .select('id, scan_date, calibration_reaction_time, scan_data, analysis_status, analysis_date, analysis_results')
        .order('scan_date', { ascending: false })

      if (error) {
        throw error
      }

      setScans((data || []) as ScanHistoryRecord[])
    } catch (err) {
      console.error('Error loading scan history:', err)
      setError('Failed to load scan history')
    } finally {
      setLoading(false)
    }
  }

  const deleteScan = async (scanId: string) => {
    try {
      setDeleting(scanId)
      
      // First, try to delete any associated storage files
      const scanToDelete = scans.find(s => s.id === scanId)
      if (scanToDelete?.analysis_results?.grad_cam_map_url) {
        try {
          // Extract filename from URL and delete from storage
          const url = scanToDelete.analysis_results.grad_cam_map_url
          const fileName = url.split('/').pop()
          if (fileName) {
            await supabase.storage
              .from('analysis-results')
              .remove([fileName])
          }
        } catch (storageError) {
          console.warn('Failed to delete associated storage files:', storageError)
          // Continue with scan deletion even if storage cleanup fails
        }
      }
      
      // Delete the scan record from database
      const { error } = await supabase
        .from('scan_history')
        .delete()
        .eq('id', scanId)

      if (error) {
        throw error
      }

      // Remove the scan from local state
      setScans(prevScans => prevScans.filter(scan => scan.id !== scanId))
      
      toast({
        title: 'Scan Deleted',
        description: 'The scan has been successfully deleted from the system.',
      })
    } catch (err) {
      console.error('Error deleting scan:', err)
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete the scan. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(null)
    }
  }

  const generateThumbnail = (scanData: any, analysisResults: any) => {
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

    // Draw trails if available
    if (scanData.trails && scanData.trails.length > 0) {
      ctx.strokeStyle = '#ef4444' // red for trails
      ctx.lineWidth = 2
      ctx.lineCap = 'round'

      const scaleX = thumbnailSize / (scanData.screenDimensions?.width || 1920)
      const scaleY = thumbnailSize / (scanData.screenDimensions?.height || 1080)

      scanData.trails.forEach((trail: any[]) => {
        if (trail.length > 1) {
          ctx.beginPath()
          trail.forEach((point, index) => {
            const x = point.x * scaleX
            const y = point.y * scaleY
            if (index === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
          })
          ctx.stroke()
        }
      })
    }

    // If analysis results with Grad-CAM are available, add a subtle overlay
    if (analysisResults?.grad_cam_map_url) {
      // Add a subtle gradient overlay to indicate Grad-CAM data exists
      const gradient = ctx.createRadialGradient(
        thumbnailSize / 2, thumbnailSize / 2, 0,
        thumbnailSize / 2, thumbnailSize / 2, thumbnailSize / 2
      )
      gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)') // green center
      gradient.addColorStop(1, 'rgba(34, 197, 94, 0.1)') // fade to transparent
      
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, thumbnailSize, thumbnailSize)
      
      // Add small indicator in corner
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.arc(thumbnailSize - 8, 8, 3, 0, 2 * Math.PI)
      ctx.fill()
    }

    return canvas.toDataURL()
  }

  const getAnalysisStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Processed</Badge>
      case 'processing':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Processing</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="secondary">Not Processed</Badge>
    }
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
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Scan History</h1>
        </div>
        {onViewTrends && scans.some(scan => scan.analysis_status === 'completed') && (
          <Button onClick={onViewTrends} className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            View Trends
          </Button>
        )}
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
                  <TableHead>Analysis</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scans.map((scan) => (
                  <TableRow 
                    key={scan.id}
                    className="hover:bg-muted/50"
                  >
                    <TableCell>
                      {format(new Date(scan.scan_date), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="w-12 h-12 rounded border bg-card flex items-center justify-center overflow-hidden">
                        <img
                          src={generateThumbnail(scan.scan_data, scan.analysis_results)}
                          alt="Scan thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {scan.calibration_reaction_time}ms
                    </TableCell>
                    <TableCell>
                      {scan.scan_data.gridDimensions ? 
                        `${scan.scan_data.gridDimensions.cols} × ${scan.scan_data.gridDimensions.rows}` :
                        `${scan.scan_data.trails?.length || 0} trails`
                      }
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getAnalysisStatusBadge(scan.analysis_status)}
                        {scan.analysis_status === 'completed' && scan.analysis_results && (
                          <div className="text-xs text-muted-foreground">
                            <div>{scan.analysis_results.prediction?.label}</div>
                            <div>{(scan.analysis_results.prediction?.confidence * 100).toFixed(1)}% confidence</div>
                            {scan.analysis_date && (
                              <div>{format(new Date(scan.analysis_date), 'MMM d, HH:mm')}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewScan(scan)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        {scan.analysis_status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => onRunAnalysis(scan.id)}
                          >
                            <Brain className="h-3 w-3 mr-1" />
                            Analyze
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deleting === scan.id}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              {deleting === scan.id ? 'Deleting...' : 'Delete'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Scan</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this scan from {format(new Date(scan.scan_date), 'MMM d, yyyy HH:mm')}? 
                                This action cannot be undone and will permanently remove all scan data and analysis results.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteScan(scan.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Scan
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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