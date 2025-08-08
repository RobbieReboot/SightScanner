# Supabase Setup for Phase 1 - Grad-CAM Analysis

## Database Changes Required

Run the following migration to add analysis fields to the scan_history table:

```sql
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
```

## Storage Bucket Required

Create a storage bucket named `analysis_results` in your Supabase project:

1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `analysis_results`
3. Set it to public if you want the heatmap images to be publicly accessible
4. Configure appropriate policies for file uploads

## Bucket Policies

```sql
-- Allow authenticated users to upload analysis result images
CREATE POLICY "Allow upload analysis results" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'analysis_results');

-- Allow public read access to analysis result images
CREATE POLICY "Allow public read analysis results" ON storage.objects
FOR SELECT USING (bucket_id = 'analysis_results');

-- Allow authenticated users to delete their own analysis results
CREATE POLICY "Allow delete own analysis results" ON storage.objects
FOR DELETE USING (bucket_id = 'analysis_results');
```

## Model Requirements

Place a trained TensorFlow.js model in `/public/models/classifier/`:
- `model.json` - Model architecture and metadata
- Weight files (e.g., `group1-shard1of1.bin`)

The model should:
- Accept input shape `[batch_size, height, width, 1]` (grayscale grid data)
- Output classification probabilities
- Contain at least one Conv2D layer for Grad-CAM analysis
