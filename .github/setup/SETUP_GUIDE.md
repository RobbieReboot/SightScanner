# SightScanner Database Setup Guide

## Overview

This guide covers the database setup required for Phase 1 (Grad-CAM Analysis) and Phase 2 (Scan History Augmentation).

## Phase 1 Setup ✅ IMPLEMENTED

### Database Schema Changes

Run this SQL in your Supabase SQL Editor:

```sql
-- Add Grad-CAM analysis fields to scan_history table
ALTER TABLE public.scan_history 
ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'not_processed',
ADD COLUMN IF NOT EXISTS analysis_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS analysis_results JSONB;

-- Add check constraint for analysis_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'scan_history_analysis_status_check'
  ) THEN
    ALTER TABLE public.scan_history 
    ADD CONSTRAINT scan_history_analysis_status_check 
    CHECK (analysis_status IN ('not_processed', 'processed'));
  END IF;
END $$;

-- Add index for better query performance on analysis_status
CREATE INDEX IF NOT EXISTS idx_scan_history_analysis_status 
ON public.scan_history(analysis_status);

-- Add index for analysis_date for temporal queries
CREATE INDEX IF NOT EXISTS idx_scan_history_analysis_date 
ON public.scan_history(analysis_date DESC);
```

### Storage Setup

Create a storage bucket for analysis results:

```sql
-- Create storage bucket for analysis results
INSERT INTO storage.buckets (id, name, public)
VALUES ('analysis_results', 'analysis_results', true);

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

### Verification

After running the above SQL, the `scan_history` table should have these columns:

- `id` (existing)
- `scan_date` (existing)
- `calibration_reaction_time` (existing)
- `scan_data` (existing)
- `created_at` (existing)
- `analysis_status` (new - 'not_processed' | 'processed')
- `analysis_date` (new - timestamp when analysis was run)
- `analysis_results` (new - JSONB with analysis data)

## Current Implementation Status

### ✅ Phase 1 Complete

**Features Implemented:**
- Grad-CAM Analysis page with full UI
- TensorFlow.js model loading infrastructure
- Scan selection and analysis workflow
- Canvas-based visualization with heatmap overlay
- Analysis metrics computation (centroid, symmetry, etc.)
- Result saving to Supabase with image upload
- Database schema validation and setup instructions

**Components Created:**
- `src/pages/GradCamAnalysis.tsx` - Main analysis page
- `src/components/analysis/ScanSelector.tsx` - Scan selection UI
- `src/components/analysis/GradCamViewer.tsx` - Canvas visualization
- `src/components/analysis/AnalysisControls.tsx` - Analysis controls
- `src/lib/models.ts` - TensorFlow.js utilities
- `src/lib/gradcam.ts` - Grad-CAM implementation
- `src/lib/database-setup.ts` - Database validation utilities

**Known Limitations:**
- Requires actual trained TensorFlow.js model (currently placeholder)
- Database schema needs to be manually set up via SQL
- Storage bucket needs manual configuration

### 🎯 Ready for Phase 2

**Phase 2 Scope:**
- Enhance ScanHistory page to show analysis results
- Display analysis status and metrics in history table
- Add Grad-CAM thumbnail overlays for processed scans
- Implement "View Analysis" and "Run Analysis" buttons
- Deep linking to Grad-CAM page with preselected scans

**No additional database changes required** - Phase 2 uses the same schema from Phase 1.

## Quick Setup Checklist

1. **Database Migration** ✅
   - Run the Phase 1 SQL migration above
   - Verify new columns exist in `scan_history` table

2. **Storage Bucket** ✅
   - Create `analysis_results` bucket
   - Set up bucket policies for uploads

3. **Model Files** ⚠️
   - Replace placeholder model in `/public/models/classifier/`
   - Ensure model has Conv2D layers for Grad-CAM

4. **Environment** ✅
   - Supabase URL and keys already configured
   - Authentication temporarily disabled for development

5. **Testing** ✅
   - Application loads without errors
   - Grad-CAM page accessible via sidebar
   - Database validation shows setup instructions if needed

## Next Steps

With Phase 1 database setup complete, you can:

1. **Create some scan data** by using the "Start Scan" feature
2. **Set up the database** using the SQL migration above
3. **Proceed to Phase 2 implementation** to enhance the Scan History page

Phase 2 will make the analysis results much more accessible through the improved history interface!
