import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Brain, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import HeatmapOverlay from '@/components/analysis/HeatmapOverlay';
import { format } from 'date-fns';
import * as tf from '@tensorflow/tfjs';

interface ScanRecord {
  id: string;
  scan_date: string;
  scan_data: any;
  calibration_reaction_time: number;
}

interface SegmentationHeatmapProps {
  onBack?: () => void;
}

const SegmentationHeatmap = ({ onBack }: SegmentationHeatmapProps) => {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [segmentationData, setSegmentationData] = useState<number[][]>([]);
  const [intensity, setIntensity] = useState(0.5);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load available scans
  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    try {
      const { data, error } = await supabase
        .from('scan_history')
        .select('id, scan_date, scan_data, calibration_reaction_time')
        .order('scan_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setScans(data || []);
    } catch (err) {
      console.error('Error loading scans:', err);
      toast({
        title: 'Error',
        description: 'Failed to load scan history',
        variant: 'destructive',
      });
    }
  };

  const loadModel = async () => {
    if (model) return model;

    try {
      setIsLoadingModel(true);
      setError(null);
      
      // Load segmentation model from public directory
      const loadedModel = await tf.loadLayersModel('/models/segmenter/model.json');
      setModel(loadedModel);
      
      toast({
        title: 'Model Loaded',
        description: 'Segmentation model loaded successfully',
      });
      
      return loadedModel;
    } catch (err) {
      console.error('Error loading segmentation model:', err);
      const errorMsg = 'Failed to load segmentation model. Make sure model files are available.';
      setError(errorMsg);
      toast({
        title: 'Model Error',
        description: errorMsg,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoadingModel(false);
    }
  };

  const runSegmentation = async (scan: ScanRecord) => {
    if (!scan?.scan_data?.trails) {
      toast({
        title: 'Invalid Data',
        description: 'Selected scan does not contain valid trail data',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Load model if not already loaded
      const segmentationModel = await loadModel();
      if (!segmentationModel) return;

      // Get grid dimensions from scan data
      const gridDimensions = scan.scan_data.gridDimensions || {
        cols: Math.floor(scan.scan_data.screenDimensions.width / 40),
        rows: Math.floor(scan.scan_data.screenDimensions.height / 40),
      };

      console.log('Grid dimensions:', gridDimensions);
      console.log('Trail data:', scan.scan_data.trails?.length, 'trails');

      // Convert trail data to grid tensor
      const gridData = convertTrailsToGrid(scan.scan_data.trails, gridDimensions);
      
      console.log('Grid data shape:', gridData.length, 'x', gridData[0]?.length);
      
      // Flatten the 2D grid data for tensor creation
      const flattenedData: number[] = [];
      for (let i = 0; i < gridDimensions.rows; i++) {
        for (let j = 0; j < gridDimensions.cols; j++) {
          flattenedData.push(gridData[i][j]);
        }
      }
      
      console.log('Flattened data length:', flattenedData.length, 'expected:', gridDimensions.rows * gridDimensions.cols);
      
      // Create input tensor [1, height, width, 1]
      const inputTensor = tf.tensor4d(flattenedData, [1, gridDimensions.rows, gridDimensions.cols, 1]);

      console.log('Input tensor shape:', inputTensor.shape);

      // Run segmentation inference
      const output = segmentationModel.predict(inputTensor) as tf.Tensor;
      const outputData = await output.data();

      // Convert output to 2D array for visualization
      const segmentationMatrix: number[][] = [];
      for (let i = 0; i < gridDimensions.rows; i++) {
        const row: number[] = [];
        for (let j = 0; j < gridDimensions.cols; j++) {
          const index = i * gridDimensions.cols + j;
          row.push(outputData[index]);
        }
        segmentationMatrix.push(row);
      }

      setSegmentationData(segmentationMatrix);

      toast({
        title: 'Segmentation Complete',
        description: 'Heatmap generated successfully',
      });

      // Cleanup tensors
      inputTensor.dispose();
      output.dispose();

    } catch (err) {
      console.error('Error running segmentation:', err);
      toast({
        title: 'Segmentation Error',
        description: `Failed to generate segmentation: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const convertTrailsToGrid = (trails: Array<Array<{ x: number; y: number }>>, gridDimensions: { cols: number; rows: number }) => {
    // Initialize grid with zeros
    const grid = Array(gridDimensions.rows).fill(0).map(() => Array(gridDimensions.cols).fill(0));

    // Check if trails exist and are valid
    if (!trails || !Array.isArray(trails)) {
      console.warn('No valid trails data found');
      return grid;
    }

    // Mark cells where trails passed through
    trails.forEach(trail => {
      if (!trail || !Array.isArray(trail)) return;
      
      trail.forEach(point => {
        if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') return;
        
        const gridX = Math.floor(point.x / 40); // Assuming 40px grid size
        const gridY = Math.floor(point.y / 40);
        
        if (gridX >= 0 && gridX < gridDimensions.cols && gridY >= 0 && gridY < gridDimensions.rows) {
          grid[gridY][gridX] = 1; // Mark as active
        }
      });
    });

    return grid;
  };

  const handleScanSelect = (scanId: string) => {
    const scan = scans.find(s => s.id === scanId);
    if (scan) {
      setSelectedScan(scan);
      setSegmentationData([]); // Clear previous results
    }
  };

  const handleRunSegmentation = () => {
    if (selectedScan) {
      runSegmentation(selectedScan);
    }
  };

  const saveHeatmap = async () => {
    if (!selectedScan || !segmentationData.length) return;

    try {
      // Create canvas and draw heatmap
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = segmentationData[0].length * 10; // Scale up for visibility
      canvas.height = segmentationData.length * 10;

      // Draw heatmap
      segmentationData.forEach((row, y) => {
        row.forEach((value, x) => {
          const alpha = value * intensity;
          ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
          ctx.fillRect(x * 10, y * 10, 10, 10);
        });
      });

      // Convert to blob and upload
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const fileName = `segmentation_${selectedScan.id}_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('analysis-results')
          .upload(fileName, blob);

        if (uploadError) {
          throw uploadError;
        }

        toast({
          title: 'Heatmap Saved',
          description: 'Segmentation heatmap saved successfully',
        });
      }, 'image/png');

    } catch (err) {
      console.error('Error saving heatmap:', err);
      toast({
        title: 'Save Error',
        description: 'Failed to save heatmap',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8" />
              Segmentation Heatmap
            </h1>
            <p className="text-muted-foreground">
              Generate probability heatmaps using segmentation model
            </p>
          </div>
        </div>
        <Badge variant="secondary">Developer Tool</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <div className="space-y-6">
          {/* Model Status */}
          <Card>
            <CardHeader>
              <CardTitle>Model Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Segmentation Model</span>
                <Badge variant={model ? 'default' : 'secondary'}>
                  {model ? 'Loaded' : 'Not Loaded'}
                </Badge>
              </div>
              
              {!model && !isLoadingModel && (
                <Button onClick={loadModel} className="w-full">
                  Load Model
                </Button>
              )}
              
              {isLoadingModel && (
                <Button disabled className="w-full">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading Model...
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Scan Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Scan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select onValueChange={handleScanSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a scan to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {scans.map((scan) => (
                    <SelectItem key={scan.id} value={scan.id}>
                      {format(new Date(scan.scan_date), 'MMM dd, yyyy HH:mm')} - 
                      RT: {scan.calibration_reaction_time}ms
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedScan && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <strong>Selected:</strong> {format(new Date(selectedScan.scan_date), 'PPP')}
                  </div>
                  <Button 
                    onClick={handleRunSegmentation}
                    disabled={!model || isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Run Segmentation'
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Heatmap Controls */}
          {segmentationData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Heatmap Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Intensity: {(intensity * 100).toFixed(0)}%
                  </label>
                  <Slider
                    value={[intensity]}
                    onValueChange={(value) => setIntensity(value[0])}
                    max={1}
                    min={0}
                    step={0.1}
                    className="mt-2"
                  />
                </div>
                
                <Button onClick={saveHeatmap} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Save Heatmap
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Heatmap Display */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Segmentation Visualization</CardTitle>
            </CardHeader>
            <CardContent className="h-[600px]">
              {selectedScan && segmentationData.length > 0 ? (
                <HeatmapOverlay
                  scanData={selectedScan.scan_data}
                  segmentationData={segmentationData}
                  intensity={intensity}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  {selectedScan ? (
                    'Run segmentation to generate heatmap'
                  ) : (
                    'Select a scan to begin'
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SegmentationHeatmap;
