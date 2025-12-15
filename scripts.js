mapboxgl.accessToken = 'pk.eyJ1IjoiajAwYnkiLCJhIjoiY2x1bHUzbXZnMGhuczJxcG83YXY4czJ3ayJ9.S5PZpU9VDwLMjoX_0x5FDQ';

// -------------------- GLOBALS --------------------
var currentPopup = null;
let NY_CONGRESS_GEOJSON = null;
let NY_HOUSE_GEOJSON = null;
let NY_SENATE_GEOJSON = null;

// INITIALIZE MAP
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [-75.70039, 42.98969], // CENTERED ON NEW YORK CITY
    zoom: 6.15,
    minZoom: 6
});

// Responsive initial zoom for mobile
if (window.innerWidth <= 700) map.setZoom(5.8);

// -------------------- GEOCODER -------------------
var geocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  mapboxgl: mapboxgl,
  marker: false,
  placeholder: 'Search for an address',
  flyTo: { zoom: 12, speed: 1.2, curve: 1 }
});
document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

// NUDGE GEOCODER ON LOAD
setTimeout(() => {
  const geocoderEl = document.querySelector('.mapboxgl-ctrl-geocoder');
  if (geocoderEl) {
    geocoderEl.classList.add('nudge');

    // Optional: stop nudging after a few seconds
    setTimeout(() => {
      geocoderEl.classList.remove('nudge');
    }, 3000);
  }
}, 300);



// When user searches, build popup from county + districts (regardless of visibility)
geocoder.on('result', function (e) {
  const lngLat = e.result.center;
  const pointPx = map.project(lngLat);

  const countyFeatures = map.queryRenderedFeatures(pointPx, { layers: ['femaDisasters'] });

  // If user has any district layers visible, include rendered hits too (nice to have)
  const renderedDistricts = map.queryRenderedFeatures(pointPx, {
    layers: ['congressionalDistricts', 'houseDistricts', 'senateDistricts']
  });

  const districtsFromMemory = getDistrictFeaturesFromMemory(lngLat);

  const allFeatures = countyFeatures.concat(renderedDistricts, districtsFromMemory);

  if (allFeatures.length > 0) {
    const featureData = consolidateFeatureData(allFeatures);
    const popupContent = createPopupContent(featureData);

    const femaFeature = countyFeatures.find(f => f.layer && f.layer.id === 'femaDisasters');
    if (femaFeature && typeof turf !== 'undefined') {
      const centroid = turf.centroid({
        type: 'Feature',
        geometry: femaFeature.geometry,
        properties: femaFeature.properties
      }).geometry.coordinates;
      showPopup({ lng: centroid[0], lat: centroid[1] }, popupContent);
    } else {
      showPopup(lngLat, popupContent);
    }
  } else {
    showPopup(lngLat, "<div style='color:#222'>No county or district data at this location.</div>");
  }
});

// -------------------- LOAD -----------------------
map.on('load', function () {
  addLayers();         // FEMA + district layers
  handleMapClick();    // click logic
  setupLayerToggles(); // UI toggles

  // Tooltip for county hover
  const tooltip = document.getElementById('map-tooltip');
  map.on('mousemove', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ['femaDisasters'] });
    if (features.length > 0) {
      map.getCanvas().style.cursor = 'pointer';
      tooltip.style.display = 'block';
      tooltip.style.left = e.point.x + 15 + 'px';
      tooltip.style.top = e.point.y + 15 + 'px';
      tooltip.innerHTML = `Click to learn more<br><strong>${features[0].properties.NAMELSAD}</strong>`;
    } else {
      map.getCanvas().style.cursor = '';
      tooltip.style.display = 'none';
    }
  });
});

const tooltip = document.getElementById('map-tooltip');

// Disable scroll zoom initially
map.scrollZoom.disable();
map.on('click', () => map.scrollZoom.enable());

