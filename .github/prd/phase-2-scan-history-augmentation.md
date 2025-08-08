# Phase 2 – Scan History Augmentation

## Scope
Enhance the existing `ScanHistory` page to display AI analysis metadata and allow users to view saved Grad-CAM results without reprocessing. This will integrate the Phase 1 analysis output into the historical scan list, ensuring users can quickly access and review past results.

---

## Implementation Details

### 1. Supabase Data Integration
- Update Supabase query in `ScanHistory.tsx` to select new fields:
  - `analysis_status`
  - `analysis_date`
  - `analysis_results`

Example:
```ts
const { data, error } = await supabase
  .from('scan_history')
  .select('id, scan_date, calibration_reaction_time, scan_data, analysis_status, analysis_date, analysis_results')
  .order('scan_date', { ascending: false });
```

---

### 2. UI Changes to Scan History
- **New Column**: "Analysis" – shows:
  - Status: "Processed" or "Not processed"
  - Date of last analysis (if processed)
  - Predicted label + confidence (if processed)
- **Thumbnail Enhancement**:
  - If `analysis_results.grad_cam_map_url` exists, use it as the thumbnail image overlay.
- **Action Buttons**:
  - **View Scan**: Opens the stored scan and shows Grad-CAM overlay if processed.
  - **Run Analysis**: If `analysis_status = 'not_processed'`, links to `/gradcam` with that scan preselected.

---

### 3. Viewing Saved Analysis
- When a user clicks "View Scan" on a processed record:
  - Load scan data from Supabase.
  - Load stored `grad_cam_map_url` from Supabase storage.
  - Display both in a `<canvas>` with overlay applied.
  - Show metrics from `analysis_results` in a panel.

---

### 4. Deep Linking
- Add optional query parameter to `/gradcam` route:
  - Example: `/gradcam?scanId=abc123`
  - If present, auto-loads the scan in Grad-CAM page and displays results if already processed.

---

### 5. Files to Update
- `src/pages/ScanHistory.tsx`:
  - Update Supabase query.
  - Add "Analysis" column and enhanced thumbnail logic.
  - Add "Run Analysis" and "View Scan" buttons.
- `src/pages/GradCamAnalysis.tsx` (from Phase 1):
  - Accept optional `scanId` param from URL and load scan on mount.

---

### 6. Acceptance Criteria
- Scan History shows analysis status, label, and confidence for each record.
- Processed scans display Grad-CAM thumbnail overlay in history table.
- Clicking "View Scan" on a processed scan loads the stored Grad-CAM result without reprocessing.
- Clicking "Run Analysis" on an unprocessed scan preselects it in the Grad-CAM page.

---

### 7. Future Notes
- Later phases (Trend Analysis) will use the same Supabase query to gather metrics from `analysis_results`.
- Consider adding a filter to show only processed or unprocessed scans.
