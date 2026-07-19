# Kitchen Conversions

Every kitchen conversion, pre-answered: tablespoons in any cup measure, cups in quarts and
gallons, fluid ounces, milliliters, grams per cup for a dozen baking ingredients, butter-stick
math, and oven °F ↔ °C — plus an interactive recipe scaler, a volume converter, and a
cups ↔ grams converter.

Live at **https://kitchen.elevatedprogress.com/**

## How it works

Zero-dependency Node static-site generator:

- `generate.js` — reads `data/kitchen.json` and writes every page into `public/`
- `data/kitchen.json` — cup fractions, ingredient densities, temperature lists
- `assets/` — stylesheet + interactive tool script, copied into the build
- `server.js` — local preview server (`http://localhost:5058`)

```
node generate.js   # build ./public
node server.js     # preview
```

Deployment is GitHub Actions → GitHub Pages on every push to `main` (`public/` is build
output and never committed).

Conversions use US customary units (1 cup = 8 fl oz = 236.6 ml) and standard baking-reference
densities (flour 120 g/cup, sugar 200 g/cup, butter 227 g/cup).
