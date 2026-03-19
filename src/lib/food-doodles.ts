/**
 * Hand-drawn food doodle icons using SVG bezier curves.
 * Each generator produces an SVG string for a 40×40 viewBox.
 * Uses seeded RNG + jitter for a warm, hand-drawn aesthetic.
 */

// ── Seeded RNG ──────────────────────────────────────────

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type RNG = () => number;

// ── Drawing Primitives ──────────────────────────────────

function jitter(rng: RNG, v: number, amount = 2) {
  return v + (rng() - 0.5) * amount;
}

function handLine(rng: RNG, x1: number, y1: number, x2: number, y2: number, w = 1.2) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const cx = jitter(rng, mx, 3), cy = jitter(rng, my, 3);
  return `<path d="M${jitter(rng, x1, 1)},${jitter(rng, y1, 1)} Q${cx},${cy} ${jitter(rng, x2, 1)},${jitter(rng, y2, 1)}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/>`;
}

function handCurve(rng: RNG, points: number[][], w = 1.2, closed = false) {
  if (points.length < 2) return "";
  let d = `M${jitter(rng, points[0][0], 0.8)},${jitter(rng, points[0][1], 0.8)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1], cur = points[i];
    const cpx = (prev[0] + cur[0]) / 2 + (rng() - 0.5) * 2.5;
    const cpy = (prev[1] + cur[1]) / 2 + (rng() - 0.5) * 2.5;
    d += ` Q${cpx},${cpy} ${jitter(rng, cur[0], 0.8)},${jitter(rng, cur[1], 0.8)}`;
  }
  if (closed) d += "Z";
  return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/>`;
}

function handCircle(rng: RNG, cx: number, cy: number, rx: number, ry?: number, filled = false, w = 1.2) {
  ry = ry || rx;
  const pts: number[][] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * jitter(rng, rx, rx * 0.1), cy + Math.sin(a) * jitter(rng, ry!, ry! * 0.1)]);
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1], cur = pts[i];
    const cpx = (prev[0] + cur[0]) / 2 + (rng() - 0.5) * 1.5;
    const cpy = (prev[1] + cur[1]) / 2 + (rng() - 0.5) * 1.5;
    d += ` Q${cpx},${cpy} ${cur[0]},${cur[1]}`;
  }
  d += "Z";
  return (
    `<path d="${d}" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" opacity="${filled ? 0.15 : 1}"/>` +
    (filled ? `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/>` : "")
  );
}

function handArc(rng: RNG, cx: number, cy: number, r: number, startA: number, endA: number, w = 1.2) {
  const pts: number[][] = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const a = startA + (endA - startA) * (i / n);
    pts.push([cx + Math.cos(a) * jitter(rng, r, r * 0.06), cy + Math.sin(a) * jitter(rng, r, r * 0.06)]);
  }
  return handCurve(rng, pts, w);
}

// ── Food Icon Generators ────────────────────────────────
// All fit within a 40×40 viewBox, centered around (20, 20)

function genFire(rng: RNG) {
  // 烧烤 — three flame tongues
  let s = "";
  // Left flame
  s += handCurve(rng, [[14, 34], [10, 24], [14, 16], [16, 22], [14, 34]], 1.3);
  // Center flame (tallest)
  s += handCurve(rng, [[18, 34], [16, 20], [20, 8], [24, 20], [22, 34]], 1.4);
  // Right flame
  s += handCurve(rng, [[26, 34], [24, 22], [26, 16], [30, 24], [26, 34]], 1.3);
  // Base grill line
  s += handLine(rng, 8, 34, 32, 34, 1.2);
  return s;
}

