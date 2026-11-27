import Vector2 from "../../../engine/math/Vector2.js";

// Clockwise from north (the weapon's forward), 45° apart.
export const COMPASS = Object.freeze(["n", "ne", "e", "se", "s", "sw", "w", "nw"]);

const SECTOR = 360 / COMPASS.length;
// Integration resolution: 1° per sample.
const SAMPLES_PER_SECTOR = 45;
const SAMPLES = SAMPLES_PER_SECTOR * COMPASS.length;
const SAMPLE_DEGREES = 360 / SAMPLES;
const SAMPLE_RADIANS = SAMPLE_DEGREES * Math.PI / 180;

// Shape strength (0-1) at an angle in degrees clockwise from north, linearly interpolated
// between the two neighbouring compass directions so the boundary is continuous.
export function strengthAt(shape, angle) {
    const t = (((angle % 360) + 360) % 360) / SECTOR;
    const index = Math.floor(t);
    const f = t - index;
    const from = shape[COMPASS[index % COMPASS.length]];
    const to = shape[COMPASS[(index + 1) % COMPASS.length]];
    return from + (to - from) * f;
}

// Unit vector for an angle in degrees clockwise from north (screen space, y points down).
export function directionAt(angle) {
    return Vector2.up().rotate(angle);
}

/**
 * Projectile paths from the origin that cover `shape` scaled to `range`.
 *
 * Each path ends exactly on the boundary (distance = range × strength). Paths are spread
 * evenly along the boundary's sweep (∫ reach dθ), `spacing` pixels apart, so far-reaching
 * directions get more projectiles, near ones fewer, and the gap between neighbours never
 * exceeds `spacing` anywhere inside the shape. Spacing a projectile's diameter apart
 * makes them just touch at the edge: no gaps, no extra overlap.
 *
 * The pattern is in the shape's default orientation (north forward); rotate the
 * directions to aim it. Returns [{ angle, direction, distance }].
 *
 * @param shape         { n, ne, e, se, s, sw, w, nw } strengths in 0-1.
 * @param range         Distance reached by a strength of 1, in pixels.
 * @param spacing       Largest gap between neighbouring paths at the boundary, in pixels.
 * @param maxCount      Upper bound; past it the spacing widens instead.
 * @param minDistance   Shorter paths are dropped (strength ~0 gives no projectile).
 */
export function generateProjectilePattern(shape, range, spacing, maxCount = Infinity, minDistance = 0) {
    if (!(range > 0) || !(spacing > 0) || !(maxCount >= 1)) return [];

    // Start at the strongest direction: it always gets a path, and symmetric shapes stay symmetric.
    let strongest = 0;
    COMPASS.forEach((key, i) => {
        if (shape[key] > shape[COMPASS[strongest]]) strongest = i;
    });
    const start = strongest * SECTOR;

    // sweep[i] = ∫ reach dθ from start to sample i: the boundary length seen from the origin.
    const sweep = new Float64Array(SAMPLES + 1);
    let previousReach = range * strengthAt(shape, start);
    for (let i = 1; i <= SAMPLES; i++) {
        const reach = range * strengthAt(shape, start + i * SAMPLE_DEGREES);
        sweep[i] = sweep[i - 1] + (previousReach + reach) / 2 * SAMPLE_RADIANS;
        previousReach = reach;
    }

    const total = sweep[SAMPLES];
    if (!(total > 0)) return [];

    const count = Math.min(Math.max(1, Math.round(total / spacing)), Math.floor(maxCount));
    const step = total / count;

    const pattern = [];
    let i = 0;
    for (let k = 0; k < count; k++) {
        const target = k * step;
        while (i < SAMPLES - 1 && sweep[i + 1] < target) i++;

        const segment = sweep[i + 1] - sweep[i];
        const f = segment > 0 ? (target - sweep[i]) / segment : 0;
        const angle = (start + (i + f) * SAMPLE_DEGREES) % 360;
        const distance = range * strengthAt(shape, angle);

        if (distance < minDistance || distance <= 0) continue;
        pattern.push({ angle, direction: directionAt(angle), distance });
    }

    return pattern;
}
