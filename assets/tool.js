// Interactive kitchen tools: recipe scaler, volume converter, ingredient (cups<->grams) converter.
(function () {
  const ML = { tsp: 4.929, tbsp: 14.787, cup: 236.588, floz: 29.5735, ml: 1, l: 1000, pint: 473.176, quart: 946.353, gallon: 3785.41 };
  const NAMES = { tsp: "teaspoons", tbsp: "tablespoons", cup: "cups", floz: "fluid ounces", ml: "milliliters", l: "liters", pint: "pints", quart: "quarts", gallon: "gallons" };
  const r2 = n => Math.round(n * 100) / 100;

  // Render a number as a friendly kitchen quantity ("2 2/3", "1/8", "0.15")
  function niceFrac(x) {
    if (x === 0) return "0";
    const whole = Math.floor(x + 1e-9);
    const frac = x - whole;
    if (frac < 0.02) return String(whole || r2(x));
    const opts = [[1, 3], [2, 3], [1, 2], [1, 4], [3, 4], [1, 8], [3, 8], [5, 8], [7, 8], [1, 16]];
    let best = null;
    for (const [n, d] of opts) {
      const err = Math.abs(frac - n / d);
      if (err < 0.02 && (!best || err < best.err)) best = { n, d, err };
    }
    if (!best) return String(r2(x));
    return (whole ? whole + " " : "") + best.n + "/" + best.d;
  }

  function rowsTable(head, rows) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      head.map(h => "<th>" + h + "</th>").join("") + "</tr></thead><tbody>" +
      rows.map(r => "<tr>" + r.map(c => "<td>" + c + "</td>").join("") + "</tr>").join("") +
      "</tbody></table></div>";
  }

  document.querySelectorAll(".tool[data-kitchen]").forEach(tool => {
    const kind = tool.dataset.kitchen;
    const ins = {};
    tool.querySelectorAll("[data-in]").forEach(el => { ins[el.dataset.in] = el; });
    const out = tool.querySelector("[data-out]");
    const rowsEl = tool.querySelector("[data-rows]");
    const scaledEl = tool.querySelector("[data-scaled]");

    function run() {
      if (kind === "convert") {
        const v = +ins.v.value || 0;
        const ml = v * ML[ins.u.value];
        rowsEl.innerHTML = rowsTable(["Unit", "Amount"], Object.keys(ML)
          .filter(u => u !== ins.u.value)
          .map(u => [NAMES[u], niceFrac(ml / ML[u]) + (["ml", "l"].includes(u) ? " (" + r2(ml / ML[u]) + ")" : "")]));
      } else if (kind === "ingredient") {
        const cfg = JSON.parse(tool.dataset.config);
        const ing = cfg[+ins.i.value];
        const v = +ins.v.value || 0;
        const u = ins.u.value;
        const grams = u === "g" ? v : u === "oz" ? v * 28.3495 : u === "tbsp" ? v / 16 * ing.g : v * ing.g;
        const cups = grams / ing.g;
        rowsEl.innerHTML = rowsTable(["Measure", ing.name], [
          ["Cups", niceFrac(cups)],
          ["Tablespoons", niceFrac(cups * 16)],
          ["Grams", Math.round(grams) + " g"],
          ["Ounces (weight)", r2(grams / 28.3495) + " oz"],
        ]);
      } else if (kind === "scaler") {
        const os = +ins.os.value || 1, ts = +ins.ts.value || 1;
        const k = ts / os;
        out.innerHTML = "Scaling ×" + r2(k) + "<small>" + os + " servings → " + ts + " servings</small>";
        const lines = ins.lines.value.split("\n").map(line => {
          const m = line.match(/^\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)\s*(.*)$/);
          if (!m) return line;
          const frac = s => { const p = s.split("/"); return +p[0] / +p[1]; };
          let n;
          if (m[1].includes("/")) {
            const parts = m[1].split(/\s+/);
            n = parts.length === 2 ? +parts[0] + frac(parts[1]) : frac(m[1]);
          } else n = +m[1];
          return niceFrac(n * k) + " " + m[2];
        });
        scaledEl.textContent = lines.join("\n");
      }
    }
    Object.values(ins).forEach(el => el.addEventListener("input", run));
    run();
  });
})();