function genHotPot(rng: RNG) {
  // 火锅 — pot with handles and steam
  let s = "";
  // Pot body
  s += handCurve(rng, [[8, 20], [8, 30], [12, 34], [28, 34], [32, 30], [32, 20]], 1.4);
  // Lid rim
  s += handCurve(rng, [[6, 20], [34, 20]], 1.3);
  // Handles
  s += handArc(rng, 6, 25, 3, Math.PI * 0.5, Math.PI * 1.5, 1.2);
  s += handArc(rng, 34, 25, 3, -Math.PI * 0.5, Math.PI * 0.5, 1.2);
  // Steam wisps
  s += handCurve(rng, [[15, 18], [14, 13], [16, 8]], 0.9);
  s += handCurve(rng, [[20, 18], [21, 12], [19, 7]], 0.9);
  s += handCurve(rng, [[25, 18], [26, 13], [24, 8]], 0.9);
  return s;
}

function genFish(rng: RNG) {
  // 烤鱼 — simple fish
  let s = "";
  // Body
  s += handCurve(rng, [[8, 20], [14, 12], [26, 12], [34, 16], [34, 24], [26, 28], [14, 28], [8, 20]], 1.3);
  // Tail
  s += handCurve(rng, [[8, 20], [3, 14], [5, 20]], 1.2);
  s += handCurve(rng, [[8, 20], [3, 26], [5, 20]], 1.2);
  // Eye
  s += `<circle cx="${jitter(rng, 28, 0.5)}" cy="${jitter(rng, 19, 0.5)}" r="1.5" fill="currentColor"/>`;
  // Gill line
  s += handArc(rng, 25, 20, 4, Math.PI * 0.3, Math.PI * 0.7, 1);
  // Fin
  s += handCurve(rng, [[18, 14], [20, 8], [22, 14]], 1);
  return s;
}

function genCake(rng: RNG) {
  // 甜品 — cake slice
  let s = "";
  // Triangle slice
  s += handCurve(rng, [[8, 32], [20, 8], [32, 32], [8, 32]], 1.3);
  // Layer lines
  s += handCurve(rng, [[11, 24], [29, 24]], 1);
  s += handCurve(rng, [[13, 18], [27, 18]], 0.9);
  // Cherry on top
  s += handCircle(rng, 20, 8, 2.5, 2.5, true, 1.2);
  // Cherry stem
  s += handCurve(rng, [[20, 6], [22, 3]], 0.9);
  return s;
}

function genMatchaBowl(rng: RNG) {
  // 抹茶 — wide tea bowl
  let s = "";
  // Bowl
  s += handArc(rng, 20, 20, 13, 0, Math.PI, 1.4);
  s += handCurve(rng, [[7, 20], [10, 32], [20, 35], [30, 32], [33, 20]], 1.3);
  // Foam surface
  s += handCurve(rng, [[9, 21], [15, 19], [25, 19], [31, 21]], 0.9);
  // Whisk marks
  s += handCurve(rng, [[14, 22], [14, 18]], 0.7);
  s += handCurve(rng, [[17, 22], [17, 17]], 0.7);
  s += handCurve(rng, [[20, 22], [20, 17]], 0.7);
  s += handCurve(rng, [[23, 22], [23, 17]], 0.7);
  s += handCurve(rng, [[26, 22], [26, 18]], 0.7);
  return s;
}

function genCoffee(rng: RNG) {
  // 咖啡 — mug with steam
  let s = "";
  // Mug body
  s += handCurve(rng, [[10, 14], [10, 32], [26, 32], [26, 14]], 1.4);
  // Mug top rim
  s += handCurve(rng, [[10, 14], [26, 14]], 1.2);
  // Handle
  s += handArc(rng, 26, 22, 5, -Math.PI * 0.4, Math.PI * 0.4, 1.3);
  // Steam
  s += handCurve(rng, [[15, 12], [14, 7], [16, 4]], 0.9);
  s += handCurve(rng, [[20, 12], [21, 6], [19, 3]], 0.9);
  return s;
}

