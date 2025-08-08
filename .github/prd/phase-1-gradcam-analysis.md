# Phase 1 – Grad-CAM Analysis Core

## Scope
Implement the Grad-CAM Analysis feature as a new page in the SightScanner app. This page lets the user select a stored scan from Supabase, run Grad-CAM inference locally in the browser using TensorFlow.js, overlay the results, and save both metrics and visual output back to Supabase for persistence.

This phase also lays the groundwork for later phases by:
- Adding new Supabase fields for analysis results.
- Creating reusable TFJS model-loading utilities.
- Creating a consistent data shape for AI metrics.

---

## Implementation Details

### 1. Supabase Table Changes
Update `scan_history` table to include:

| Column              | Type        | Description |
|---------------------|------------|-------------|
| `analysis_status`   | text / enum | `'not_processed' | 'processed'` |
| `analysis_date`     | timestamp   | When analysis was last run |
| `analysis_results`  | jsonb       | Full analysis payload (see structure below) |

**analysis_results JSON structure:**
```json
{
  "grad_cam_map_url": "string",
  "predicted_label": "string",
  "confidence": 0.95,
  "percent_affected": 0.27,
  "centroid": { "x": 12.3, "y": 8.5 },
  "lcc_size": 42,
  "sym_lr": 0.91,
  "sym_tb": 0.87
}
```

---

### 2. Routing & Menu
- Add a **new menu item** in the left-hand nav: `Grad-CAM Analysis`.
- Route `/gradcam` → new page component: `src/pages/GradCamAnalysis.tsx`.

---

### 3. Page Layout (`GradCamAnalysis.tsx`)
**Components:**
- `<ScanSelector>`  
  - Lists scans from `scan_history` (Supabase).
  - Displays small thumbnail previews (reuse logic from `ScanHistory`).
  - Allows single selection.
- `<GradCamViewer>`  
  - Displays selected scan in a `<canvas>`.
  - Shows overlay after analysis.
  - Shows numeric metrics (percent affected, centroid, etc.).
- `<AnalysisControls>`  
  - “Run Analysis” button (disabled until scan selected).
  - “Save Results” button (disabled until analysis complete).

---

### 4. TFJS Model Utilities
Create `src/lib/models.ts`:
```ts
import * as tf from '@tensorflow/tfjs';

export async function loadModel(modelName: string) {
  const path = `/models/${modelName}/model.json';
  return await tf.loadLayersModel(path);
}
```
- Use latest TFJS format.
- Place classifier model in `/public/models/classifier/`.

---

### 5. Grad-CAM Implementation
Create `src/lib/gradcam.ts`:
- Accepts `tf.LayersModel`, scan grid tensor, and target class index.
- Computes Grad-CAM heatmap (normalised 0-1).
- Returns:
  - Heatmap tensor (`[gridHeight, gridWidth]`).
  - Metrics (percent affected, centroid, LCC size, symmetry scores).

---

### 6. Analysis Flow
1. User selects scan → `selectedScan` state.
2. On “Run Analysis”:
   - Load TFJS classifier (`loadModel('classifier')`).
   - Convert scan data to tensor `[1, gridHeight, gridWidth, 1]`.
   - Run classifier → get predicted label + confidence.
   - Run Grad-CAM utility → get heatmap + metrics.
   - Overlay heatmap on canvas.
3. On “Save Results”:
   - Upload heatmap PNG to Supabase storage → get `grad_cam_map_url`.
   - Save JSON payload to `analysis_results` and update `analysis_status` to `'processed'`.

---

### 7. Files to Create/Update
**New:**
- `src/pages/GradCamAnalysis.tsx`
- `src/components/analysis/ScanSelector.tsx`
- `src/components/analysis/GradCamViewer.tsx`
- `src/components/analysis/AnalysisControls.tsx`
- `src/lib/models.ts`
- `src/lib/gradcam.ts`

**Updated:**
- `src/App.tsx` (router entry for `/gradcam`)
- Left menu component (add link to Grad-CAM Analysis)

---

### 8. Acceptance Criteria
- User can select any scan from Supabase.
- Clicking “Run Analysis” runs model locally and overlays Grad-CAM output.
- Metrics are shown below the image.
- Clicking “Save Results” stores analysis in Supabase and updates the scan record.
- Reloading the page and selecting a processed scan still shows saved output without rerunning.

---

### 9. Future Notes
- Keep model loading in a separate hook so we can later replace it with API calls.
- Save metrics in a consistent shape for use in Phase 3 (Trend Analysis).
- Include `TODO` comments for batch processing and web worker support.
