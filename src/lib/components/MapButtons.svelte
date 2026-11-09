<script lang="ts" module>
  export function streetViewUrl(lon: number, lat: number): string {
    return `https://maps.google.com/maps?q=&layer=c&cbll=${lat},${lon}&cbp=11,0,0,0,0`;
  }

  export function openStreetMapUrl(lon: number, lat: number): string {
    return `https://www.openstreetmap.org/#map=19/${lat}/${lon}`;
  }

  export function mapButtonsHtml(lon: number, lat: number): string {
    const sv = streetViewUrl(lon, lat);
    const osm = openStreetMapUrl(lon, lat);
    return `
      <div class="map-popup-links">
        <a href="${sv}" target="_blank" rel="noopener noreferrer" class="map-ext-link">Street View</a>
        <a href="${osm}" target="_blank" rel="noopener noreferrer" class="map-ext-link">OpenStreetMap</a>
      </div>
    `;
  }

  export function featureCenter(geometry: any): [number, number] | null {
    const c = geometry?.coordinates;
    if (!Array.isArray(c) || c.length === 0) return null;
    if (typeof c[0] === 'number' && typeof c[1] === 'number') {
      return [c[0], c[1]];
    }
    if (Array.isArray(c[0]) && typeof c[0][0] === 'number' && typeof c[0][1] === 'number') {
      const mid = c[Math.floor(c.length / 2)];
      return [mid[0], mid[1]];
    }
    if (Array.isArray(c[0]) && Array.isArray(c[0][0]) && typeof c[0][0][0] === 'number' && typeof c[0][0][1] === 'number') {
      const line = c[Math.floor(c.length / 2)];
      const mid = line[Math.floor(line.length / 2)];
      return [mid[0], mid[1]];
    }
    return null;
  }
</script>

<script lang="ts">
  /**
   * Reusable Street View + OpenStreetMap button pair for map feature popups.
   * Pass `center` as [lon, lat] from the clicked coordinate or feature geometry.
   */
  let {
    center = null
  }: {
    center?: [number, number] | null;
  } = $props();

  const hasCenter = $derived(
    Array.isArray(center)
    && center.length === 2
    && Number.isFinite(center[0])
    && Number.isFinite(center[1])
  );
  const svUrl = $derived(hasCenter && center ? streetViewUrl(center[0], center[1]) : '#');
  const osmUrl = $derived(hasCenter && center ? openStreetMapUrl(center[0], center[1]) : '#');
</script>

{#if hasCenter}
  <div class="map-popup-links">
    <a
      href={svUrl}
      target="_blank"
      rel="noopener noreferrer"
      class="map-ext-link"
    >
      Street View
    </a>
    <a
      href={osmUrl}
      target="_blank"
      rel="noopener noreferrer"
      class="map-ext-link"
    >
      OpenStreetMap
    </a>
  </div>
{/if}
