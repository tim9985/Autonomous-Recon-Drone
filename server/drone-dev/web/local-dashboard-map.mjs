// Quiet daytime base for the mission overlays; building height provenance stays in data.
// Coordinates, height evidence and active/held building policy use the existing local API.
export function addCampusLayers(map, manifest, buildings, facilities, origin) {
  if (manifest.web.terrainUrl && !map.getSource('terrain')) {
    const url = new URL(manifest.web.terrainUrl, origin);
    if (url.origin !== origin) throw new Error('외부 지형 경로는 사용할 수 없습니다.');
    const terrain={
      type: 'raster-dem', tiles: [origin + manifest.web.terrainUrl], tileSize: 256,
      encoding: 'terrarium', minzoom: manifest.web.minzoom, maxzoom: manifest.web.maxzoom,
      bounds: manifest.bounds,
    };
    // Terrain elevation and hillshade need independent MapLibre tile buffers.
    // Both retain the same versioned URL and browser HTTP cache.
    map.addSource('terrain',terrain);
    map.addSource('terrain-shading',{...terrain,tiles:[...terrain.tiles]});
    map.setTerrain({source: 'terrain', exaggeration: 1});
    map.addLayer({id: 'hillshade', type: 'hillshade', source: 'terrain-shading', paint: {
      'hillshade-shadow-color': '#a1b7a2', 'hillshade-highlight-color': '#f4f5e9',
      'hillshade-exaggeration': .25,
    }}, 'regions-fill');
  }
  if (facilities && !map.getSource('facilities')) {
    const groundBefore = map.getLayer('buildings') ? 'buildings' : 'regions-fill';
    map.addSource('facilities', {type: 'geojson', data: facilities});
    for (const [kind, color] of [
      ['wood', '#b4d2a5'], ['green', '#c6dcb2'], ['water', '#8dc8df'],
      ['pitch', '#a9c98e'], ['sport_track', '#cfaa8e'], ['parking', '#d4dfe1'],
      ['road', '#f7f7f2'], ['footway', '#e6dcc3'],
    ]) {
      map.addLayer({id: 'facility-' + kind, type: 'fill', source: 'facilities',
        filter: ['all', ['==', ['get', 'kind'], kind], ['==', ['geometry-type'], 'Polygon']],
        paint: {'fill-color': color, 'fill-opacity': .9}}, groundBefore);
    }
    map.addLayer({id: 'facility-tree', type: 'circle', source: 'facilities', minzoom: 14,
      filter: ['==', ['get', 'kind'], 'tree'], paint: {
        'circle-color': '#85b183',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 1.5, 18, 6],
        'circle-opacity': .65,
      }}, groundBefore);
  }
  if (!buildings || map.getSource('buildings')) return;
  map.addSource('buildings', {type: 'geojson', data: buildings});
  map.addLayer({id: 'buildings', type: 'fill-extrusion', source: 'buildings',
    filter: ['!=', ['get', 'representationMode'], 'GROUND_OUTLINE'], paint: {
      'fill-extrusion-height': ['coalesce', ['get', 'displayRoofM'], ['get', 'height_m'], 0],
      'fill-extrusion-base': ['coalesce', ['get', 'displayBaseM'], 0],
      'fill-extrusion-color': '#d7e0e3',
      'fill-extrusion-opacity': .92,
    }}, 'regions-fill');
  map.addLayer({id: 'building-outlines', type: 'line', source: 'buildings',
    filter: ['==', ['get', 'representationMode'], 'GROUND_OUTLINE'],
    paint: {'line-color': '#8a9da3', 'line-width': 1.5}}, 'regions-fill');
}
