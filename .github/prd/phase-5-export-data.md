# Phase 5 – Export Data

## Scope
Implement an Export Data feature that allows users to export processed scan data and analysis results in multiple formats: CSV, PNG, and ZIP. This enables offline storage, sharing, and further analysis of results.

---

## Implementation Details

### 1. New Page and Route
- Create new page: `src/pages/ExportData.tsx`.
- Add left menu item: "Export Data".
- Route: `/export`.

---

### 2. Data Selection UI
- Allow user to:
  - Choose date range (date pickers).
  - Select export format(s): CSV, PNG, ZIP.
  - Select metrics to include (checkboxes: all by default).

---

### 3. Data Retrieval
- Query Supabase for processed scans in selected date range:
```ts
const { data, error } = await supabase
  .from('scan_history')
  .select('scan_date, analysis_results, scan_data')
  .eq('analysis_status', 'processed')
  .gte('scan_date', startDate)
  .lte('scan_date', endDate);
```

---

### 4. Export Formats
#### 4.1 CSV
- Flatten `analysis_results` into tabular form.
- Include scan_date and each metric as a column.
- Use `papaparse` or similar library to generate CSV.
- Trigger file download.

#### 4.2 PNG
- For each selected scan, render Grad-CAM overlay to `<canvas>` and export via `canvas.toDataURL()`.
- Download as `{scan_date}_{scan_id}.png`.

#### 4.3 ZIP
- Use `JSZip` to package:
  - All CSV data.
  - All PNG overlays.
  - Optional JSON file containing raw `analysis_results`.

---

### 5. Files to Create/Update
**New:**
- `src/pages/ExportData.tsx`
- `src/components/analysis/ExportPanel.tsx`

**Updated:**
- Left menu component (add link to `/export`).

---

### 6. Acceptance Criteria
- User can open Export Data page.
- Select date range, formats, and metrics.
- Download file(s) successfully in chosen formats.
- ZIP export contains correct files and structure.

---

### 7. Future Notes
- Could allow direct upload of export package to cloud storage or external systems.
- Add preset export configurations for frequent use.
