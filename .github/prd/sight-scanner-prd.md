# Sight Scanner PRD for Copilot.

## Comprehensive requirements for a SightScanner SPA application

### Technical Stack Requirements
Frontend Framework:

React 18.3.1 with TypeScript
Vite build tool
React Router DOM 6.26.2 for routing
Styling & UI:

Tailwind CSS with custom design system
shadcn/ui component library
Radix UI primitives for accessibility
Custom semantic color tokens in CSS variables (HSL format)
Backend & Database:

Supabase integration (Project ID: mfkujcmkrowdqqsyfnfs)
PostgreSQL database with Row Level Security (RLS)
Real-time capabilities via Supabase client
State Management:

React Query (TanStack Query 5.56.2) for server state
React hooks for local state management
Database Schema Requirements
scan_history table:


- id: uuid (PK, default: gen_random_uuid())
- scan_date: timestamp with time zone (default: now())
- calibration_reaction_time: real (not null)
- scan_data: jsonb (not null)
- created_at: timestamp with time zone (default: now())
RLS Policy: Allow all operations (public access)

### Core Application Features
1. Calibration System
perform 5-measurement reaction time calibrations.
Exact sequence: 3-2-1 countdown → "Get Ready" (2-4s random delay) → Red dot appears → User clicks → Record time → 500ms wait → Repeat
Calculate average reaction time for scan offset
Keyboard (Space/Enter) and mouse click support
Cancel functionality (Escape key)
Show the calibration in the middle of the screen. The red dot should appear in the center of the screen.


2. Visual Scanning System
Configurable grid overlay (optional)
Scanning dot that moves across screen in configurable patterns
Trail visualization when user holds space bar or mouse button
Continuous trail recording during button/key press
Real-time data collection with timestamps
Scan speed and direction controls

3. Settings Panel
Scan speed control
Scan direction options
Grid visibility toggle
Other scan parameters

4. Data Management
Save scan data to Supabase with calibration offset
Export scan data as JSON file
Scan history viewing with thumbnails
Scan replay functionality with scaling

5. Navigation & Routing
Dashboard as main entry point
Component-based navigation (no URL routing for scan screens)
History and replay views
Component Architecture Requirements
Main Components:

App.tsx - Root with providers and routing
Dashboard.tsx - Main navigation hub
CalibrationPage.tsx - Reaction time measurement
ScanScreen.tsx - Main scanning interface
ScanHistory.tsx - Historical scan data display
ScanReplay.tsx - Scan visualization playback
SettingsPanel.tsx - Configuration controls
Hooks:

useScanSettings.ts - Scan configuration state
use-toast.ts - Toast notifications
use-mobile.tsx - Mobile detection
Technical Implementation Details
Supabase Configuration:


const SUPABASE_URL = "https://mfkujcmkrowdqqsyfnfs.supabase.co"
const SUPABASE_PUBLISHABLE_KEY = [provided in client.ts]
Key Event Handling:

Space bar and mouse button for trail recording
Escape key for navigation/cancel
Real-time event listeners with proper cleanup
Data Structure:


interface ScanData {
  timestamp: number
  settings: ScanSettings
  gridData: Array<{x: number, y: number, timestamp: number}>
  screenWidth: number
  screenHeight: number
  dotSize: number
}
Design System:

HSL color variables in index.css
Semantic tokens (--primary, --secondary, etc.)
Responsive design with Tailwind utilities
Dark/light mode support via CSS variables
Performance Requirements:

Smooth 60fps scanning animation
Precise timestamp recording (Date.now())
Efficient canvas rendering for thumbnails
Proper memory cleanup for event listeners
This application provides a complete visual scanning assessment tool with calibration, data collection, storage, and analysis capabilities.