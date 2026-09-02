# RailActive — North–South Active Travel Corridor Web Application

An interactive, cloud-native web mapping application for exploring and
visualizing the **North–South Active Travel Corridor** and opportunities to
repurpose High Speed 2 (HS2) infrastructure for active travel, including
walking, wheeling, and cycling.

## Overview

**RailActive** is an open-source geospatial frontend application designed to
visualize more than **418 km** of multi-use active travel routes connecting
communities across the North–South corridor, from London through the Midlands
to the North.

The application provides:

- **Interactive vector map**: GPU-accelerated rendering powered by MapLibre GL
  JS, with dark, light, and satellite basemaps.
- **Multi-criteria filtering**: Filter route segments by delivery body (HS2,
  DfT, local authorities, Sustrans, or CRT), route category (traffic-free paths,
  cycleways beside railways, quiet lanes, or canal towpaths), classification,
  and corridor section (Sections 1–35).
- **Dynamic aggregation and KPIs**: Real-time recalculation of total corridor
  length, HS2 delivery lengths, greenway mileage, and category breakdowns.
- **Segment detail inspection**: Inspect link metadata, classifications,
  lengths, and remarks, with the option to zoom directly to a segment.
- **Cloud-native data transport**: High-performance GeoJSON, PMTiles, and
  DuckDB-WASM integration without a runtime backend server.

## Architecture

```text
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
│    • Svelte 5 Runes ($state, $derived, $effect)        │
│    • MapLibre GL JS (vector/raster basemaps)           │
│    • DuckDB-WASM in-browser query engine               │
└────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Framework**: [Svelte 5](https://svelte.dev/) with Runes
- **Mapping**: [MapLibre GL JS](https://maplibre.org/)
- **Spatial formats**: GeoJSON, [PMTiles](https://protomaps.com/), and
  [DuckDB-WASM](https://duckdb.org/docs/api/wasm/overview)
- **Bundler**: [Vite 6](https://vitejs.dev/)
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm, Bun, or pnpm

### Installation and Local Development

```bash
# Clone the repository
git clone https://github.com/railactive/railactive.git
cd railactive

# Install dependencies
npm install

# Start the local development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

## License

This project is licensed under the MIT License. Comments, issues, and community
suggestions are welcome.
