# Atlas of Accountability: New York

**Live map:** [rebuildbydesign.github.io/newyork-atlas](https://rebuildbydesign.github.io/newyork-atlas/)

An interactive county map of federal disaster declarations in New York State from 2011 to 2024, paired with the elected officials who represent each place. It is part of Rebuild by Design's [Atlas of Disaster](https://rebuildbydesign.org/atlas-of-disaster).

Since 2011, New York has received over **$27.8 billion** in federal disaster assistance through **23 major disaster declarations** related to extreme weather.

---

## What the map does

- Colors all 62 New York counties by how many major disaster declarations they received (2011 to 2024)
- Lets anyone search an address or click a county to see:
  - Number of federal disaster declarations
  - FEMA obligations (Public Assistance + Hazard Mitigation)
  - County population and FEMA aid per person
  - CDC Social Vulnerability Index (SVI 2022) score
  - Their U.S. Senators, U.S. Representative, State Senator and State Assembly Member
- Toggles district outlines for the State Assembly (labeled "State House"), State Senate and U.S. Congress
- Works on desktop and mobile

---

## Files

```
index.html          Page layout: title, search bar, findings panel, legend, layer toggles
scripts.js          Map setup, data layers, county colors, popups
styles.css          Legend, findings panel, popup and button styles
geocoder.css        Search bar styles
img/                Title banner and Rebuild by Design logo
data/
  NY_FEMA_County.geojson   62 counties with disaster and FEMA data
  NY_Congress.geojson      26 U.S. House districts (119th Congress)
  NY_Senate.geojson        63 State Senate districts
  NY_House.geojson         150 State Assembly districts
```

### Data fields used

| File | Fields shown on the map |
|---|---|
| `NY_FEMA_County.geojson` | `NAMELSAD` (county name), `COUNTY_DISASTER_COUNT`, `COUNTY_TOTAL_FEMA`, `COUNTY_POPULATION`, `COUNTY_PER_CAPITA`, `SVI_2022` |
| `NY_Congress.geojson` | `FIRSTNAME`, `LASTNAME`, `OFFICE_ID`, `CONGRESS_DISTRICT` (label) |
| `NY_Senate.geojson` | `Full_Name`, `District` |
| `NY_House.geojson` | `Full_Name`, `District`, `DistrictNum` (label) |

U.S. Senators (Gillibrand and Schumer) are written directly into the popup in `scripts.js`, not stored in the data.

---

## Running it locally

1. Clone or download this repository.
2. Serve the folder with any local web server. The map loads its data with `fetch`, so opening `index.html` straight from your file system will not work. Two easy options:
   - VS Code with the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension
   - `python3 -m http.server` from the repo folder, then open `http://localhost:8000`
---

## Embedding on your website

**Option A: iframe.** Host your copy of this repo (GitHub Pages, Netlify, or your own server), then embed it:

```html
<iframe
  src="https://YOUR-HOST/newyork-atlas/"
  title="Atlas of Accountability: New York"
  style="width:100%; height:750px; border:0;"
  loading="lazy">
</iframe>
```

A height of 700 to 800px works well on desktop. On phones, consider a taller frame or a link to the full page.

**Option B: host it as its own page** on your site by copying all files (keeping the folder structure) to a directory on your server.

The data files are large (about 36 MB together), so the map can take a few seconds to load on slow connections.

---

## Changing the colors

All colors are set in four places. The current palette is red; swap in your own hex codes.

### 1. County fill colors (`scripts.js`, the `femaDisasters` layer, around line 120)

Each number is a count of disaster declarations, followed by its color. New York counties range from 1 to 9 declarations.

```js
'fill-color': [
  'match',
  ['to-number', ['get', 'COUNTY_DISASTER_COUNT'], 0],
  0, '#ffffff', 1, '#fee5d9', 2, '#fee5d9',
  3, '#fcae91', 4, '#fcae91', 5, '#fb6a4a',
  6, '#fb6a4a', 7, '#de2d26', 8, '#de2d26',
  9, '#de2d26', 10, '#a50f15', ...
  '#ffffff'   // fallback
]
```

### 2. Legend bar (`styles.css`, `.legend-gradient`, around line 125)

Update these so the legend matches the county colors from step 1:

```css
background: linear-gradient(to right,
    #f0f0f0 0%, #fee5d9 14%, #fcae91 28%,
    #fb6a4a 43%, #de2d26 71%, #a50f15 100%);
```

### 3. Accent color (dark red `#a50f15`)

Used for popup headings, the info and close buttons, and highlighted numbers. Find and replace `#a50f15` in:

- `styles.css` (also replace `rgba(165, 15, 21, ...)`, which is the same red used in shadows)
- `scripts.js`, inside `createPopupContent()` (also the light pink `#f5e6e6` behind the popup header)

### 4. Search bar (`geocoder.css`)

The search bar is black with white text. Change the `background-color` and `color` values to restyle it.

### Other things you may want to change

- **Title banner:** `img/newyork-title.png` is an image, so its colors cannot be changed in code. Replace it with your own image, or swap the `<img>` in `index.html` for a text heading.
- **Logo:** the Rebuild by Design logo is in `img/RBD-logo.png` and placed in `index.html` (`#rbd-logo-container`).
- **Basemap:** `scripts.js` uses Mapbox's `light-v11` style. Any [Mapbox style](https://docs.mapbox.com/api/maps/styles/) URL can go here.
- **District outlines and labels:** set to black (`#000`) in the `addCongressionalLayers()`, `addHouseLayers()` and `addSenateLayers()` functions in `scripts.js`.
- **Findings text:** the summary panel text is in `index.html` under `#highlevel-findings`.
- **Map position:** `center` and `zoom` near the top of `scripts.js`.

---

## Data sources

- **Disaster declarations and FEMA obligations:** [OpenFEMA](https://www.fema.gov/about/openfema/data-sets), major disaster declarations related to extreme weather, 2011 to 2024, as compiled for Rebuild by Design's Atlas of Disaster
- **Population:** U.S. Census Bureau
- **Social vulnerability:** [CDC/ATSDR Social Vulnerability Index 2022](https://www.atsdr.cdc.gov/place-health/php/svi/index.html)
- **County and congressional boundaries:** [U.S. Census TIGER/Line](https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html)
- **U.S. House members:** U.S. House of Representatives member data
- **State Senate and Assembly districts and members:** New York State legislative district data

---

## Credits

- Developed by [Judy Huynh](https://judyhuynh.ca) for [Rebuild by Design](https://rebuildbydesign.org/)
- Built with Mapbox GL JS, Turf.js, QGIS, and open FEMA and Census data

When embedding or adapting this map, please credit **Rebuild by Design, Atlas of Accountability** and link back to [rebuildbydesign.org/atlas-of-disaster](https://rebuildbydesign.org/atlas-of-disaster).

---

## License

- **Code** (HTML, CSS, JavaScript): [MIT License](LICENSE)
- **Data** (`data/` folder) and **title image** (`img/newyork-title.png`): [Creative Commons Attribution 4.0 (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/). You are free to use and adapt them with credit to Rebuild by Design.
- The Rebuild by Design logo is not covered by either license.
