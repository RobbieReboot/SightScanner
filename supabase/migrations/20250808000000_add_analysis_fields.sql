-- Add Grad-CAM analysis fields to scan_history table
ALTER TABLE public.scan_history 
ADD COLUMN analysis_status TEXT DEFAULT 'not_processed',
ADD COLUMN analysis_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN analysis_results JSONB;

-- Add check constraint for analysis_status
ALTER TABLE public.scan_history 
ADD CONSTRAINT scan_history_analysis_status_check 
CHECK (analysis_status IN ('not_processed', 'processed'));

-- Add index for better query performance on analysis_status
CREATE INDEX idx_scan_history_analysis_status ON public.scan_history(analysis_status);

-- Add index for analysis_date for temporal queries
CREATE INDEX idx_scan_history_analysis_date ON public.scan_history(analysis_date DESC);
