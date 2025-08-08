import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Activity } from 'lucide-react';

interface ScanData {
  id: string;
  scan_date: string;
  calibration_reaction_time: number;
  scan_data: any;
  analysis_status: 'not_processed' | 'processed';
  analysis_date?: string;
  analysis_results?: any;
}

interface ScanSelectorProps {
  selectedScan: ScanData | null;
  onScanSelect: (scan: ScanData) => void;
}

const ScanSelector = ({ selectedScan, onScanSelect }: ScanSelectorProps) => {
  const [scans, setScans] = useState<ScanData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('scan_history')
        .select('*')
        .order('scan_date', { ascending: false });

      if (error) {
        throw error;
      }

      // Map the data to include default analysis fields if they don't exist
      const mappedData: ScanData[] = (data || []).map(scan => ({
        ...scan,
        analysis_status: (scan as any).analysis_status || 'not_processed',
        analysis_date: (scan as any).analysis_date,
        analysis_results: (scan as any).analysis_results
      }));
      
      setScans(mappedData);
    } catch (error) {
      console.error('Error loading scans:', error);
      toast({
        title: 'Error',
        description: 'Failed to load scan history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const generateThumbnail = (scanData: any): string => {
    // Create a simple thumbnail representation
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';
    
    // Clear canvas
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw scan data if available
    if (scanData.trails && scanData.trails.length > 0) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      
      const scaleX = canvas.width / (scanData.screenDimensions?.width || 1920);
      const scaleY = canvas.height / (scanData.screenDimensions?.height || 1080);
      
      scanData.trails.forEach((trail: Array<{x: number, y: number}>) => {
        if (trail.length > 0) {
          ctx.beginPath();
          ctx.moveTo(trail[0].x * scaleX, trail[0].y * scaleY);
          
          trail.forEach(point => {
            ctx.lineTo(point.x * scaleX, point.y * scaleY);
          });
          
          ctx.stroke();
        }
      });
    }
    
    return canvas.toDataURL();
  };

  if (loading) {
    return (
      <Card className="h-96">
        <CardHeader>
          <CardTitle>Select Scan</CardTitle>
          <CardDescription>Choose a scan to analyze</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading scans...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-96">
      <CardHeader>
        <CardTitle>Select Scan</CardTitle>
        <CardDescription>
          Choose a scan to analyze ({scans.length} available)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {scans.map((scan) => (
              <div
                key={scan.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedScan?.id === scan.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
                onClick={() => onScanSelect(scan)}
              >
                <div className="flex items-start gap-3">
                  {/* Thumbnail */}
                  <div className="w-16 h-12 border rounded bg-muted flex-shrink-0 overflow-hidden">
                    <img
                      src={generateThumbnail(scan.scan_data)}
                      alt="Scan thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Scan details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {formatDate(scan.scan_date)}
                      </span>
                      <Badge
                        variant={scan.analysis_status === 'processed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {scan.analysis_status === 'processed' ? 'Analyzed' : 'Not Analyzed'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {scan.calibration_reaction_time}ms
                      </div>
                      
                      {scan.scan_data.trails && (
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {scan.scan_data.trails.length} trails
                        </div>
                      )}
                    </div>
                    
                    {scan.analysis_status === 'processed' && scan.analysis_date && (
                      <div className="text-xs text-green-600 mt-1">
                        Analyzed: {formatDate(scan.analysis_date)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {scans.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No scans available. Create some scans first to analyze them.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ScanSelector;