function genBoba(rng: RNG) {
  // 奶茶 — cup with dome lid, straw, and boba dots
  let s = "";
  // Cup body (slightly tapered)
  s += handCurve(rng, [[12, 14], [10, 34], [30, 34], [28, 14]], 1.4);
  // Dome lid
  s += handArc(rng, 20, 14, 8, Math.PI, 0, 1.3);
  s += handCurve(rng, [[12, 14], [28, 14]], 1.1);
  // Straw
  s += handLine(rng, 22, 6, 18, 28, 1.3);
  // Boba pearls
  const pearls = [[15, 30], [20, 31], [25, 30], [17, 28], [23, 28]];
  for (const [px, py] of pearls) {
    s += `<circle cx="${jitter(rng, px, 0.5)}" cy="${jitter(rng, py, 0.5)}" r="1.5" fill="currentColor" opacity="0.6"/>`;
  }
  return s;
}

function genBread(rng: RNG) {
  // 面包 — bread loaf
  let s = "";
  // Loaf shape
  s += handCurve(rng, [
    [8, 28], [6, 22], [8, 16], [14, 12], [20, 10], [26, 12], [32, 16], [34, 22], [32, 28], [8, 28],
  ], 1.4);
  // Score marks on top
  s += handCurve(rng, [[14, 14], [16, 20], [14, 24]], 0.9);
  s += handCurve(rng, [[20, 12], [22, 18], [20, 24]], 0.9);
  s += handCurve(rng, [[26, 14], [28, 20], [26, 24]], 0.9);
  // Base line
  s += handCurve(rng, [[8, 28], [32, 28]], 1.2);
  return s;
}

function genSushi(rng: RNG) {
  // 日料 — nigiri sushi
  let s = "";
  // Rice base
  s += handCurve(rng, [
    [8, 26], [8, 22], [12, 18], [20, 17], [28, 18], [32, 22], [32, 26], [28, 30], [12, 30], [8, 26],
  ], 1.3);
  // Fish topping
  s += handCurve(rng, [
    [6, 22], [10, 14], [16, 10], [24, 10], [30, 14], [34, 22],
  ], 1.4);
  s += handCurve(rng, [[6, 22], [34, 22]], 1);
  // Nori band
  s += handCurve(rng, [[17, 10], [17, 30]], 1.2);
  s += handCurve(rng, [[23, 10], [23, 30]], 1.2);
  return s;
}

function genCrawfish(rng: RNG) {
  // 小龙虾 — simple lobster/crawfish
  let s = "";
  // Body segments
  s += handCircle(rng, 22, 22, 7, 5);
  // Tail
  s += handCurve(rng, [[29, 22], [33, 24], [36, 28], [34, 30], [30, 28]], 1.2);
  // Claws
  s += handCurve(rng, [[15, 20], [8, 14], [5, 12]], 1.2);
  s += handCurve(rng, [[5, 12], [3, 10], [6, 9]], 1.1);
  s += handCurve(rng, [[5, 12], [3, 14], [6, 14]], 1.1);
  s += handCurve(rng, [[15, 24], [8, 26], [5, 28]], 1.2);
  s += handCurve(rng, [[5, 28], [3, 26], [6, 25]], 1.1);
  s += handCurve(rng, [[5, 28], [3, 30], [6, 30]], 1.1);
  // Antennae
  s += handCurve(rng, [[16, 18], [10, 10], [8, 6]], 0.8);
  s += handCurve(rng, [[16, 19], [12, 12], [10, 8]], 0.8);
  // Eyes
  s += `<circle cx="${jitter(rng, 17, 0.5)}" cy="${jitter(rng, 19, 0.5)}" r="1" fill="currentColor"/>`;
  return s;
}

