# Geo-Expedition Deutschland

An offline geography learning application about Germany, with interactive maps, short missions and German vocabulary supported by Russian explanations. The material is aimed at grade 5 learners in a German school setting.

## Features

- Three map layers: physical geography, federal states and waterways.
- Information cards for geographic features and all 16 federal states.
- 62 exercises across orientation, coasts, lowlands, central uplands and revision.
- Five task formats: map selection, multiple choice, matching, ordering and linked three-part questions.
- Randomized mission selections, hints, explanations, a dictionary and model German answers.
- Progress and previous mistakes stored in the current browser.

## Run locally

Open [index.html](index.html) in a browser. There is no npm installation, build step, backend, external map service or API key.

If Python is available, an optional local server can be started from the repository folder:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8000/`.

## Source layout

| Path | Purpose |
| --- | --- |
| [index.html](index.html) | Application shell, SVG map regions and local resource links |
| [js/app.js](js/app.js) | Navigation, interactive tasks, mission selection and progress |
| [js/data.js](js/data.js) | Learning material, map objects, terminology and exercises |
| [css/styles.css](css/styles.css) | Interface and map presentation |
| `assets/map-*-schematic.png` | Included map backgrounds |

All data and resources are included locally. Progress uses `localStorage`; it is not uploaded or synchronized between devices. Clearing browser storage removes that progress. If browser storage is unavailable, the application continues without persistent saving.

## Scope and limitations

The interface primarily uses Russian; German terms and model answers support learning the school vocabulary. The layout is primarily intended for a laptop or tablet.

Map backgrounds and simplified clickable regions are educational illustrations, not authoritative cartographic data. The application is not a complete curriculum or an official assessment system. Browser interaction and educational accuracy should be reviewed for the intended classroom use.

## Graphics and licensing

The repository owner identifies the included map graphics as GPT-generated. Existing provenance metadata is preserved where present. No software or graphics license has been selected for this repository.
