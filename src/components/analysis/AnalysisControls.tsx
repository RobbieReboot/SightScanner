import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Save, Play, AlertCircle, CheckCircle } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';

interface AnalysisControlsProps {
  selectedScan: any;
  isAnalyzing: boolean;
  onRunAnalysis: () => Promise<void>;
  onSaveResults: () => Promise<void>;
  hasResults: boolean;
  canSave: boolean;
  analysisError?: string | null;
}

const AnalysisControls = ({
  selectedScan,
  isAnalyzing,
  onRunAnalysis,
  onSaveResults,
  hasResults,
  canSave,
  analysisError
}: AnalysisControlsProps) => {
  const [modelLoadProgress, setModelLoadProgress] = useState(0);

  const getAnalysisStatus = () => {
    if (!selectedScan) return 'no-scan';
    if (selectedScan.analysis_status === 'processed') return 'processed';
    if (isAnalyzing) return 'analyzing';
    if (hasResults) return 'results-ready';
    return 'ready';
  };

  const getStatusBadge = () => {
    const status = getAnalysisStatus();
    
    switch (status) {
      case 'no-scan':
        return <Badge variant="secondary">No Scan Selected</Badge>;
      case 'processed':
        return <Badge variant="default" className="bg-green-600">Previously Analyzed</Badge>;
      case 'analyzing':
        return <Badge variant="secondary">Analyzing...</Badge>;
      case 'results-ready':
        return <Badge variant="default" className="bg-blue-600">Results Ready</Badge>;
      case 'ready':
        return <Badge variant="outline">Ready to Analyze</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getStatusDescription = () => {
    const status = getAnalysisStatus();
    
    switch (status) {
      case 'no-scan':
        return 'Please select a scan from the list to begin analysis.';
      case 'processed':
        return 'This scan has been previously analyzed. You can re-run the analysis or view the saved results.';
      case 'analyzing':
        return 'Running Grad-CAM analysis on the selected scan. This may take a few moments.';
      case 'results-ready':
        return 'Analysis complete! You can now save the results to the database.';
      case 'ready':
        return 'Ready to run Grad-CAM analysis on the selected scan.';
      default:
        return '';
    }
  };

  const handleRunAnalysis = async () => {
    try {
      await onRunAnalysis();
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  const handleSaveResults = async () => {
    try {
      await onSaveResults();
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Analysis Controls
        </CardTitle>
        <CardDescription>
          Run Grad-CAM analysis and save results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            {getStatusBadge()}
          </div>
          <p className="text-sm text-muted-foreground">
            {getStatusDescription()}
          </p>
        </div>

        {/* Progress (only shown during analysis) */}
        {isAnalyzing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Analysis Progress</span>
              <span>{Math.round(modelLoadProgress)}%</span>
            </div>
            <Progress value={modelLoadProgress} className="w-full" />
            <p className="text-xs text-muted-foreground">
              Loading model and computing gradients...
            </p>
          </div>
        )}

        {/* Error Alert */}
        {analysisError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{analysisError}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {hasResults && !analysisError && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Analysis completed successfully! Review the results and save to database.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleRunAnalysis}
            disabled={!selectedScan || isAnalyzing}
            className="w-full"
            size="lg"
          >
            <Play className="h-4 w-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
          </Button>

          <Button
            onClick={handleSaveResults}
            disabled={!canSave || isAnalyzing}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Results
          </Button>
        </div>

        {/* Scan Info */}
        {selectedScan && (
          <div className="pt-4 border-t space-y-2">
            <div className="text-sm font-medium">Selected Scan</div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Date: {new Date(selectedScan.scan_date).toLocaleDateString()}</div>
              <div>Reaction Time: {selectedScan.calibration_reaction_time}ms</div>
              {selectedScan.scan_data.trails && (
                <div>Trails: {selectedScan.scan_data.trails.length}</div>
              )}
              {selectedScan.analysis_date && (
                <div className="text-green-600">
                  Last Analyzed: {new Date(selectedScan.analysis_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Model Info */}
        <div className="pt-4 border-t space-y-2">
          <div className="text-sm font-medium">Model Information</div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>TensorFlow.js Version: {tf.version.tfjs}</div>
            <div>Backend: {tf.getBackend()}</div>
            <div>Memory: {Math.round(tf.memory().numBytes / 1024 / 1024)}MB</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalysisControls;