function genCrab(rng: RNG) {
  // 海鲜 — crab
  let s = "";
  // Body
  s += handCircle(rng, 20, 22, 9, 6);
  // Claws (left)
  s += handCurve(rng, [[11, 20], [6, 16], [3, 14]], 1.3);
  s += handCurve(rng, [[3, 14], [1, 12], [4, 11]], 1.1);
  s += handCurve(rng, [[3, 14], [1, 16], [4, 16]], 1.1);
  // Claws (right)
  s += handCurve(rng, [[29, 20], [34, 16], [37, 14]], 1.3);
  s += handCurve(rng, [[37, 14], [39, 12], [36, 11]], 1.1);
  s += handCurve(rng, [[37, 14], [39, 16], [36, 16]], 1.1);
  // Legs
  s += handCurve(rng, [[13, 26], [8, 30], [6, 32]], 1);
  s += handCurve(rng, [[15, 27], [12, 32], [10, 34]], 1);
  s += handCurve(rng, [[27, 26], [32, 30], [34, 32]], 1);
  s += handCurve(rng, [[25, 27], [28, 32], [30, 34]], 1);
  // Eyes
  s += `<circle cx="${jitter(rng, 17, 0.5)}" cy="${jitter(rng, 19, 0.5)}" r="1.2" fill="currentColor"/>`;
  s += `<circle cx="${jitter(rng, 23, 0.5)}" cy="${jitter(rng, 19, 0.5)}" r="1.2" fill="currentColor"/>`;
  return s;
}

function genSkewer(rng: RNG) {
  // 串串 — skewer with items
  let s = "";
  // Stick
  s += handLine(rng, 20, 4, 20, 36, 1.4);
  // Items on stick (3 pieces)
  s += handCircle(rng, 20, 12, 5, 4, true, 1.2);
  s += handCircle(rng, 20, 22, 5, 4, true, 1.2);
  s += handCircle(rng, 20, 31, 4, 3, true, 1.1);
  return s;
}

function genChili(rng: RNG) {
  // 麻辣烫 / 川菜 — chili pepper
  let s = "";
  // Stem
  s += handCurve(rng, [[20, 6], [22, 8], [21, 10]], 1.2);
  s += handCurve(rng, [[18, 7], [20, 6], [22, 7]], 1);
  // Pepper body (curved)
  s += handCurve(rng, [
    [18, 10], [14, 16], [12, 24], [14, 30], [18, 34], [22, 36],
  ], 1.4);
  s += handCurve(rng, [
    [22, 10], [24, 16], [24, 24], [24, 30], [22, 34], [22, 36],
  ], 1.4);
  // Highlight line
  s += handCurve(rng, [[19, 14], [16, 22], [18, 30]], 0.8);
  return s;
}

function genPizza(rng: RNG) {
  // 披萨 — pizza slice
  let s = "";
  // Slice triangle
  s += handCurve(rng, [[20, 4], [6, 34]], 1.4);
  s += handCurve(rng, [[20, 4], [34, 34]], 1.4);
  // Curved crust at bottom
  s += handArc(rng, 20, 34, 14, Math.PI, 0, 1.5);
  // Toppings (circles)
  s += handCircle(rng, 16, 24, 2.5, 2.5, true, 1);
  s += handCircle(rng, 24, 24, 2, 2, true, 1);
  s += handCircle(rng, 20, 16, 2, 2, true, 1);
  s += handCircle(rng, 19, 28, 1.8, 1.8, true, 0.9);
  return s;
}

function genBurger(rng: RNG) {
  // 汉堡 — stacked burger
  let s = "";
  // Top bun (dome)
  s += handArc(rng, 20, 14, 12, Math.PI, 0, 1.4);
  s += handCurve(rng, [[8, 14], [32, 14]], 1.2);
  // Sesame seeds
  s += `<circle cx="${jitter(rng, 16, 1)}" cy="${jitter(rng, 10, 1)}" r="0.8" fill="currentColor"/>`;
  s += `<circle cx="${jitter(rng, 22, 1)}" cy="${jitter(rng, 8, 1)}" r="0.8" fill="currentColor"/>`;
  s += `<circle cx="${jitter(rng, 25, 1)}" cy="${jitter(rng, 11, 1)}" r="0.8" fill="currentColor"/>`;
  // Lettuce (wavy)
  s += handCurve(rng, [[6, 17], [10, 15], [14, 18], [18, 15], [22, 18], [26, 15], [30, 18], [34, 16]], 1.1);
  // Patty
  s += handCurve(rng, [[8, 20], [32, 20]], 2);
  s += handCurve(rng, [[8, 23], [32, 23]], 2);
  // Cheese (drip)
  s += handCurve(rng, [[7, 25], [12, 25], [13, 28], [16, 25], [24, 25], [25, 27], [28, 25], [33, 25]], 1.1);
  // Bottom bun
  s += handCurve(rng, [[8, 28], [32, 28]], 1.2);
  s += handCurve(rng, [[8, 28], [8, 32], [12, 34], [28, 34], [32, 32], [32, 28]], 1.3);
  return s;
}

