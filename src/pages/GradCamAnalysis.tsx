import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as tf from '@tensorflow/tfjs';

// Components
import ScanSelector from '@/components/analysis/ScanSelector';
import GradCamViewer from '@/components/analysis/GradCamViewer';
import AnalysisControls from '@/components/analysis/AnalysisControls';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Utilities
import { loadModel, preprocessScanData, disposeTensors } from '@/lib/models';
import { computeGradCAM, heatmapToImageData } from '@/lib/gradcam';
import { checkPhase1DatabaseStatus, getPhase1SetupInstructions } from '@/lib/database-setup';
import { AlertCircle, Database, ExternalLink, ArrowLeft } from 'lucide-react';

interface ScanData {
  id: string;
  scan_date: string;
  calibration_reaction_time: number;
  scan_data: any;
  analysis_status: 'not_processed' | 'processed';
  analysis_date?: string;
  analysis_results?: any;
}

interface AnalysisResults {
  grad_cam_map_url: string;
  predicted_label: string;
  confidence: number;
  percent_affected: number;
  centroid: { x: number; y: number };
  lcc_size: number;
  sym_lr: number;
  sym_tb: number;
}

interface GradCamAnalysisProps {
  scanId?: string | null;
  onBack?: () => void;
}

const GradCamAnalysis = ({ scanId, onBack }: GradCamAnalysisProps) => {
  // State
  const [selectedScan, setSelectedScan] = useState<ScanData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentHeatmap, setCurrentHeatmap] = useState<tf.Tensor2D | null>(null);
  const [currentResults, setCurrentResults] = useState<AnalysisResults | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [databaseStatus, setDatabaseStatus] = useState<{
    isSetup: boolean;
    error?: string;
    needsSetup?: boolean;
  } | null>(null);
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);

  const { toast } = useToast();

  // Check database setup on component mount
  useEffect(() => {
    const checkDatabase = async () => {
      const status = await checkPhase1DatabaseStatus();
      setDatabaseStatus(status);
      
      if (!status.isSetup) {
        toast({
          title: 'Database Setup Required',
          description: 'Phase 1 database schema needs to be configured',
          variant: 'destructive',
        });
      }
    };
    
    checkDatabase();
  }, [toast]);

  // Handle scan selection
  const handleScanSelect = useCallback((scan: ScanData) => {
    setSelectedScan(scan);
    setCurrentHeatmap(null);
    setCurrentResults(null);
    setAnalysisError(null);

    // If scan is already processed, load the results
    if (scan.analysis_status === 'processed' && scan.analysis_results) {
      setCurrentResults(scan.analysis_results);
    }
  }, []);

  // Auto-load scan if scanId is provided
  useEffect(() => {
    const loadScanById = async () => {
      if (scanId) {
        try {
          const { data, error } = await supabase
            .from('scan_history')
            .select('id, scan_date, calibration_reaction_time, scan_data, analysis_status, analysis_date, analysis_results')
            .eq('id', scanId)
            .single();

          if (error) throw error;

          if (data) {
            const scanData: ScanData = {
              ...data,
              analysis_status: data.analysis_status === 'completed' ? 'processed' : 'not_processed'
            };
            handleScanSelect(scanData);
          }
        } catch (error) {
          console.error('Error loading scan:', error);
          toast({
            title: 'Error',
            description: 'Failed to load the selected scan',
            variant: 'destructive',
          });
        }
      }
    };

    loadScanById();
  }, [scanId, handleScanSelect, toast]);

  // Run Grad-CAM Analysis
  const runAnalysis = useCallback(async () => {
    if (!selectedScan) {
      toast({
        title: 'Error',
        description: 'Please select a scan first',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setCurrentHeatmap(null);
    setCurrentResults(null);

    try {
      // Load model if not already loaded
      let currentModel = model;
      if (!currentModel) {
        toast({
          title: 'Loading Model',
          description: 'Loading TensorFlow.js classifier model...',
        });
        
        try {
          currentModel = await loadModel('classifier');
          setModel(currentModel);
        } catch (modelError) {
          throw new Error('Model not available. Please ensure a trained model is placed in /public/models/classifier/');
        }
      }

      // Preprocess scan data
      const { tensor, gridDimensions } = preprocessScanData(selectedScan.scan_data);

      // Run classifier to get prediction
      const prediction = currentModel.predict(tensor) as tf.Tensor2D;
      const predictionData = await prediction.data();
      
      // Get predicted class and confidence
      const maxIndex = predictionData.indexOf(Math.max(...Array.from(predictionData)));
      const confidence = predictionData[maxIndex];
      const predictedLabel = `Class ${maxIndex}`;

      // Run Grad-CAM
      const gradCamResult = await computeGradCAM(currentModel, tensor, maxIndex);

      // Store heatmap for visualization
      setCurrentHeatmap(gradCamResult.heatmap);

      // Prepare results
      const results: Omit<AnalysisResults, 'grad_cam_map_url'> = {
        predicted_label: predictedLabel,
        confidence,
        percent_affected: gradCamResult.metrics.percentAffected,
        centroid: gradCamResult.metrics.centroid,
        lcc_size: gradCamResult.metrics.lccSize,
        sym_lr: gradCamResult.metrics.symLR,
        sym_tb: gradCamResult.metrics.symTB,
      };

      setCurrentResults({ ...results, grad_cam_map_url: '' });

      // Clean up tensors
      disposeTensors(tensor, prediction);

      toast({
        title: 'Analysis Complete',
        description: 'Grad-CAM analysis finished successfully',
      });

    } catch (error) {
      console.error('Analysis failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setAnalysisError(errorMessage);
      
      toast({
        title: 'Analysis Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedScan, model, toast]);

  // Save results to database
  const saveResults = useCallback(async () => {
    if (!selectedScan || !currentResults || !currentHeatmap) {
      toast({
        title: 'Error',
        description: 'No analysis results to save',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Convert heatmap to image and upload to Supabase storage
      const canvas = document.createElement('canvas');
      const originalSize = currentHeatmap.shape;
      canvas.width = originalSize[1];
      canvas.height = originalSize[0];
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      const imageData = await heatmapToImageData(currentHeatmap, canvas.width, canvas.height);
      ctx.putImageData(imageData, 0, 0);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else throw new Error('Failed to create blob from canvas');
        }, 'image/png');
      });

      // Upload to Supabase storage
      const fileName = `gradcam_${selectedScan.id}_${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('analysis_results')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('analysis_results')
        .getPublicUrl(fileName);

      // Update scan record with analysis results
      const analysisResults: AnalysisResults = {
        ...currentResults,
        grad_cam_map_url: urlData.publicUrl
      };

      const { error: updateError } = await supabase
        .from('scan_history')
        .update({
          analysis_status: 'processed',
          analysis_date: new Date().toISOString(),
          analysis_results: analysisResults
        } as any)
        .eq('id', selectedScan.id);

      if (updateError) throw updateError;

      // Update local state
      setSelectedScan(prev => prev ? {
        ...prev,
        analysis_status: 'processed',
        analysis_date: new Date().toISOString(),
        analysis_results: analysisResults
      } : null);

      setCurrentResults(analysisResults);

      toast({
        title: 'Results Saved',
        description: 'Analysis results have been saved to the database',
      });

    } catch (error) {
      console.error('Save failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save results';
      
      toast({
        title: 'Save Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [selectedScan, currentResults, currentHeatmap, toast]);

  // Check if we can save results
  const canSave = Boolean(
    selectedScan && 
    currentResults && 
    currentHeatmap && 
    !isAnalyzing
  );

  const hasResults = Boolean(currentResults);

  // Setup instructions component
  const setupInstructions = getPhase1SetupInstructions();

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
          <h1 className="text-3xl font-bold">Grad-CAM Analysis</h1>
          <p className="text-muted-foreground">
            Run neural network analysis on your scan data to identify visual attention patterns
          </p>
        </div>
      </div>

      {/* Database Setup Alert */}
      {databaseStatus && !databaseStatus.isSetup && (
        <Alert variant="destructive">
          <Database className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <strong>Database Setup Required:</strong> {databaseStatus.error}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSetupInstructions(!showSetupInstructions)}
            >
              Show Setup Instructions
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Setup Instructions */}
      {showSetupInstructions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Phase 1 Database Setup Instructions
            </CardTitle>
            <CardDescription>
              Follow these steps to configure your Supabase database for Grad-CAM analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Steps:</h4>
              <ol className="list-decimal list-inside space-y-1">
                {setupInstructions.instructions.map((instruction, index) => (
                  <li key={index} className="text-sm">{instruction}</li>
                ))}
              </ol>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Migration SQL:</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                {setupInstructions.migrationSql}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Storage Bucket SQL:</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                {setupInstructions.storageBucketSql}
              </pre>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open Supabase Dashboard
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  const status = await checkPhase1DatabaseStatus();
                  setDatabaseStatus(status);
                  if (status.isSetup) {
                    setShowSetupInstructions(false);
                    toast({
                      title: 'Database Ready',
                      description: 'Phase 1 database setup detected successfully',
                    });
                  }
                }}
              >
                Check Setup Status
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Scan Selection */}
        <div className="lg:col-span-1">
          <ScanSelector
            selectedScan={selectedScan}
            onScanSelect={handleScanSelect}
          />
        </div>

        {/* Right Column - Viewer and Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Grad-CAM Viewer */}
          <GradCamViewer
            scanData={selectedScan?.scan_data}
            analysisResults={currentResults}
            heatmap={currentHeatmap}
            isAnalyzing={isAnalyzing}
          />

          {/* Analysis Controls */}
          <AnalysisControls
            selectedScan={selectedScan}
            isAnalyzing={isAnalyzing}
            onRunAnalysis={runAnalysis}
            onSaveResults={saveResults}
            hasResults={hasResults}
            canSave={canSave}
            analysisError={analysisError}
          />
        </div>
      </div>
    </div>
  );
};

export default GradCamAnalysis;
