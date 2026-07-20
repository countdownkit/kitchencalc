/*
 * Static long-tail page generator for the kitchen conversions site.
 * Run: node generate.js   ->   writes everything into ./public
 *
 * Page families produced:
 *   /tablespoons-in-<cups>/                cup -> tablespoon pages
 *   /teaspoons-in-<tbsp>/                  tablespoon -> teaspoon pages
 *   /cups-in-<unit>/  /cups-in-<n>-oz/     pint/quart/gallon + fluid-ounce pages
 *   /grams-in-<cups>-of-<ingredient>/      ingredient weight pages
 *   /<f>-f-to-c/  /<c>-c-to-f/             oven temperature pages
 *   /recipe-scaler/ /cooking-converter/ /ingredient-converter/   interactive tools
 *   /                                      homepage
 */
const fs = require("fs");
const path = require("path");

// ---- config -------------------------------------------------------------
const DOMAIN = process.env.DOMAIN || "https://kitchen.elevatedprogress.com";
const BASE = process.env.BASE || "";
const SITE = "Kitchen Conversions";
const OUT = path.join(__dirname, "public");
const ASSETS = path.join(__dirname, "assets");
const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "kitchen.json"), "utf8"));

// ---- unit math ----------------------------------------------------------
const ML = { tsp: 4.929, tbsp: 14.787, cup: 236.588, floz: 29.5735 };
const r1 = n => Math.round(n * 10) / 10;
const round = Math.round;
function tbspOfCups(cups) { // exact kitchen phrasing, handles thirds
  const tsp = round(cups * 48);
  if (tsp % 3 === 0) return { text: `${tsp / 3} tablespoons`, big: String(tsp / 3) };
  return { text: `${Math.floor(tsp / 3)} tablespoons + ${tsp % 3} teaspoon${tsp % 3 > 1 ? "s" : ""}`, big: `${Math.floor(tsp / 3)}${tsp % 3 === 1 ? "⅓" : "⅔"}` };
}
function niceCups(cups) {
  const map = { 0.125: "⅛", 0.25: "¼", 0.375: "⅜", 0.5: "½", 0.75: "¾", 1.5: "1½", 2.5: "2½", 0.333333: "⅓", 0.666667: "⅔" };
  if (map[cups]) return map[cups];
  return Number.isInteger(cups) ? String(cups) : String(r1(cups));
}
const fToC = f => (f - 32) * 5 / 9;
const cToF = c => c * 9 / 5 + 32;
const nearestGas = f => DATA.gasMarks.reduce((a, b) => Math.abs(b.f - f) < Math.abs(a.f - f) ? b : a);

// ---- html layout --------------------------------------------------------
function layout({ title, desc, urlPath, h1, hero, body, useTool }) {
  const canonical = DOMAIN + BASE + urlPath;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="${BASE}/styles.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5580575158570188" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-TJY4TRRKD6"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-TJY4TRRKD6');</script>
</head>
<body>
<header class="site-head"><div class="wrap">
  <a class="brand" href="${BASE}/">🥄 ${SITE}</a>
  <nav class="nav"><a href="${BASE}/recipe-scaler/">Recipe Scaler</a><a href="${BASE}/#all">All Conversions</a></nav>
</div></header>
<main class="wrap">
  <div class="crumbs"><a href="${BASE}/">Home</a> ›&nbsp;${h1}</div>
  <h1>${h1}</h1>
  ${hero || ""}
  <div class="ad-slot">Advertisement</div>
  ${body}
  <div class="ad-slot">Advertisement</div>
</main>
<footer class="site-foot"><div class="wrap">
  <a href="${BASE}/">Home</a><a href="${BASE}/recipe-scaler/">Recipe Scaler</a><a href="${BASE}/#all">All Conversions</a>
  <span>· ${SITE} — free cooking &amp; baking conversion tools. US customary measures. Part of <a href="https://elevatedprogress.com/">Elevated Progress</a>.</span>
</div></footer>
${useTool ? `<script src="${BASE}/tool.js" defer></script>` : ""}
</body>
</html>`;
}
function answerHero(big, unit, sub) {
  return `<div class="answer">
  <div class="big-num">${big}<span class="unit">${unit}</span></div>
  <div class="sub">${sub}</div>
</div>`;
}
function grid(links) {
  return `<div class="grid">` + links.map(l =>
    `<a href="${BASE}${l.href}">${l.emoji ? `<span class="chip-emoji">${l.emoji}</span>` : ""}${l.label}</a>`).join("") + `</div>`;
}
function table(head, rows) {
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead>
<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("\n")}</tbody></table></div>`;
}