function genDrumstick(rng: RNG) {
  // 炸鸡 — chicken drumstick
  let s = "";
  // Meat part (rounded top)
  s += handCurve(rng, [
    [14, 10], [10, 12], [8, 18], [10, 24], [14, 26],
    [26, 26], [30, 24], [32, 18], [30, 12], [26, 10], [14, 10],
  ], 1.4);
  // Bone
  s += handCurve(rng, [[18, 26], [16, 32], [14, 36]], 1.3);
  s += handCurve(rng, [[22, 26], [24, 32], [26, 36]], 1.3);
  // Bone knob
  s += handCircle(rng, 13, 36, 2, 2);
  s += handCircle(rng, 27, 36, 2, 2);
  s += handCurve(rng, [[14, 36], [20, 38], [26, 36]], 1.1);
  // Crispy texture
  s += handCurve(rng, [[14, 16], [18, 18], [14, 20]], 0.7);
  s += handCurve(rng, [[26, 16], [22, 18], [26, 20]], 0.7);
  return s;
}

function genIceCream(rng: RNG) {
  // 冰淇淋 — ice cream cone with scoop
  let s = "";
  // Cone
  s += handCurve(rng, [[12, 20], [20, 38]], 1.3);
  s += handCurve(rng, [[28, 20], [20, 38]], 1.3);
  // Cross-hatch on cone
  s += handLine(rng, 14, 22, 24, 32, 0.7);
  s += handLine(rng, 26, 22, 16, 32, 0.7);
  // Scoop
  s += handCircle(rng, 20, 14, 9, 8, false, 1.4);
  // Drip
  s += handCurve(rng, [[12, 18], [11, 22], [12, 24]], 0.9);
  s += handCurve(rng, [[28, 18], [29, 22], [28, 24]], 0.9);
  return s;
}

function genDumpling(rng: RNG) {
  // 饺子 — crescent dumpling
  let s = "";
  // Bottom curve
  s += handArc(rng, 20, 22, 13, 0, Math.PI, 1.4);
  // Top flat/slight curve
  s += handCurve(rng, [[7, 22], [20, 18], [33, 22]], 1.3);
  // Pleats on top
  const pleats = 5;
  for (let i = 0; i < pleats; i++) {
    const x = 11 + i * 4.5;
    s += handCurve(rng, [[x, 20], [x + 1, 16], [x + 3, 20]], 0.9);
  }
  return s;
}

function genDuck(rng: RNG) {
  // 烤鸭 — roasted duck profile
  let s = "";
  // Body
  s += handCircle(rng, 20, 24, 10, 8);
  // Neck + head
  s += handCurve(rng, [[14, 17], [10, 10], [8, 8]], 1.3);
  s += handCircle(rng, 7, 7, 4, 3.5);
  // Eye
  s += `<circle cx="${jitter(rng, 5, 0.3)}" cy="${jitter(rng, 6, 0.3)}" r="0.9" fill="currentColor"/>`;
  // Beak
  s += handCurve(rng, [[3, 7], [0, 8], [3, 9]], 1.1);
  // Wing detail
  s += handArc(rng, 22, 22, 6, -0.3, Math.PI * 0.7, 1.1);
  // Legs
  s += handLine(rng, 18, 32, 16, 37, 1);
  s += handLine(rng, 22, 32, 24, 37, 1);
  s += handLine(rng, 16, 37, 13, 37, 0.8);
  s += handLine(rng, 24, 37, 27, 37, 0.8);
  return s;
}