// -------------------- LAYERS ---------------------
function addLayers() {
  // FEMA Counties (always visible)
  map.addSource('newyorkFema', { type: 'geojson', data: 'data/NY_FEMA_County.geojson' });

  map.addLayer({
    id: 'femaDisasters',
    type: 'fill',
    source: 'newyorkFema',
    paint: {
      'fill-color': [
        'match',
        ['to-number', ['get', 'COUNTY_DISASTER_COUNT'], 0],
        0, '#ffffff', 1, '#fee5d9', 2, '#fee5d9',
        3, '#fcae91', 4, '#fcae91', 5, '#fb6a4a',
        6, '#fb6a4a', 7, '#de2d26', 8, '#de2d26',
        9, '#de2d26', 10, '#a50f15', 11, '#a50f15',
        12, '#a50f15', 13, '#a50f15', 14, '#a50f15',
        15, '#a50f15', 16, '#a50f15', '#ffffff'
      ],
      'fill-opacity': 1
    }
  });

  map.addLayer({
    id: 'femaDisasters-stroke',
    type: 'line',
    source: 'newyorkFema',
    paint: { 'line-color': '#fff', 'line-width': 1 }
  });

  // DISTRICT LAYERS: load data into memory + add layers (hidden by default)
  addCongressionalLayers();
  addHouseLayers();
  addSenateLayers();
}


// ---------------------
// CONGRESSIONAL LAYERS
// ---------------------
function addCongressionalLayers() {
  fetch('data/NY_Congress.geojson')
    .then(r => r.json())
    .then(data => {
      NY_CONGRESS_GEOJSON = data;
      map.addSource('nyCongress', { type: 'geojson', data });

      // Polygon fill (transparent so we only see outline/labels)
      map.addLayer({
        id: 'congressionalDistricts',
        type: 'fill',
        source: 'nyCongress',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': 'transparent',
          'fill-opacity': 1
        }
      });

      // Outline stroke (adjust line-width here)
      map.addLayer({
        id: 'congressionalDistrictsOutline',
        type: 'line',
        source: 'nyCongress',
        layout: { visibility: 'none' },
        paint: {
          'line-color': '#000',
          'line-width': 1.5   // 👈 change this value for stroke thickness
        }
      });

      // Labels
      map.addLayer({
        id: 'congressionalLabels',
        type: 'symbol',
        source: 'nyCongress',
        layout: {
          'visibility': 'none',
          'text-field': ['get', 'CONGRESS_DISTRICT'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 20
        },
        paint: {
          'text-color': '#000',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5
        }
      });
    });
}

// ---------------------
// HOUSE LAYERS
// ---------------------
function addHouseLayers() {
  fetch('data/NY_House.geojson')
    .then(r => r.json())
    .then(data => {
      NY_HOUSE_GEOJSON = data;
      map.addSource('nyHouse', { type: 'geojson', data });

      // Polygon fill
map.addLayer({
  id: 'houseDistricts',
  type: 'fill',
  source: 'nyHouse',
  layout: { visibility: 'visible' },   // 👈 default ON
  paint: {
    'fill-color': 'transparent',
    'fill-opacity': 1
  }
});

// Outline stroke
map.addLayer({
  id: 'houseDistrictsOutline',
  type: 'line',
  source: 'nyHouse',
  layout: { visibility: 'visible' },   // 👈 default ON
  paint: {
    'line-color': '#000',
    'line-width': 1.5
  }
});

// Labels
map.addLayer({
  id: 'houseLabels',
  type: 'symbol',
  source: 'nyHouse',
  layout: {
    'visibility': 'visible',           // 👈 default ON
    'text-field': ['get', 'DistrictNum'],
    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
    'text-size': 14
  },
  paint: {
    'text-color': '#000',
    'text-halo-color': '#ffffff',
    'text-halo-width': 1.5
  }
});

    });
}

// ---------------------
// SENATE LAYERS
// ---------------------
function addSenateLayers() {
  fetch('data/NY_Senate.geojson')
    .then(r => r.json())
    .then(data => {
      NY_SENATE_GEOJSON = data;
      map.addSource('nySenate', { type: 'geojson', data });

      // Polygon fill
      map.addLayer({
        id: 'senateDistricts',
        type: 'fill',
        source: 'nySenate',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': 'transparent',
          'fill-opacity': 1
        }
      });

      // Outline stroke
      map.addLayer({
        id: 'senateDistrictsOutline',
        type: 'line',
        source: 'nySenate',
        layout: { visibility: 'none' },
        paint: {
          'line-color': '#000',
          'line-width': 1.5
        }
      });

      // Labels
      map.addLayer({
        id: 'senateLabels',
        type: 'symbol',
        source: 'nySenate',
        layout: {
          'visibility': 'none',
          'text-field': ['get', 'District'], // <-- senate district field
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 14
        },
        paint: {
          'text-color': '#000',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5
        }
      });
    });
}




