# Phase 4 – Segmentation Heatmap (Developer Tool)

## Scope
Add a Segmentation Heatmap feature as a developer tool. This uses a separate segmentation model to produce per-cell probability heatmaps, overlayed on the scan. Accessible from the left menu, but optionally hidden in production.

---

## Implementation Details

### 1. New Page and Route
- Create new page: `src/pages/SegmentationHeatmap.tsx`.
- Add left menu item: "Segmentation Heatmap" (guard with a `DEV_FEATURES` flag).
- Route: `/heatmap`.

---

### 2. Model Loading
- Place segmentation model in `/public/models/segmenter/model.json`.
- Load using existing `loadModel` utility from Phase 1:
```ts
const model = await loadModel('segmenter');
```

---

### 3. Data Input
- Allow user to select a scan from Supabase (similar to `<ScanSelector>` from Phase 1).
- Convert scan data into tensor `[1, gridHeight, gridWidth, 1]`.

---

### 4. Segmentation Inference
- Run model on input tensor:
```ts
const output = model.predict(input) as tf.Tensor;
```
- Expect output shape `[1, gridHeight, gridWidth, 1]` with probability values 0–1.

---

### 5. Heatmap Overlay
- Create `<HeatmapOverlay>` component in `src/components/analysis/HeatmapOverlay.tsx`.
- Render output probabilities as red transparency over the scan.
- Add intensity scaling slider (0–1) to adjust overlay opacity.

---

### 6. Optional Save
- Add “Save Heatmap” button to upload PNG overlay to Supabase storage.
- Save reference URL to `analysis_results.segmentation_map_url` (optional for dev).

---

### 7. Files to Create/Update
**New:**
- `src/pages/SegmentationHeatmap.tsx`
- `src/components/analysis/HeatmapOverlay.tsx`

**Updated:**
- Left menu component (conditionally add link to `/heatmap` if `DEV_FEATURES` is true).

---

### 8. Acceptance Criteria
- User can open Segmentation Heatmap page.
- Select scan from Supabase and run segmentation model.
- Probability map overlay appears over scan.
- Overlay opacity adjustable via slider.
- Optional: Saved heatmap appears in Scan History if stored.

---

### 9. Future Notes
- Could merge Grad-CAM and Segmentation overlays for comparative analysis.
- Allow export of segmentation data for offline analysis.