function genNoodles(rng: RNG) {
  // 粉面 — noodle bowl with chopsticks
  let s = "";
  // Bowl
  s += handArc(rng, 20, 20, 14, 0, Math.PI, 1.4);
  s += handCurve(rng, [[6, 20], [10, 32], [20, 35], [30, 32], [34, 20]], 1.3);
  // Noodle lines (wavy)
  s += handCurve(rng, [[10, 20], [14, 18], [18, 21], [22, 18], [26, 21], [30, 19]], 1);
  s += handCurve(rng, [[12, 22], [16, 24], [20, 22], [24, 24], [28, 22]], 0.9);
  // Chopsticks
  s += handLine(rng, 14, 6, 24, 20, 1.2);
  s += handLine(rng, 18, 4, 28, 18, 1.2);
  return s;
}

function genTeapot(rng: RNG) {
  // 早茶 / 下午茶 — teapot
  let s = "";
  // Body
  s += handCircle(rng, 20, 22, 10, 9);
  // Lid
  s += handArc(rng, 20, 13, 6, Math.PI, 0, 1.3);
  // Lid knob
  s += handCircle(rng, 20, 10, 2, 2);
  // Spout
  s += handCurve(rng, [[30, 20], [34, 16], [36, 12]], 1.3);
  s += handCurve(rng, [[30, 22], [33, 19], [35, 15]], 1.1);
  // Handle
  s += handArc(rng, 10, 22, 5, Math.PI * 0.5, Math.PI * 1.5, 1.3);
  // Steam
  s += handCurve(rng, [[35, 11], [36, 7], [34, 4]], 0.8);
  return s;
}

function genSteak(rng: RNG) {
  // 西餐 — steak on plate
  let s = "";
  // Plate (ellipse)
  s += handCircle(rng, 20, 24, 15, 9, false, 1.2);
  // Steak shape (irregular oval)
  s += handCurve(rng, [
    [12, 22], [14, 18], [20, 16], [26, 18], [28, 22],
    [26, 26], [20, 28], [14, 26], [12, 22],
  ], 1.4);
  // Grill marks
  s += handLine(rng, 14, 20, 26, 20, 1.1);
  s += handLine(rng, 14, 23, 26, 23, 1.1);
  s += handLine(rng, 15, 26, 25, 26, 1);
  // Herb garnish
  s += handCurve(rng, [[28, 20], [31, 18], [30, 16]], 0.8);
  s += handCurve(rng, [[28, 20], [30, 17], [32, 16]], 0.8);
  return s;
}

function genWok(rng: RNG) {
  // 粤菜 / 湘菜 / 韩餐 — wok
  let s = "";
  // Wok body
  s += handArc(rng, 20, 18, 14, 0, Math.PI, 1.5);
  s += handCurve(rng, [[6, 18], [10, 32], [20, 36], [30, 32], [34, 18]], 1.3);
  // Handle
  s += handCurve(rng, [[34, 18], [38, 16], [40, 18]], 1.3);
  // Steam / stir-fry wisps
  s += handCurve(rng, [[14, 16], [12, 10], [14, 6]], 0.9);
  s += handCurve(rng, [[20, 16], [20, 8], [18, 4]], 0.9);
  s += handCurve(rng, [[26, 16], [28, 10], [26, 6]], 0.9);
  // Food bits inside
  s += handCircle(rng, 16, 22, 2, 1.5, true, 0.8);
  s += handCircle(rng, 22, 24, 2.5, 1.5, true, 0.8);
  s += handCircle(rng, 26, 21, 2, 1.5, true, 0.8);
  return s;
}

function genCocktail(rng: RNG) {
  // 酒吧 — martini glass
  let s = "";
  // Glass V-shape
  s += handCurve(rng, [[6, 8], [20, 24]], 1.3);
  s += handCurve(rng, [[34, 8], [20, 24]], 1.3);
  // Rim
  s += handCurve(rng, [[6, 8], [34, 8]], 1.2);
  // Stem
  s += handLine(rng, 20, 24, 20, 34, 1.3);
  // Base
  s += handCurve(rng, [[12, 34], [20, 35], [28, 34]], 1.3);
  // Olive/cherry
  s += handCircle(rng, 18, 14, 2, 2, true, 1);
  // Toothpick
  s += handLine(rng, 16, 10, 22, 18, 0.9);
  return s;
}

