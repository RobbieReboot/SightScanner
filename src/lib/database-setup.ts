import { supabase } from '@/integrations/supabase/client';

/**
 * Database setup utility for Phase 1 - Grad-CAM Analysis
 * This checks if the required schema is in place and provides setup instructions
 */

export const PHASE_1_MIGRATION_SQL = `
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
`;

/**
 * Check if Phase 1 database schema is properly set up
 */
export async function checkPhase1DatabaseStatus() {
  try {
    // Try to select the new analysis fields to see if they exist
    const { data, error } = await supabase
      .from('scan_history')
      .select('id, analysis_status, analysis_date, analysis_results')
      .limit(1);

    if (error) {
      console.error('Phase 1 schema check failed:', error);
      return { 
        isSetup: false, 
        error: 'Analysis fields not found in scan_history table',
        needsSetup: true,
        migrationSql: PHASE_1_MIGRATION_SQL
      };
    }

    console.log('✅ Phase 1 database schema is properly configured');
    return { 
      isSetup: true, 
      message: 'Phase 1 database schema is properly configured' 
    };

  } catch (error) {
    console.error('Database check error:', error);
    return { 
      isSetup: false, 
      error: `Database check failed: ${error}`,
      needsSetup: true,
      migrationSql: PHASE_1_MIGRATION_SQL
    };
  }
}

/**
 * Get setup instructions for Phase 1 database
 */
export function getPhase1SetupInstructions() {
  return {
    title: 'Phase 1 Database Setup Required',
    instructions: [
      '1. Open your Supabase dashboard',
      '2. Go to the SQL Editor',
      '3. Run the migration SQL provided below',
      '4. Create a storage bucket named "analysis_results" in Storage',
      '5. Set appropriate bucket policies for file uploads'
    ],
    migrationSql: PHASE_1_MIGRATION_SQL,
    storageBucketSql: `
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
    `
  };
}