// ---- write helpers ------------------------------------------------------
const urls = [];
function writePage(urlPath, html) {
  const dir = path.join(OUT, urlPath.replace(/^\/+|\/+$/g, ""));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
  urls.push(urlPath);
}

// ---- build --------------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
for (const entry of fs.readdirSync(OUT)) {
  if (entry === ".git" || entry === "CNAME") continue;
  fs.rmSync(path.join(OUT, entry), { recursive: true, force: true });
}
for (const f of fs.readdirSync(ASSETS)) fs.copyFileSync(path.join(ASSETS, f), path.join(OUT, f));

const TOOLS_GRID = [
  { href: "/recipe-scaler/", emoji: "⚖️", label: "Recipe Scaler" },
  { href: "/cooking-converter/", emoji: "🔄", label: "Cooking Converter" },
  { href: "/ingredient-converter/", emoji: "🌾", label: "Cups ↔ Grams" },
];

// -- tablespoons in X cups --
{
  const links = DATA.cupFractions.map(f => ({ href: `/tablespoons-in-${f.slug}/`, label: `Tbsp in ${f.disp.toLowerCase()}` }));
  for (const f of DATA.cupFractions) {
    const urlPath = `/tablespoons-in-${f.slug}/`;
    const t = tbspOfCups(f.v);
    const tsp = round(f.v * 48), ml = round(f.v * ML.cup), oz = r1(f.v * 8);
    const h1 = `How Many Tablespoons in ${f.disp}?`;
    const desc = `${f.disp} = ${t.text} = ${tsp} teaspoons = ${oz} fluid ounces = ${ml} ml. Quick conversion table for every common cup measure inside.`;
    const allRows = DATA.cupFractions.map(g => [g.disp, tbspOfCups(g.v).text, `${round(g.v * 48)} tsp`, `${round(g.v * ML.cup)} ml`]);
    const body = `
  ${table(["What", "Amount"], [
      ["Tablespoons", t.text],
      ["Teaspoons", `${tsp}`],
      ["Fluid ounces", `${oz} fl oz`],
      ["Milliliters", `${ml} ml`],
    ])}
  <div class="prose">
    <p>The US kitchen chain: <b>1 cup = 16 tablespoons = 48 teaspoons = 8 fluid ounces</b>. ${tsp % 3 ? `Thirds don't divide evenly into tablespoons — the practical measure for ${f.word} is <b>${t.text}</b>.` : `So ${f.word} is exactly ${t.text} — no partial spoons needed.`}</p>
    <p>These are volume conversions and work for any ingredient. For weight (grams) the answer depends on the ingredient — see the <a href="${BASE}/ingredient-converter/">cups ↔ grams converter</a>.</p>
  </div>
  <h2>All cup measures</h2>
  ${table(["Cups", "Tablespoons", "Teaspoons", "Milliliters"], allRows)}
  <h2>More conversions</h2>
  ${grid(links.filter(l => l.href !== urlPath).concat(TOOLS_GRID))}`;
    writePage(urlPath, layout({
      title: `${h1} (${f.disp} to Tbsp)`, desc, urlPath, h1,
      hero: answerHero(t.big, "tablespoons", `${f.disp.toLowerCase()} = ${t.text} = ${tsp} teaspoons = ${ml} ml`), body,
    }));
  }
}

// -- teaspoons in X tablespoons --
{
  const links = DATA.tbspAmounts.map(a => ({ href: `/teaspoons-in-${a.slug}/`, label: `Tsp in ${a.disp.toLowerCase()}` }));
  for (const a of DATA.tbspAmounts) {
    const urlPath = `/teaspoons-in-${a.slug}/`;
    const tsp = a.v * 3, ml = r1(a.v * ML.tbsp);
    const h1 = `How Many Teaspoons in ${a.disp}${a.v === 1 ? "" : ""}?`;
    const desc = `${a.disp} = ${tsp} teaspoons = ${ml} ml = ${r1(a.v / 16 * 100) / 100} cups. Includes the full spoons-and-cups conversion table.`;
    const body = `
  ${table(["What", "Amount"], [
      ["Teaspoons", `${tsp}`],
      ["Milliliters", `${ml} ml`],
      ["Fluid ounces", `${r1(a.v * 0.5)} fl oz`],
      ["Cups", `${niceCups(a.v / 16)} cup`],
    ])}
  <div class="prose">
    <p><b>1 tablespoon = 3 teaspoons = 15 ml (metric) / 14.8 ml (US)</b>. The half-tablespoon in older recipes is 1½ teaspoons.</p>
    <p>Abbreviation trap: <b>tbsp/T = tablespoon, tsp/t = teaspoon</b> — a 3× difference that has ruined many batches of cookies.</p>
  </div>
  <h2>More conversions</h2>
  ${grid(links.filter(l => l.href !== urlPath).concat(DATA.cupFractions.slice(0, 4).map(f => ({ href: `/tablespoons-in-${f.slug}/`, label: `Tbsp in ${f.disp.toLowerCase()}` }))).concat(TOOLS_GRID))}`;
    writePage(urlPath, layout({
      title: `${h1} (Tbsp to Tsp)`, desc, urlPath, h1,
      hero: answerHero(String(tsp), "teaspoons", `${a.disp.toLowerCase()} = ${tsp} teaspoons = ${ml} ml`), body,
    }));
  }
}

// -- cups in pint/quart/half-gallon/gallon --
{
  const links = DATA.bigUnits.map(u => ({ href: `/cups-in-${u.slug}/`, label: `Cups in ${u.name.toLowerCase()}` }));
  for (const u of DATA.bigUnits) {
    const urlPath = `/cups-in-${u.slug}/`;
    const oz = u.cups * 8, liters = r1(u.cups * ML.cup / 1000);
    const h1 = `How Many Cups in ${u.name}?`;
    const desc = `${u.name} = ${u.cups} cups = ${oz} fluid ounces = ${liters} liters. Full US volume chart: cups, pints, quarts, and gallons.`;
    const body = `
  ${table(["What", "Amount"], [
      ["Cups", `${u.cups}`],
      ["Fluid ounces", `${oz} fl oz`],
      ["Pints", `${u.cups / 2}`],
      ["Quarts", `${niceCups(u.cups / 4)}`],
      ["Liters", `${liters} L`],
    ])}
  <div class="prose">
    <p>The US ladder: <b>1 gallon = 4 quarts = 8 pints = 16 cups = 128 fl oz</b>. Each step down halves (gallon → half-gallon → quart → pint → cup).</p>
    <p>UK/imperial pints (20 fl oz) and Australian metric cups (250 ml) differ — these figures are US customary, which is what US recipes mean.</p>
  </div>
  <h2>More conversions</h2>
  ${grid(links.filter(l => l.href !== urlPath).concat([{ href: "/cups-in-32-oz/", label: "Cups in 32 oz" }, { href: "/ounces-in-a-cup/", label: "Ounces in a cup" }]).concat(TOOLS_GRID))}`;
    writePage(urlPath, layout({
      title: `${h1} (US Cups)`, desc, urlPath, h1,
      hero: answerHero(String(u.cups), "cups", `${u.name.toLowerCase()} = ${u.cups} cups = ${oz} fl oz = ${liters} liters`), body,
    }));
  }
}

// -- cups in N fluid ounces + ounces in a cup --
{
  const links = DATA.cupsInOz.map(n => ({ href: `/cups-in-${n}-oz/`, label: `Cups in ${n} oz` }));
  for (const n of DATA.cupsInOz) {
    const urlPath = `/cups-in-${n}-oz/`;
    const cups = n / 8;
    const h1 = `How Many Cups Is ${n} Oz?`;
    const desc = `${n} fluid ounces = ${niceCups(cups)} cup${cups > 1 ? "s" : ""} = ${round(n * ML.floz)} ml. Includes the full ounces-to-cups table and the fluid-vs-weight ounce difference.`;
    const body = `
  ${table(["What", "Amount"], [
      ["Cups", `${niceCups(cups)}`],
      ["Tablespoons", `${n * 2}`],
      ["Milliliters", `${round(n * ML.floz)} ml`],
      ["Pints / quarts", `${niceCups(cups / 2)} pt / ${niceCups(cups / 4)} qt`],
    ])}
  <div class="prose">
    <p><b>Divide fluid ounces by 8 to get cups</b> — 1 US cup is 8 fl oz. So ${n} fl oz is ${niceCups(cups)} cup${cups !== 1 ? "s" : ""}.</p>
    <p>Watch the ounce trap: these are <b>fluid ounces (volume)</b>. "8 oz of chocolate chips" on a bag is weight — for dry ingredients, ounces and cups only connect through the ingredient's density (<a href="${BASE}/ingredient-converter/">cups ↔ grams converter</a>).</p>
  </div>
  <h2>Other amounts</h2>
  ${grid(links.filter(l => l.href !== urlPath).concat([{ href: "/ounces-in-a-cup/", label: "Ounces in a cup" }]).concat(TOOLS_GRID))}`;
    writePage(urlPath, layout({
      title: `${h1} (${n} Fl Oz to Cups)`, desc, urlPath, h1,
      hero: answerHero(niceCups(cups), `cup${cups > 1 ? "s" : ""}`, `${n} fl oz = ${niceCups(cups)} cups = ${round(n * ML.floz)} ml`), body,
    }));
  }
  {
    const urlPath = `/ounces-in-a-cup/`;
    const h1 = `How Many Ounces in a Cup?`;
    const desc = `1 US cup = 8 fluid ounces = 16 tablespoons = 237 ml. Fluid ounces measure volume — weight ounces depend on the ingredient. Both explained with tables.`;
    const body = `
  ${table(["What", "Amount"], [
      ["Fluid ounces", "8 fl oz"],
      ["Tablespoons", "16"],
      ["Teaspoons", "48"],
      ["Milliliters", "237 ml (240 ml on nutrition labels)"],
    ])}
  <div class="prose">
    <p><b>1 US cup = 8 fluid ounces.</b> That's the volume answer, and it's true for any liquid.</p>
    <p>For dry ingredients by <b>weight</b>, a cup is a different number of ounces per ingredient: a cup of flour weighs ~4.2 oz, sugar ~7 oz, honey ~12 oz. That's why serious baking recipes use grams.</p>
  </div>
  <h2>Ounce amounts</h2>
  ${grid(links.concat(TOOLS_GRID))}`;
    writePage(urlPath, layout({
      title: `${h1} (Fluid & Dry)`, desc, urlPath, h1,
      hero: answerHero("8", "fluid ounces", `1 US cup = 8 fl oz = 16 tablespoons = 237 ml`), body,
    }));
  }
}

// -- ml in a cup --
{
  const urlPath = `/ml-in-a-cup/`;
  const h1 = `How Many Ml in a Cup?`;
  const desc = `1 US cup = 236.6 ml (recipes round to 240 ml; UK/AU metric cups are 250 ml). Conversion table for common cup fractions in milliliters.`;
  const rows = DATA.cupFractions.map(f => [f.disp, `${round(f.v * ML.cup)} ml`, `${round(f.v * 250)} ml`]);
  const body = `
  ${table(["Cups", "US cup (237 ml)", "Metric cup (250 ml)"], rows)}
  <div class="prose">
    <p>A <b>US cup is 236.6 ml</b> — nutrition labels round it to 240 ml, and the difference never matters in cooking. A <b>metric cup (UK, Australia, NZ) is 250 ml</b>; only fussy baking notices the 5% gap between the two.</p>
  </div>
  <h2>More conversions</h2>
  ${grid(DATA.cupFractions.slice(0, 5).map(f => ({ href: `/tablespoons-in-${f.slug}/`, label: `Tbsp in ${f.disp.toLowerCase()}` })).concat(TOOLS_GRID))}`;
  writePage(urlPath, layout({
    title: `${h1} (US & Metric)`, desc, urlPath, h1,
    hero: answerHero("237", "milliliters", `1 US cup = 236.6 ml · metric cup (UK/AU) = 250 ml`), body,
  }));
}

// -- butter pages --
{
  const butterRows = [
    ["1 stick", "½ cup", "8 tbsp", "113 g", "4 oz"],
    ["½ stick", "¼ cup", "4 tbsp", "57 g", "2 oz"],
    ["2 sticks", "1 cup", "16 tbsp", "227 g", "8 oz"],
    ["4 sticks (1 lb box)", "2 cups", "32 tbsp", "454 g", "16 oz"],
  ];
  const pages = [
    { slug: "tablespoons-in-a-stick-of-butter", h1: "How Many Tablespoons in a Stick of Butter?", big: "8", unit: "tablespoons", sub: "1 stick = 8 tbsp = ½ cup = 113 g" },
    { slug: "cups-in-a-stick-of-butter", h1: "How Many Cups in a Stick of Butter?", big: "½", unit: "cup", sub: "1 stick = ½ cup = 8 tbsp = 113 g" },
    { slug: "grams-in-a-stick-of-butter", h1: "How Many Grams in a Stick of Butter?", big: "113", unit: "grams", sub: "1 stick = 113 g = ½ cup = 8 tbsp = 4 oz" },
    { slug: "sticks-of-butter-in-a-cup", h1: "How Many Sticks of Butter in a Cup?", big: "2", unit: "sticks", sub: "1 cup = 2 sticks = 16 tbsp = 227 g" },
    { slug: "sticks-of-butter-in-a-pound", h1: "How Many Sticks of Butter in a Pound?", big: "4", unit: "sticks", sub: "1 lb = 4 sticks = 2 cups = 454 g" },
  ];
  const links = pages.map(p => ({ href: `/${p.slug}/`, label: p.h1.replace("How Many ", "").replace("?", "") }));
  for (const p of pages) {
    const urlPath = `/${p.slug}/`;
    const desc = `${p.sub}. The full American butter-stick conversion table: sticks, cups, tablespoons, grams, and ounces.`;
    const body = `
  ${table(["Butter", "Cups", "Tablespoons", "Grams", "Ounces"], butterRows)}
  <div class="prose">
    <p>US butter sticks are printed with tablespoon markings on the wrapper — <b>1 stick = ½ cup = 8 tablespoons = 113 grams</b>. Elsewhere butter is sold in 250 g or 500 g blocks, which is why international recipes call for grams.</p>
    <p>Cutting cold butter? One tablespoon is one wrapper mark; ½ cup is a full stick — no measuring cup needed (or wanted: packing soft butter into cups is messy and inaccurate).</p>
  </div>
  <h2>More butter &amp; baking conversions</h2>
  ${grid(links.filter(l => l.href !== urlPath).concat([{ href: "/grams-in-a-cup-of-butter/", label: "Grams in a cup of butter" }]).concat(TOOLS_GRID))}`;
    writePage(urlPath, layout({
      title: `${p.h1} (Butter Conversion Chart)`, desc, urlPath, h1: p.h1,
      hero: answerHero(p.big, p.unit, p.sub), body,
    }));
  }
}

// -- grams in X cups of <ingredient> --
for (const ing of DATA.ingredients) {
  const fracLinks = DATA.cupFractions.map(f => ({ href: `/grams-in-${f.slug}-of-${ing.slug}/`, label: `${f.disp} of ${ing.short}` }));
  for (const f of DATA.cupFractions) {
    const urlPath = `/grams-in-${f.slug}-of-${ing.slug}/`;
    const g = round(ing.gPerCup * f.v);
    const oz = r1(g / 28.3495);
    const h1 = `How Many Grams in ${f.disp} of ${ing.name}?`;
    const desc = `${f.disp} of ${ing.short} weighs ${g} grams (${oz} oz), at ${ing.gPerCup} g per cup. Full cups-to-grams table for ${ing.short} inside.`;
    const allRows = DATA.cupFractions.map(x => [x.disp, `${round(ing.gPerCup * x.v)} g`, `${r1(round(ing.gPerCup * x.v) / 28.3495)} oz`]);
    const body = `
  ${table(["Amount", "Grams", "Ounces"], [[f.disp, `${g} g`, `${oz} oz`], ["Per tablespoon", `${r1(ing.gPerCup / 16)} g`, ""]])}
  <div class="prose">
    <p>${ing.note}</p>
    <p>Cup-to-gram numbers are always approximate for dry ingredients — how you fill the cup changes the weight. A kitchen scale removes the guesswork entirely, which is why bakers weigh.</p>
  </div>
  <h2>${ing.name}: all amounts</h2>
  ${table(["Cups", "Grams", "Ounces"], allRows)}
  <h2>Other amounts of ${ing.short}</h2>
  ${grid(fracLinks.filter(l => l.href !== urlPath))}
  <h2>${f.disp} of other ingredients</h2>
  ${grid(DATA.ingredients.filter(o => o.slug !== ing.slug).map(o => ({ href: `/grams-in-${f.slug}-of-${o.slug}/`, emoji: o.emoji, label: o.short })).concat(TOOLS_GRID))}`;
    writePage(urlPath, layout({
      title: `${h1} (${f.disp} to Grams)`, desc, urlPath, h1,
      hero: answerHero(String(g), "grams", `${f.disp.toLowerCase()} of ${ing.short} = ${g} g = ${oz} oz (${ing.gPerCup} g per cup)`), body,
    }));
  }
}

// -- oven temperatures --
{
  const fLinks = DATA.fToC.map(f => ({ href: `/${f}-f-to-c/`, label: `${f}°F to °C` }));
  const cLinks = DATA.cToF.map(c => ({ href: `/${c}-c-to-f/`, label: `${c}°C to °F` }));
  const chartRows = DATA.fToC.map(f => {
    const c = fToC(f), gas = nearestGas(f);
    return [`${f}°F`, `${round(c)}°C`, `${round((c - 20) / 5) * 5}°C`, gas.f === f ? `Gas ${gas.mark}` : "—"];
  });
  for (const f of DATA.fToC) {
    const urlPath = `/${f}-f-to-c/`;
    const c = fToC(f), cRound = round(c), fan = round((c - 20) / 5) * 5;
    const gas = nearestGas(f);
    const h1 = `${f}°F to Celsius`;
    const desc = `${f}°F is ${cRound}°C — set fan/convection ovens to about ${fan}°C${gas.f === f ? `, gas mark ${gas.mark}` : ""}. Full oven temperature chart inside.`;
    const body = `
  ${table(["What", "Temperature"], [
      ["Exact conversion", `${r1(c)}°C`],
      ["Oven dial setting", `${cRound}°C`],
      ["Fan / convection oven", `about ${fan}°C`],
      ["Gas mark", gas.f === f ? `${gas.mark}` : `≈ ${gas.mark} (${gas.f}°F)`],
    ])}
  <div class="prose">
    <p>The formula: <b>(°F − 32) × 5⁄9 = °C</b>, so ${f}°F = ${r1(c)}°C. Ovens work in 5-degree steps, so set ${cRound}°C.</p>
    <p>Fan (convection) ovens run effectively hotter — drop about 20°C from the conventional figure, or keep the temperature and shorten the time by ~10%.</p>
  </div>
  <h2>Oven temperature chart</h2>
  ${table(["Fahrenheit", "Celsius", "Fan oven", "Gas mark"], chartRows)}
  <h2>More temperatures</h2>
  ${grid(fLinks.filter(l => l.href !== urlPath).concat(cLinks.slice(0, 6)))}`;
    writePage(urlPath, layout({
      title: `${f}°F to °C — Oven Temperature Conversion`, desc, urlPath, h1,
      hero: answerHero(`${cRound}°`, "Celsius", `${f}°F = ${r1(c)}°C exactly · fan oven ≈ ${fan}°C`), body,
    }));
  }
  for (const c of DATA.cToF) {
    const urlPath = `/${c}-c-to-f/`;
    const f = cToF(c), fRound = round(f);
    const nearest = DATA.fToC.reduce((a, b) => Math.abs(b - f) < Math.abs(a - f) ? b : a);
    const h1 = `${c}°C to Fahrenheit`;
    const desc = `${c}°C is ${fRound}°F — for a US oven use the ${nearest}°F mark. Full oven temperature chart inside.`;
    const body = `
  ${table(["What", "Temperature"], [
      ["Exact conversion", `${r1(f)}°F`],
      ["Nearest US oven mark", `${nearest}°F`],
      [`If "fan" was specified`, `conventional ≈ ${c + 20}°C / ${round(cToF(c + 20))}°F`],
    ])}
  <div class="prose">
    <p>The formula: <b>°C × 9⁄5 + 32 = °F</b>, so ${c}°C = ${r1(f)}°F. US oven dials move in 25°F steps — use ${nearest}°F.</p>
    <p>If the recipe is British or European and says "fan" or "fan-assisted", it already accounts for convection: on a US conventional oven, add back ~20°C worth (about 35°F).</p>
  </div>
  <h2>Oven temperature chart</h2>
  ${table(["Fahrenheit", "Celsius", "Fan oven", "Gas mark"], chartRows)}
  <h2>More temperatures</h2>
  ${grid(cLinks.filter(l => l.href !== urlPath).concat(fLinks.slice(0, 6)))}`;
    writePage(urlPath, layout({
      title: `${c}°C to °F — Oven Temperature Conversion`, desc, urlPath, h1,
      hero: answerHero(`${fRound}°`, "Fahrenheit", `${c}°C = ${r1(f)}°F · nearest US oven mark ${nearest}°F`), body,
    }));
  }
}

// -- interactive tools --
{
  const urlPath = `/recipe-scaler/`;
  const title = `Recipe Scaler — Halve, Double, or Resize Any Recipe`;
  const desc = `Paste your ingredient list, set the original and target servings, and get every quantity rescaled into sensible kitchen fractions.`;
  const body = `<div class="tool" data-kitchen="scaler">
    <div class="row">${["Original servings|os|4", "Target servings|ts|8"].map(s => { const [l, id, v] = s.split("|"); return `<div><label for="${id}">${l}</label><input type="number" id="${id}" data-in="${id}" value="${v}" min="0.5" step="any"></div>`; }).join("")}</div>
    <label for="lines">Ingredients — one per line, amount first (e.g. "1 1/2 cups flour")</label>
    <textarea id="lines" data-in="lines" rows="8">1 1/2 cups flour
1 cup sugar
3/4 cup butter
2 eggs
1 tsp vanilla</textarea>
    <div class="tool-out" data-out></div>
    <pre class="scaled" data-scaled></pre>
  </div>
  <div class="prose">
    <p>Quantities are rounded to practical kitchen fractions (¼, ⅓, ½, ⅔, ¾, eighths). Lines without a leading number ("pinch of salt") pass through unchanged — scale those by taste.</p>
    <p>Two things don't scale linearly: <b>pan size</b> (doubling a cake batter needs a bigger pan, not twice the time) and <b>seasoning/leavening</b> at large multiples — at 3× and up, start with 2–2.5× the spices and baking powder and adjust.</p>
  </div>
  <h2>Handy conversions while you scale</h2>
  ${grid([{ href: "/tablespoons-in-a-quarter-cup/", label: "Tbsp in ¼ cup" }, { href: "/tablespoons-in-a-third-of-a-cup/", label: "Tbsp in ⅓ cup" }, { href: "/teaspoons-in-a-tablespoon/", label: "Tsp in a tbsp" }].concat(TOOLS_GRID.filter(t => t.href !== urlPath)))}`;
  writePage(urlPath, layout({ title, desc, urlPath, h1: "Recipe Scaler", hero: "", body, useTool: true }));
}
{
  const urlPath = `/cooking-converter/`;
  const title = `Cooking Measurement Converter — Cups, Tbsp, Oz, Ml & More`;
  const desc = `Convert between teaspoons, tablespoons, cups, fluid ounces, milliliters, pints, quarts, and gallons instantly.`;
  const body = `<div class="tool" data-kitchen="convert">
    <div class="row">
      <div><label for="v">Amount</label><input type="number" id="v" data-in="v" value="1" step="any" min="0"></div>
      <div><label for="u">Unit</label><select id="u" data-in="u"><option value="tsp">teaspoons</option><option value="tbsp">tablespoons</option><option value="cup" selected>cups</option><option value="floz">fluid ounces</option><option value="ml">milliliters</option><option value="l">liters</option><option value="pint">pints</option><option value="quart">quarts</option><option value="gallon">gallons</option></select></div>
    </div>
    <div data-rows></div>
  </div>
  <div class="prose"><p>All US customary volume units. Remember the ladder: 1 gallon = 4 quarts = 8 pints = 16 cups; 1 cup = 16 tbsp = 48 tsp = 8 fl oz ≈ 237 ml.</p></div>
  <h2>Common lookups</h2>
  ${grid([{ href: "/cups-in-a-quart/", label: "Cups in a quart" }, { href: "/cups-in-32-oz/", label: "Cups in 32 oz" }, { href: "/tablespoons-in-half-a-cup/", label: "Tbsp in ½ cup" }, { href: "/ml-in-a-cup/", label: "Ml in a cup" }].concat(TOOLS_GRID.filter(t => t.href !== urlPath)))}`;
  writePage(urlPath, layout({ title, desc, urlPath, h1: "Cooking Converter", hero: "", body, useTool: true }));
}
{
  const urlPath = `/ingredient-converter/`;
  const title = `Cups to Grams Converter — Flour, Sugar, Butter & More`;
  const desc = `Convert cups, tablespoons, grams, and ounces for common baking ingredients using standard densities (flour 120 g/cup, sugar 200 g/cup…).`;
  const cfg = DATA.ingredients.map(i => ({ slug: i.slug, name: i.name, g: i.gPerCup }));
  const body = `<div class="tool" data-kitchen="ingredient" data-config='${JSON.stringify(cfg)}'>
    <div class="row">
      <div><label for="iv">Amount</label><input type="number" id="iv" data-in="v" value="1" step="any" min="0"></div>
      <div><label for="iu">Unit</label><select id="iu" data-in="u"><option value="cup" selected>cups</option><option value="tbsp">tablespoons</option><option value="g">grams</option><option value="oz">ounces (weight)</option></select></div>
      <div><label for="ii">Ingredient</label><select id="ii" data-in="i">${cfg.map((c, i) => `<option value="${i}">${c.name}</option>`).join("")}</select></div>
    </div>
    <div data-rows></div>
  </div>
  <div class="prose"><p>Densities are standard baking references (a US cup of all-purpose flour = 120 g, granulated sugar = 200 g, butter = 227 g). Real-world cups vary with how you fill them — weigh when precision matters.</p></div>
  <h2>Popular ingredient answers</h2>
  ${grid(DATA.ingredients.map(i => ({ href: `/grams-in-a-cup-of-${i.slug}/`, emoji: i.emoji, label: `Grams in a cup of ${i.short}` })))}`;
  writePage(urlPath, layout({ title, desc, urlPath, h1: "Cups ↔ Grams Converter", hero: "", body, useTool: true }));
}

// -- homepage --
{
  const title = `${SITE} — Cups, Tablespoons, Grams & Oven Temperatures`;
  const desc = `Free kitchen conversion tools: tablespoons in a cup, cups in a quart, grams of flour or sugar per cup, oven °F ↔ °C, butter sticks, and a recipe scaler.`;
  const body = `<p class="lead">Every kitchen conversion, pre-answered — spoons and cups, cups and grams, oven temperatures, butter sticks — plus a recipe scaler for resizing whole ingredient lists.</p>
  <h2>Tools</h2>
  ${grid(TOOLS_GRID)}
  <h2 id="all">Spoons &amp; cups</h2>
  ${grid(DATA.cupFractions.map(f => ({ href: `/tablespoons-in-${f.slug}/`, label: `Tbsp in ${f.disp.toLowerCase()}` })).concat(DATA.tbspAmounts.slice(0, 2).map(a => ({ href: `/teaspoons-in-${a.slug}/`, label: `Tsp in ${a.disp.toLowerCase()}` }))))}
  <h2>Cups, quarts &amp; ounces</h2>
  ${grid(DATA.bigUnits.map(u => ({ href: `/cups-in-${u.slug}/`, label: `Cups in ${u.name.toLowerCase()}` })).concat([{ href: "/ounces-in-a-cup/", label: "Ounces in a cup" }, { href: "/ml-in-a-cup/", label: "Ml in a cup" }]).concat(DATA.cupsInOz.slice(0, 6).map(n => ({ href: `/cups-in-${n}-oz/`, label: `Cups in ${n} oz` }))))}
  <h2>Cups to grams</h2>
  ${grid(DATA.ingredients.map(i => ({ href: `/grams-in-a-cup-of-${i.slug}/`, emoji: i.emoji, label: i.short })))}
  <h2>Butter</h2>
  ${grid([{ href: "/tablespoons-in-a-stick-of-butter/", label: "Tbsp in a stick" }, { href: "/grams-in-a-stick-of-butter/", label: "Grams in a stick" }, { href: "/sticks-of-butter-in-a-cup/", label: "Sticks in a cup" }, { href: "/sticks-of-butter-in-a-pound/", label: "Sticks in a pound" }])}
  <h2>Oven temperatures</h2>
  ${grid(DATA.fToC.map(f => ({ href: `/${f}-f-to-c/`, label: `${f}°F → °C` })).concat(DATA.cToF.map(c => ({ href: `/${c}-c-to-f/`, label: `${c}°C → °F` }))))}`;
  writePage(`/`, layout({ title, desc, urlPath: `/`, h1: `Kitchen Conversion Tools`, hero: "", body }));
}

// -- sitemap + robots + meta files --
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${DOMAIN}${BASE}${u}</loc></url>`).join("\n")}
</urlset>`;
fs.writeFileSync(path.join(OUT, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${DOMAIN}${BASE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
fs.writeFileSync(path.join(OUT, "CNAME"), "kitchen.elevatedprogress.com\n");
fs.writeFileSync(path.join(OUT, "ads.txt"), "google.com, pub-5580575158570188, DIRECT, f08c47fec0942fa0\n");

console.log(`Generated ${urls.length} pages into ./public`);