function genBento(rng: RNG) {
  // 自助餐 — bento box with dividers
  let s = "";
  // Outer box
  s += handCurve(rng, [[6, 8], [34, 8], [34, 34], [6, 34], [6, 8]], 1.4);
  // Horizontal divider
  s += handLine(rng, 6, 21, 34, 21, 1.2);
  // Vertical divider (top half)
  s += handLine(rng, 20, 8, 20, 21, 1.2);
  // Food items — rice dots in bottom
  for (let i = 0; i < 4; i++) {
    const x = 12 + i * 5 + jitter(rng, 0, 1);
    const y = 27 + jitter(rng, 0, 1);
    s += `<circle cx="${x}" cy="${y}" r="1.2" fill="currentColor" opacity="0.5"/>`;
  }
  // Food in top-left (circle items)
  s += handCircle(rng, 13, 14, 3, 3, true, 0.9);
  // Food in top-right (wavy)
  s += handCurve(rng, [[23, 12], [27, 14], [23, 16], [27, 18]], 0.9);
  return s;
}

function genShop(rng: RNG) {
  // 探店 — little storefront
  let s = "";
  // Roof / awning
  s += handCurve(rng, [[6, 14], [12, 8], [20, 6], [28, 8], [34, 14]], 1.4);
  // Scalloped awning bottom
  s += handCurve(rng, [[6, 14], [10, 17], [14, 14], [18, 17], [22, 14], [26, 17], [30, 14], [34, 14]], 1.1);
  // Shop body
  s += handLine(rng, 8, 14, 8, 34, 1.3);
  s += handLine(rng, 32, 14, 32, 34, 1.3);
  // Floor
  s += handCurve(rng, [[8, 34], [32, 34]], 1.2);
  // Door
  s += handCurve(rng, [[16, 34], [16, 22], [24, 22], [24, 34]], 1.1);
  // Doorknob
  s += `<circle cx="${jitter(rng, 22, 0.3)}" cy="${jitter(rng, 28, 0.3)}" r="0.9" fill="currentColor"/>`;
  // Sign
  s += handCurve(rng, [[10, 16], [10, 20], [14, 20], [14, 16]], 0.9);
  return s;
}

// ── Category → Generator Map ────────────────────────────

const FOOD_DOODLE_MAP: Record<string, (rng: RNG) => string> = {
  "烧烤": genFire,
  "火锅": genHotPot,
  "烤鱼": genFish,
  "甜品": genCake,
  "抹茶": genMatchaBowl,
  "咖啡": genCoffee,
  "奶茶": genBoba,
  "面包": genBread,
  "日料": genSushi,
  "小龙虾": genCrawfish,
  "海鲜": genCrab,
  "串串": genSkewer,
  "麻辣烫": genChili,
  "披萨": genPizza,
  "汉堡": genBurger,
  "炸鸡": genDrumstick,
  "冰淇淋": genIceCream,
  "饺子": genDumpling,
  "烤鸭": genDuck,
  "粉面": genNoodles,
  "早茶": genTeapot,
  "下午茶": genTeapot,
  "西餐": genSteak,
  "川菜": genChili,
  "粤菜": genWok,
  "湘菜": genWok,
  "韩餐": genWok,
  "酒吧": genCocktail,
  "自助餐": genBento,
  "探店": genShop,
};

// ── Public API ──────────────────────────────────────────

/**
 * Get the hand-drawn SVG inner content for a food category.
 * Returns empty string if category is not mapped.
 */
export function getFoodDoodleSvg(category: string, seed = 42): string {
  const gen = FOOD_DOODLE_MAP[category];
  if (!gen) return "";
  const rng = mulberry32(seed);
  return gen(rng);
}

/** Check if a category has a doodle icon */
export function hasFoodDoodle(category: string): boolean {
  return category in FOOD_DOODLE_MAP;
}
