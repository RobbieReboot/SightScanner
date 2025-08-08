# Phase 3 – Trend Analysis

## Scope
Implement a new Trend Analysis page to visualise how vision metrics from Grad-CAM analysis change over time. This phase builds on the stored `analysis_results` from Phases 1 and 2, displaying trends in a user-friendly chart format.

---

## Implementation Details

### 1. New Page and Route
- Create new page: `src/pages/TrendAnalysis.tsx`.
- Add left menu item: "Trend Analysis".
- Route: `/trends` → loads the new page.

---

### 2. Data Source
- Query Supabase `scan_history` table for processed scans only:
```ts
const { data, error } = await supabase
  .from('scan_history')
  .select('scan_date, analysis_results')
  .eq('analysis_status', 'processed')
  .order('scan_date', { ascending: true });
```

---

### 3. Metrics to Plot
From `analysis_results`:
- **Percent Affected** (`percent_affected`)
- **Confidence** (`confidence`)
- **Symmetry L-R** (`sym_lr`)
- **Symmetry T-B** (`sym_tb`)

---

### 4. Chart Implementation
- Use Recharts (preferred) or Chart.js for rendering.
- Create `<TrendChart>` component in `src/components/analysis/TrendChart.tsx`.
- For each metric, render a separate line chart with:
  - X-axis: `scan_date`
  - Y-axis: metric value
  - Tooltip with date and value
  - Legend

---

### 5. Filters
- Add time range filter buttons:
  - Last 7 days
  - Last 30 days
  - All time
- Implement filtering in frontend by comparing `scan_date`.

---

### 6. Files to Create/Update
**New:**
- `src/pages/TrendAnalysis.tsx`
- `src/components/analysis/TrendChart.tsx`

**Updated:**
- Left menu component (add link to `/trends`)

---

### 7. Acceptance Criteria
- User can navigate to Trend Analysis from left menu.
- Charts display metric trends over selected time range.
- Tooltips show exact values for each data point.
- Only processed scans appear in charts.

---

### 8. Future Notes
- Later integration: allow comparison between different users or datasets.
- Consider combining metrics into a single multi-line chart for better visual correlation.
- Could integrate smoothing or rolling averages for noisy data.