// -------------------- CLICK POPUP ----------------
function handleMapClick() {
  map.on('click', function (e) {
    const lngLat = [e.lngLat.lng, e.lngLat.lat];

    // FEMA (visible)
    const countyFeatures = map.queryRenderedFeatures(e.point, { layers: ['femaDisasters'] });

    // Districts from visible layers (optional boost) + memory (always)
    const renderedDistricts = map.queryRenderedFeatures(e.point, {
      layers: ['congressionalDistricts', 'houseDistricts', 'senateDistricts']
    });

    const districtsFromMemory = getDistrictFeaturesFromMemory(lngLat);

    const allFeatures = countyFeatures.concat(renderedDistricts, districtsFromMemory);

    if (allFeatures.length > 0) {
      const featureData = consolidateFeatureData(allFeatures);
      const popupContent = createPopupContent(featureData);

      const femaFeature = countyFeatures.find(f => f.layer && f.layer.id === 'femaDisasters');
      const isMobile = window.innerWidth <= 700;

      if (femaFeature && typeof turf !== 'undefined' && !isMobile) {
        const centroid = turf.centroid({
          type: 'Feature',
          geometry: femaFeature.geometry,
          properties: femaFeature.properties
        }).geometry.coordinates;
        showPopup({ lng: centroid[0], lat: centroid[1] }, popupContent);
      } else {
        showPopup(e.lngLat, popupContent);
      }
    }
  });
}

// -------------------- TOGGLES --------------------
function setupLayerToggles() {
  // Congressional Toggle
  document.getElementById('toggle-congress').addEventListener('change', function (e) {
    const visibility = e.target.checked ? 'visible' : 'none';
    map.setLayoutProperty('congressionalDistricts', 'visibility', visibility);
    map.setLayoutProperty('congressionalDistrictsOutline', 'visibility', visibility);
    map.setLayoutProperty('congressionalLabels', 'visibility', visibility);
  });

  // House Toggle
  document.getElementById('toggle-house').addEventListener('change', function (e) {
    const visibility = e.target.checked ? 'visible' : 'none';
    map.setLayoutProperty('houseDistricts', 'visibility', visibility);
    map.setLayoutProperty('houseDistrictsOutline', 'visibility', visibility);
    map.setLayoutProperty('houseLabels', 'visibility', visibility);
  });

  // Senate Toggle
  document.getElementById('toggle-senate').addEventListener('change', function (e) {
    const visibility = e.target.checked ? 'visible' : 'none';
    map.setLayoutProperty('senateDistricts', 'visibility', visibility);
    map.setLayoutProperty('senateDistrictsOutline', 'visibility', visibility);
    map.setLayoutProperty('senateLabels', 'visibility', visibility);
  });
}


// -------------------- DATA FUSION ----------------
function consolidateFeatureData(features) {
  const featureData = {
    countyName: '',
    disasters: '',
    femaObligations: '',
    countyPopulation: '',
    countyPerCapita: '',
    countySVI: '',
    congressionalDist: '',
    congressRepName: '',
    houseDist: '',
    houseRepName: '',
    senateDist: '',
    senateRepName: ''
  };

  features.forEach(function (feature) {
    const layerId = feature.layer && feature.layer.id;
    if (!layerId) return;

    switch (layerId) {
      case 'femaDisasters':
        featureData.countyName = feature.properties.NAMELSAD;
        featureData.disasters = feature.properties.COUNTY_DISASTER_COUNT;
        featureData.femaObligations = feature.properties.COUNTY_TOTAL_FEMA;
        featureData.countyPopulation = feature.properties.COUNTY_POPULATION;
        featureData.countyPerCapita = feature.properties.COUNTY_PER_CAPITA;
        featureData.countySVI = feature.properties.SVI_2022;
        break;

      case 'congressionalDistricts':
        featureData.congressionalDist = feature.properties.OFFICE_ID;
        featureData.congressRepName =
          [feature.properties.FIRSTNAME, feature.properties.LASTNAME].filter(Boolean).join(' ');
        break;

      case 'houseDistricts':
        featureData.houseDist = feature.properties.District;
        featureData.houseRepName = feature.properties.Full_Name;
        break;

      case 'senateDistricts':
        featureData.senateDist = feature.properties.District;
        featureData.senateRepName = feature.properties.Full_Name;
        break;
    }
  });

  return featureData;
}

