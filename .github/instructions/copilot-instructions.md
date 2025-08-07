# SightScanner - AI Coding Agent Instructions

## Project Overview
This is a modern React + TypeScript + Vite SPA following current best practices with React 19 and Vite 7. The project uses a minimal, clean architecture focused on developer experience and performance.

## Architecture & Structure
- **Entry Point**: `src/main.tsx` → `src/App.tsx` (standard React 19 pattern with `createRoot`)
- **Styling**: Component-scoped CSS files (e.g., `App.css`) + global styles (`index.css`)
- **Assets**: Static assets in `public/` (referenced as `/file.ext`), component assets in `src/assets/`
- **TypeScript Config**: Split configuration using project references (`tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`)

## Development Workflow
```bash
# Development server (with HMR)
npm run dev              # Starts on http://localhost:5173/

# Production build
npm run build            # TypeScript compilation + Vite build

# Linting
npm run lint             # ESLint with TypeScript + React rules

# Preview production build
npm run preview
```

## Key Conventions & Patterns

### TypeScript Configuration
- Uses **project references** for build optimization
- **Strict mode** enabled with additional safety checks (`noUncheckedSideEffectImports`, `erasableSyntaxOnly`)
- **Bundler module resolution** for modern import patterns
- **`verbatimModuleSyntax`** enforces explicit import/export syntax

### ESLint Setup
- Modern flat config (`eslint.config.js`) with TypeScript ESLint v8
- **React Hooks** + **React Refresh** rules for Vite HMR
- **Global ignores** for `dist/` directory
- Targets `**/*.{ts,tsx}` files specifically

### Import Patterns
```tsx
// Public assets (from public/ folder)
import viteLogo from '/vite.svg'

// Component assets (from src/assets/)
import reactLogo from './assets/react.svg'

// Components use .tsx extension in imports
import App from './App.tsx'
```

### Component Structure
- Functional components with hooks (React 19 patterns)
- CSS imports alongside component files
- Assets referenced relatively or from public root

## Critical Dependencies
- **React 19.1.0** with new JSX transform
- **Vite 7.0.4** requiring Node.js ≥20.19.0 or ≥22.12.0
- **TypeScript ~5.8.3** with strict project references
- **ESLint 9.x** with flat config format

## Node.js Version Requirement
This project requires **Node.js ≥20.19.0** or **≥22.12.0** due to Vite 7.x dependencies. Use `nvm` to manage versions if needed.

## Development Notes
- **HMR** works out of the box for `.tsx` files and CSS
- **TypeScript errors** appear in both terminal and editor
- **Asset references** use different paths for public vs src assets
- **Build output** goes to `dist/` (ignored by ESLint and git)
- **Environment** NOTE you are working on a Windows 10 machine, ensure paths and scripts are compatible with Windows conventions, ensure all tools used are compatible with Windows, especially regarding path handling and script execution.
- **Environment** ALWAYS navigate to the project folder to ensure commands run in the correct context, use `cd path/to/project` before running any npm scripts.
- **PATH** the SPA Path is C:\projects\personal\SightScanner\sight-scanner, ensure you are in this directory when running commands.

- WHENEVER YOU START A NEW TERMINAL OR PROMPT SESSION ALWAYS NAVIGATE TO THE PROJECT FOLDER USING `cd C:\projects\personal\SightScanner\sight-scanner` TO ENSURE ALL COMMANDS RUN IN THE CORRECT CONTEXT BEFORE YOU START!




