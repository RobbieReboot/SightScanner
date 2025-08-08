# Phase 6 – Dynamic Grid Scaling & Responsive UI

## Scope
Update the application to support dynamic grid scaling so the Grad-CAM overlays, segmentation heatmaps, and scan rendering adapt automatically to varying screen sizes and configurable square sizes. Ensure the UI remains responsive and accurate regardless of the scan's original resolution.

---

## Implementation Details

### 1. Grid Calculation Logic
- Create a utility function in `src/lib/grid.ts`:
```ts
export function calculateGridDimensions(screenWidth: number, screenHeight: number, squareSize: number) {
  return {
    gridWidth: Math.floor(screenWidth / squareSize),
    gridHeight: Math.floor(screenHeight / squareSize)
  };
}
```
- Use this utility wherever a grid is drawn or processed (Grad-CAM, segmentation, base scan render).

---

### 2. Responsive Canvas Rendering
- All `<canvas>` components should:
  - Match display size to available container width/height.
  - Maintain aspect ratio of the original scan grid.
  - Redraw overlays when window size changes.

Example:
```ts
useEffect(() => {
  const handleResize = () => {
    // recalculate grid and redraw
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

---

### 3. Configurable Square Size
- Store square size in a config file or Supabase settings table.
- Pass square size as prop or context value to analysis components.
- Allow easy future addition of user preference for square size.

---

### 4. Overlay Scaling
- Heatmaps and overlays should be generated at **grid resolution**, then scaled to fit canvas display size.
- Avoid generating overlays at raw pixel resolution to improve performance.

---

### 5. Files to Create/Update
**New:**
- `src/lib/grid.ts` (grid calculation utility)

**Updated:**
- `GradCamViewer`, `HeatmapOverlay`, and any other canvas-rendering components to use `calculateGridDimensions` and redraw on resize.

---

### 6. Acceptance Criteria
- Changing square size in config updates grid calculations across the app.
- UI displays correctly scaled overlays on all screen sizes.
- Aspect ratio preserved for all scan displays.
- No performance issues when resizing the window.

---

### 7. Future Notes
- Could add zoom and pan functionality for detailed inspection of scan areas.
- Consider caching scaled overlays for very large scans to improve resize performance.
