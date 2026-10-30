<script lang="ts">
  // Place search bounded to England, via OpenStreetMap Nominatim (as in csis-dashboard).
  // Nominatim has no England-only country code, so results are restricted to Great Britain
  // and an England viewbox, then filtered on the address `state`.

  interface Props {
    sidebarOpen: boolean;
    onSelect: (bbox: [number, number, number, number], name: string) => void;
  }

  interface Place {
    name: string;
    context: string;
    bbox: [number, number, number, number];
  }

  let { sidebarOpen, onSelect }: Props = $props();

  // left, top, right, bottom
  const ENGLAND_VIEWBOX = '-6.42,55.82,1.77,49.86';
  const MAX_RESULTS = 5;

  let query = $state('');
  let results: Place[] = $state([]);
  let activeIndex = $state(-1);
  let loading = $state(false);
  let status = $state('');
  let open = $state(false);

  let timeout: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  // Nominatim reports parish and ward boundaries as 'suburb'
  const TYPE_LABELS: Record<string, string> = { suburb: 'Area', quarter: 'Area', neighbourhood: 'Area' };

  function placeType(r: any): string {
    const type = String(r.addresstype || r.type || '');
    return TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
  }

  function toPlace(r: any): Place {
    const [first, ...rest] = String(r.display_name).split(', ');
    const area = rest
      .filter(part => part !== 'England' && part !== 'United Kingdom' && !/^[A-Z]{1,2}\d/.test(part))
      .slice(0, 2);
    const context = [placeType(r), ...area].filter(Boolean).join(' · ');
    // Nominatim boundingbox is [south, north, west, east]
    const [south, north, west, east] = r.boundingbox.map(Number);
    return { name: r.name || first, context, bbox: [west, south, east, north] };
  }

  function handleInput() {
    status = '';
    activeIndex = -1;
    if (timeout) clearTimeout(timeout);
    if (query.trim().length < 3) {
      controller?.abort();
      results = [];
      open = false;
      loading = false;
      return;
    }
    timeout = setTimeout(search, 400);
  }

  async function search() {
    controller?.abort();
    controller = new AbortController();
    loading = true;
    const params = new URLSearchParams({
      q: query.trim(),
      format: 'jsonv2',
      addressdetails: '1',
      countrycodes: 'gb',
      viewbox: ENGLAND_VIEWBOX,
      bounded: '1',
      limit: '15',
      'accept-language': 'en'
    });
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal: controller.signal });
      if (!resp.ok) throw new Error(`Nominatim error (${resp.status})`);
      const seen = new Set<string>();
      results = (await resp.json())
        .filter((r: any) => r.address?.state === 'England' && r.boundingbox)
        .map(toPlace)
        .filter((p: Place) => {
          const key = `${p.name}|${p.context}`;
          return !seen.has(key) && !!seen.add(key);
        })
        .slice(0, MAX_RESULTS);
      status = results.length ? '' : 'No places in England match.';
      open = true;
      loading = false;
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Place search error:', err);
      results = [];
      status = 'Place search is unavailable. Try again later.';
      open = true;
      loading = false;
    }
  }

  function select(place: Place) {
    onSelect(place.bbox, place.name);
    query = place.name;
    results = [];
    open = false;
    activeIndex = -1;
  }

  function clear() {
    query = '';
    handleInput();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault();
      open = true;
      activeIndex = (activeIndex + 1) % results.length;
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + results.length) % results.length;
    } else if (e.key === 'Enter' && results.length) {
      e.preventDefault();
      select(results[Math.max(activeIndex, 0)]);
    } else if (e.key === 'Escape') {
      open = false;
    }
  }
</script>

<div class="place-search" class:sidebar-open={sidebarOpen}>
  <div class="input-wrap">
    <svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
    <input
      type="text"
      bind:value={query}
      oninput={handleInput}
      onkeydown={handleKeydown}
      onfocus={() => { if (results.length || status) open = true; }}
      onblur={() => open = false}
      placeholder="Search places in England (e.g. Lichfield)"
      aria-label="Search places in England"
      role="combobox"
      aria-expanded={open && results.length > 0}
      aria-controls="place-results"
      aria-autocomplete="list"
      aria-activedescendant={activeIndex >= 0 ? `place-${activeIndex}` : undefined}
    />
    {#if loading}
      <span class="spinner" aria-hidden="true"></span>
    {:else if query}
      <button class="clear-btn" onclick={clear} aria-label="Clear place search">×</button>
    {/if}
  </div>

  {#if open && results.length > 0}
    <!-- mousedown keeps focus in the input so selection happens before blur closes the list -->
    <ul id="place-results" class="results" role="listbox" onmousedown={(e) => e.preventDefault()}>
      {#each results as place, i (place.name + place.context)}
        <li
          id="place-{i}"
          role="option"
          aria-selected={i === activeIndex}
          class:active={i === activeIndex}
          onclick={() => select(place)}
          onkeydown={() => {}}
        >
          <span class="name">{place.name}</span>
          {#if place.context}<span class="context">{place.context}</span>{/if}
        </li>
      {/each}
    </ul>
  {:else if open && status}
    <p class="status" role="status">{status}</p>
  {/if}
</div>

<style>
  .place-search {
    position: absolute;
    top: 16px;
    left: 16px;
    width: 300px;
    max-width: calc(100vw - 96px);
    z-index: 25;
    transition: left 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Fit the space between the sidebar and the zoom controls */
  .place-search.sidebar-open {
    left: 360px;
    max-width: calc(100vw - 424px);
  }

  /* On phones the open sidebar covers the map, so there is nowhere to put the box */
  @media (max-width: 600px) {
    .place-search.sidebar-open {
      display: none;
    }
  }

  .input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .icon {
    position: absolute;
    left: 10px;
    color: var(--text-secondary);
    pointer-events: none;
    z-index: 1;
  }

  input {
    width: 100%;
    height: 36px;
    padding: 0 32px 0 32px;
    background: rgba(15, 23, 42, 0.92);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-panel);
    color: var(--text-primary);
    font: inherit;
    font-size: 12px;
    outline: none;
  }

  input::placeholder {
    color: var(--text-secondary);
  }

  input:focus {
    border-color: var(--accent-blue);
  }

  .clear-btn {
    position: absolute;
    right: 8px;
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 16px;
    cursor: pointer;
  }

  .clear-btn:hover {
    color: var(--text-primary);
  }

  .spinner {
    position: absolute;
    right: 10px;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.15);
    border-top-color: var(--accent-blue);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .results {
    list-style: none;
    margin-top: 4px;
    padding: 4px;
    background: rgba(15, 23, 42, 0.96);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-panel);
  }

  .results li {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 7px 10px;
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .results li:hover,
  .results li.active {
    background: rgba(59, 130, 246, 0.18);
  }

  .name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .context {
    font-size: 11px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .status {
    margin-top: 4px;
    padding: 7px 10px;
    font-size: 11px;
    color: var(--text-secondary);
    background: rgba(15, 23, 42, 0.96);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }
</style>
