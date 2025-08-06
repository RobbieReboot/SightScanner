-- Create scan_history table to store all scan data
CREATE TABLE public.scan_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  calibration_reaction_time REAL NOT NULL,
  scan_data JSONB NOT NULL, -- Store the complete scan result data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (making it public for now since no auth is implemented)
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (can be restricted later with auth)
CREATE POLICY "Allow all operations on scan_history" 
ON public.scan_history 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add index for better query performance on scan_date
CREATE INDEX idx_scan_history_scan_date ON public.scan_history(scan_date DESC);