// -------------------- POPUP ----------------------
function createPopupContent(featureData) {
  return `
    <div style="color:#222; font-family:inherit;">
      <div style="
          background:#f5e6e6;color:#444;font-size:0.98em;font-weight:600;
          padding:7px 12px;margin-bottom:1em;border-left:5px solid #a50f15;">
        Information for Selected Location
      </div>
      <div style="font-size:0.96em;color:#444;margin-bottom:0.9em;">
        This summary shows federally declared disaster data and elected officials for the area you selected or searched.
      </div>
      <div style="margin-bottom:0.55em;">
        <div style="font-size:1.18em;font-weight:bold;color:#a50f15;letter-spacing:0.02em;">
          ${featureData.countyName || 'County'}
        </div>
      </div>
      <div style="margin-bottom:0.75em;line-height:1.55;">
        <strong>Federal Disaster Declarations:</strong> ${featureData.disasters ?? 'N/A'}<br>
        <strong>FEMA Obligations (PA+HM):</strong> ${
          featureData.femaObligations
            ? `${parseFloat(featureData.femaObligations).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`
            : 'N/A'
        }<br>
        <strong>County Population:</strong> ${
          featureData.countyPopulation ? parseInt(featureData.countyPopulation).toLocaleString('en-US') : 'N/A'
        }<br>
        <strong>Per Capita FEMA Aid:</strong> ${
          featureData.countyPerCapita
            ? `${parseFloat(featureData.countyPerCapita).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`
            : 'N/A'
        }<br>
        <strong>SVI Score:</strong> ${featureData.countySVI ?? 'N/A'}
      </div>
      <div style="border-top:1px solid #ececec;margin:1em 0;"></div>
      <div style="font-size:1.18em;font-weight:bold;color:#a50f15;letter-spacing:0.02em;">
        Elected Officials Covering This Location
      </div>
      <ul style="list-style:none;padding:0;margin:0 0 0.9em 0;">
        <li style="margin-bottom:3px;"><strong>U.S. Senate:</strong> Kirsten E. Gillibrand (D), Charles E. Schumer (D)</li>
        <li style="margin-bottom:3px;"><strong>U.S. House:</strong> ${featureData.congressRepName || 'N/A'} (${featureData.congressionalDist || 'N/A'})</li>
        <li style="margin-bottom:3px;"><strong>State Senate:</strong> ${featureData.senateRepName || 'N/A'} (${featureData.senateDist || 'N/A'})</li>
        <li style="margin-bottom:3px;"><strong>State House:</strong> ${featureData.houseRepName || 'N/A'} (${featureData.houseDist || 'N/A'})</li>
      </ul>
      <div style="color:gray;font-style:italic;font-size:0.85em;">
        * <a href="https://rebuildbydesign.org/atlas-of-disaster" target="_blank" style="color:gray;">Atlas of Disaster (2011–2024) by Rebuild by Design</a>
      </div>
    </div>
  `;
}

function showPopup(lngLat, content) {
  if (currentPopup) currentPopup.remove();
  currentPopup = new mapboxgl.Popup().setLngLat(lngLat).setHTML(content).addTo(map);
}

// -------------------- CORE FIX -------------------
// Robust point-in-polygon against in-memory GeoJSON (works even if layer is hidden)
function getDistrictFeaturesFromMemory(lngLat) {
  const pt = turf.point(lngLat);
  const hits = [];

  function addHits(geojson, layerId) {
    if (!geojson || !geojson.features) return;
    for (const f of geojson.features) {
      // turf.booleanPointInPolygon supports Polygon & MultiPolygon
      if (turf.booleanPointInPolygon(pt, f)) {
        hits.push({
          type: 'Feature',
          geometry: f.geometry,
          properties: f.properties,
          layer: { id: layerId }
        });
        // only 1 match per layer is needed
        break;
      }
    }
  }

  addHits(NY_CONGRESS_GEOJSON, 'congressionalDistricts');
  addHits(NY_HOUSE_GEOJSON, 'houseDistricts');
  addHits(NY_SENATE_GEOJSON, 'senateDistricts');

  return hits;
}
// -------------------- HIGH-LEVEL FINDINGS TOGGLE --------------------
const findingsPanel = document.getElementById('highlevel-findings');
const closeFindingsBtn = document.getElementById('close-findings');
const openFindingsBtn = document.getElementById('open-findings');

closeFindingsBtn.addEventListener('click', () => {
    findingsPanel.style.display = 'none';
    openFindingsBtn.style.display = 'block';
});

openFindingsBtn.addEventListener('click', () => {
    findingsPanel.style.display = 'block';
    openFindingsBtn.style.display = 'none';
});