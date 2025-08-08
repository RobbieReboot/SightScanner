import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, TrendingUp, Calendar, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, isAfter } from 'date-fns';
import TrendChart from '@/components/analysis/TrendChart';

interface TrendAnalysisProps {
  onBack?: () => void;
}

interface ProcessedScan {
  id: string;
  scan_date: string;
  scan_data: {
    analysis?: {
      prediction: {
        label: string;
        confidence: number;
      };
      metrics?: {
        percent_affected: number;
        sym_lr: number;
        sym_tb: number;
      };
    };
  };
}

interface TrendDataPoint {
  date: string;
  scan_date: string;
  percent_affected?: number;
  confidence?: number;
  sym_lr?: number;
  sym_tb?: number;
}

type TimeRange = '7days' | '30days' | 'all';

const TrendAnalysis = ({ onBack }: TrendAnalysisProps) => {
  const [scans, setScans] = useState<ProcessedScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30days');
  const { toast } = useToast();

  useEffect(() => {
    loadProcessedScans();
  }, []);

  const loadProcessedScans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('scan_history')
        .select('id, scan_date, scan_data')
        .not('scan_data->analysis', 'is', null)
        .order('scan_date', { ascending: true });

      if (error) throw error;

      setScans((data || []) as ProcessedScan[]);
    } catch (err) {
      console.error('Error loading processed scans:', err);
      setError('Failed to load trend data');
      toast({
        title: 'Error',
        description: 'Failed to load trend analysis data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = (): TrendDataPoint[] => {
    let cutoffDate: Date | null = null;
    
    if (timeRange === '7days') {
      cutoffDate = subDays(new Date(), 7);
    } else if (timeRange === '30days') {
      cutoffDate = subDays(new Date(), 30);
    }

    const filteredScans = cutoffDate 
      ? scans.filter(scan => isAfter(new Date(scan.scan_date), cutoffDate!))
      : scans;

    return filteredScans.map(scan => {
      const analysisResults = scan.scan_data.analysis;
      return {
        date: format(new Date(scan.scan_date), 'MMM dd'),
        scan_date: scan.scan_date,
        percent_affected: analysisResults?.metrics?.percent_affected,
        confidence: analysisResults?.prediction?.confidence,
        sym_lr: analysisResults?.metrics?.sym_lr,
        sym_tb: analysisResults?.metrics?.sym_tb,
      };
    });
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '7days': return 'Last 7 Days';
      case '30days': return 'Last 30 Days';
      case 'all': return 'All Time';
    }
  };

  const filteredData = getFilteredData();
  const hasData = filteredData.length > 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold">Trend Analysis</h1>
            <p className="text-muted-foreground">Loading trend data...</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading trend analysis...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold">Trend Analysis</h1>
            <p className="text-muted-foreground">Error loading data</p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Trend Analysis</h1>
          <p className="text-muted-foreground">
            Visualize how your vision metrics change over time
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scans.length}</div>
            <p className="text-xs text-muted-foreground">Processed scans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Time Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredData.length}</div>
            <p className="text-xs text-muted-foreground">{getTimeRangeLabel()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Latest Scan</CardTitle>
          </CardHeader>
          <CardContent>
            {scans.length > 0 ? (
              <>
                <div className="text-sm font-medium">
                  {format(new Date(scans[scans.length - 1].scan_date), 'MMM dd, yyyy')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {scans[scans.length - 1].scan_data.analysis?.prediction.label || 'Unknown'}
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No scans</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredData.length > 0 ? (
              <>
                <div className="text-2xl font-bold">
                  {(filteredData.reduce((sum, d) => sum + (d.confidence || 0), 0) / filteredData.length * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Average prediction confidence</p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Time Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={timeRange === '7days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('7days')}
            >
              Last 7 Days
            </Button>
            <Button
              variant={timeRange === '30days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('30days')}
            >
              Last 30 Days
            </Button>
            <Button
              variant={timeRange === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('all')}
            >
              All Time
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      {!hasData ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Trend Data Available</h3>
              <p className="text-sm">
                Complete some Grad-CAM analyses to see trend charts. 
                {timeRange !== 'all' && ' Try selecting "All Time" to see if you have data in other time periods.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <TrendChart
                data={filteredData}
                metric="confidence"
                title="Prediction Confidence"
                color="#16a34a"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <TrendChart
                data={filteredData}
                metric="percent_affected"
                title="Percent Affected"
                color="#dc2626"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <TrendChart
                data={filteredData}
                metric="sym_lr"
                title="Left-Right Symmetry"
                color="#2563eb"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <TrendChart
                data={filteredData}
                metric="sym_tb"
                title="Top-Bottom Symmetry"
                color="#d97706"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Points Summary */}
      {hasData && (
        <Card>
          <CardHeader>
            <CardTitle>Data Points ({getTimeRangeLabel()})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredData.map((point, index) => (
                <div key={index} className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
                  <div className="font-medium">{point.date}</div>
                  <div className="flex gap-4 text-muted-foreground">
                    {point.confidence && (
                      <span>Confidence: {(point.confidence * 100).toFixed(1)}%</span>
                    )}
                    {point.percent_affected && (
                      <span>Affected: {(point.percent_affected * 100).toFixed(1)}%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrendAnalysis;
