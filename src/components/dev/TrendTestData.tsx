import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database, Plus } from 'lucide-react';
import { subDays } from 'date-fns';

const generateSampleAnalysisData = () => {
  const predictions = ['normal', 'anomaly', 'suspicious'];
  const prediction = predictions[Math.floor(Math.random() * predictions.length)];
  
  return {
    prediction: {
      label: prediction,
      confidence: parseFloat((0.7 + Math.random() * 0.3).toFixed(3)), // 70-100% confidence, rounded
    },
    grad_cam_map_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // 1x1 transparent PNG
    metrics: {
      peak_intensity: parseFloat((Math.random() * 2.0).toFixed(3)),
      focus_area: parseFloat((Math.random() * 100).toFixed(3)),
      percent_affected: parseFloat((Math.random() * 0.5).toFixed(3)), // 0-50% affected
      sym_lr: parseFloat((Math.random() * 2.0 - 1.0).toFixed(3)), // -1 to 1
      sym_tb: parseFloat((Math.random() * 2.0 - 1.0).toFixed(3)), // -1 to 1
    },
  };
};

const generateSampleScanData = () => ({
  timestamp: new Date().toISOString(),
  settings: {
    gridSize: 40,
    scanDirection: 'alternating',
    scanSpeed: 100,
    showTrail: true,
    trailColor: '#ef4444',
  },
  trails: [
    [
      { x: 400, y: 300 },
      { x: 450, y: 300 },
      { x: 500, y: 300 },
    ],
  ],
  screenDimensions: { width: 1920, height: 1080 },
  gridDimensions: { cols: 48, rows: 27 },
  reactionTimeOffset: parseFloat((150 + Math.random() * 100).toFixed(2)),
  // Add analysis results within scan_data
  analysis: {
    prediction: {
      label: Math.random() > 0.7 ? 'Abnormal' : 'Normal',
      confidence: parseFloat((60 + Math.random() * 35).toFixed(2)), // 60-95% confidence
    },
    metrics: {
      percent_affected: parseFloat((Math.random() * 15).toFixed(2)), // 0-15% affected
      sym_lr: parseFloat((0.5 + Math.random() * 2).toFixed(2)), // 0.5-2.5 symmetry
      sym_tb: parseFloat((0.5 + Math.random() * 2).toFixed(2)), // 0.5-2.5 symmetry
    },
  },
});

interface TrendTestDataProps {
  onClose: () => void;
}

const TrendTestData = ({ onClose }: TrendTestDataProps) => {
  const { toast } = useToast();

  const generateTestScans = async (count: number) => {
    try {
      const scans = [];
      
      for (let i = 0; i < count; i++) {
        const daysAgo = Math.floor(Math.random() * 60); // Random date within last 60 days
        const scanDate = subDays(new Date(), daysAgo);
        
        const scanData = generateSampleScanData();
        
        scans.push({
          scan_date: scanDate.toISOString(),
          calibration_reaction_time: Math.round(150 + Math.random() * 100),
          scan_data: scanData,
        });
      }

      console.log('Attempting to insert scans:', scans);

      const { data, error } = await supabase
        .from('scan_history')
        .insert(scans)
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Successfully inserted:', data);

      toast({
        title: 'Success',
        description: `Generated ${count} sample scans with analysis data`,
      });
    } catch (error: any) {
      console.error('Error generating test data:', error);
      toast({
        title: 'Error',
        description: `Failed to generate test data: ${error.message || error}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Trend Analysis Test Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Generate sample scan data with analysis results to test the trend analysis functionality.
        </p>
        
        <div className="flex flex-col gap-2">
          <Button 
            onClick={() => generateTestScans(5)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Generate 5 Sample Scans
          </Button>
          
          <Button 
            onClick={() => generateTestScans(15)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Generate 15 Sample Scans
          </Button>
        </div>

        <div className="pt-4 border-t">
          <Button variant="ghost" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrendTestData;
