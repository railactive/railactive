# RailActive — North-South Active Travel Corridor Web Application

Interactive, cloud-native web map application for exploring and visualizing the **North-South Active Travel Corridor** and High Speed 2 (HS2) active travel repurposing opportunities (walking, wheeling, and cycling).

 

## Overview

 

**RailActive** is an open-source geospatial frontend application designed to visualize over **418 km** of multi-user active travel routes connecting communities across the North-South corridor (London, the Midlands, and the North).

 

The application provides:

 

- **Interactive Vector Map**: GPU-accelerated rendering powered by MapLibre GL JS with multiple basemap options (Dark, Light, Satellite).

- **Multi-Criteria Filtering**: Filter route segments by delivery body (HS2, DfT, Local Authorities, Sustrans, CRT), route category (traffic-free paths, cycleways beside rail, quiet lanes, canal towpaths), classification, and corridor section (Sections 1–35).

- **Dynamic Aggregation & KPIs**: Real-time recalculation of total corridor length, HS2 delivery lengths, greenway mileage, and category breakdowns.

- **Segment Detail Inspection**: Click-to-inspect link metadata, classifications, length, and remarks with direct segment zoom functionality.

- **Cloud-Native Data Transport**: High-performance GeoJSON, PMTiles, and DuckDB-WASM integration without requiring a runtime backend server.

 

## Architecture

 

`
┌────────────────────────────────────────────────────────┐
│                   Data Ingestion Layer                 │
│        (HS2 Corridor Datasets, LCWIPs, OSM, KML)       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                    Static Data Assets                  │
│       • public/data/north_south_cycleway.json          │
│       • Vector Tiles (.pmtiles) / Parquet / DuckDB     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               Svelte 5 Client Application              │
│    • Svelte 5 Runes (, , )        │
│    • MapLibre GL JS (Vector / Raster basemaps)         │
│    • DuckDB-WASM in-browser query engine               │
└────────────────────────────────────────────────────────┘
`

 

## Tech Stack

 

- **Framework**: [Svelte 5](https://svelte.dev/) with Runes

- **Mapping**: [MapLibre GL JS](https://maplibre.org/)

- **Spatial Formats**: GeoJSON, [PMTiles](https://protomaps.com/), [DuckDB-WASM](https://duckdb.org/docs/api/wasm/overview)

- **Bundler**: [Vite 6](https://vitejs.dev/)

- **Language**: TypeScript

 

## Getting Started

 

### Prerequisites

 

- Node.js (v18+)

- npm, bun, or pnpm

 

### Installation & Local Development

 

`ash
# Clone the repository
git clone https://github.com/railactive/railactive.git
cd railactive

# Install dependencies
npm install

# Start local dev server
npm run dev
`

 

Open [http://localhost:5173](http://localhost:5173) in your browser.

 

### Production Build

 

`ash
npm run build
npm run preview
`

 

## License

 

MIT License. Open for comments, issues, and community suggestions.
