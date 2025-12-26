# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PassoBus is an AI-powered smart bus routing application for Passo Fundo, Brazil. It simulates on-demand bus transportation where users select origin/destination stops and the system uses Google Gemini AI to optimize bus routes in real-time.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server on http://localhost:3000
npm run build        # Build for production
npm run preview      # Preview production build
```

## Environment Setup

Set `GEMINI_API_KEY` in `.env.local` for the Google Gemini AI integration.

## Architecture

### Core Flow
1. User selects origin → destination from fixed bus stops on a Leaflet map
2. System calculates ETA for all buses and presents options
3. User selects a bus; a passenger entity is created with `assignedBusId`
4. Gemini AI (`geminiService.ts`) periodically optimizes routes for all buses
5. OSRM routing service (`routingService.ts`) calculates street-level paths
6. 60fps animation loop moves buses along their paths

### Key Data Types (`types.ts`)
- **Bus**: Has `currentPath` (current movement), `plannedPath` (future visualization), and `route` (ordered stops)
- **Passenger**: Tracks `status` (WAITING → ON_BOARD → COMPLETED) and `assignedBusId`
- **RouteStop**: Either PICKUP or DROPOFF with location and passengerId

### Services
- **geminiService.ts**: Calls Gemini AI with structured JSON output schema to optimize bus routes. The AI acts as a logistics dispatcher, respecting assigned buses and maintaining route stability.
- **routingService.ts**: Wraps OSRM API for street-level routing with in-memory caching. Falls back to straight lines on error.

### Dashboard State Machine
The UI tracks `dynamicStatus`: IDLE → CHOOSING_DEST → SELECTING_BUS → WAITING → ARRIVING → BOARDING → TRAVELLING → FINISHED

### Simulation Engine (in Dashboard.tsx)
- **manageTraffic**: 1-second interval handling stop arrivals, boarding, and path transitions
- **Animation loop**: 16ms interval for smooth bus movement via linear interpolation
- **Demo mode**: Auto-generates bot passengers every 10 seconds

### External APIs
- Google Gemini (`gemini-3-flash-preview`) for route optimization
- OSRM (router.project-osrm.org) for street routing with 2-second timeout

### Path Aliases
`@/*` maps to project root (configured in tsconfig.json and vite.config.ts)
