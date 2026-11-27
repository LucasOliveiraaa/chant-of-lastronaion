import Vector2 from "../../../../engine/math/Vector2.js";
import { isWalkable } from "../../dungeon/tiles/Tiles.js";
import { TILE_WIDTH } from "../../Config.js";

// Navigation cells per tile side.
export const NAV_SUBDIVISION = 4;

const SQRT2 = Math.SQRT2;
// Breaks ties towards the goal.
const HEURISTIC_WEIGHT = 1.001;

// dx, dy, cost
const NEIGHBORS = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2],
];

// Each cell stores its Chebyshev distance to the nearest blocked cell, so one grid serves
// every body size. Doors are blocked to keep enemies in their chamber.
export default class NavGrid {
    static #cache = new WeakMap();

    static forChamber(chamber) {
        if (!chamber || chamber.isDestroyed || !chamber.blueprint) return null;

        let grid = NavGrid.#cache.get(chamber);
        if (!grid) {
            grid = new NavGrid(chamber);
            NavGrid.#cache.set(chamber, grid);
        }
        return grid;
    }

    constructor(chamber) {
        this.chamber = chamber;
        this.cellSize = TILE_WIDTH / NAV_SUBDIVISION;

        const { min, max } = chamber.bounds;
        this.originX = min.x;
        this.originY = min.y;
        this.width = Math.round((max.x - min.x) / this.cellSize);
        this.height = Math.round((max.y - min.y) / this.cellSize);

        const size = this.width * this.height;
        this.walkable = new Uint8Array(size);
        this.clearance = new Uint16Array(size);

        // A* scratch; a cell's entries are valid when its stamp matches the current search.
        this._g = new Float64Array(size);
        this._parent = new Int32Array(size);
        this._stamp = new Uint32Array(size);
        this._closed = new Uint32Array(size);
        this._search = 0;
        this._heap = new MinHeap();

        this.#markTiles(chamber);
        this.#computeClearance();
    }

    // The chamber's tile layer starts at the grid's origin, one tile = sub x sub cells.
    #markTiles(chamber) {
        const sub = NAV_SUBDIVISION;

        for (const { x, y, value: tileId } of chamber.blueprint.tiles.entries()) {
            if (!isWalkable(tileId)) continue;

            const gx = x * sub, gy = y * sub;
            for (let dy = 0; dy < sub; dy++) {
                for (let dx = 0; dx < sub; dx++) {
                    this.walkable[this.index(gx + dx, gy + dy)] = 1;
                }
            }
        }
    }

    #computeClearance() {
        const { width, height, walkable, clearance } = this;
        const queue = new Int32Array(width * height);
        let head = 0, tail = 0;

        clearance.fill(0xffff);
        for (let i = 0; i < walkable.length; i++) {
            if (!walkable[i]) {
                clearance[i] = 0;
                queue[tail++] = i;
            }
        }
        for (let i = 0; i < walkable.length; i++) {
            if (!walkable[i]) continue;
            const x = i % width, y = (i / width) | 0;
            if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
                clearance[i] = 1;
                queue[tail++] = i;
            }
        }

        while (head < tail) {
            const i = queue[head++];
            const x = i % width, y = (i / width) | 0;
            const next = clearance[i] + 1;

            for (const [dx, dy] of NEIGHBORS) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                const n = ny * width + nx;
                if (clearance[n] <= next) continue;
                clearance[n] = next;
                queue[tail++] = n;
            }
        }
    }

    requiredClearance(halfExtent) {
        return Math.max(1, Math.ceil(halfExtent / this.cellSize + 0.5 - 1e-9));
    }

    index(gx, gy) {
        return gy * this.width + gx;
    }

    inBounds(gx, gy) {
        return gx >= 0 && gy >= 0 && gx < this.width && gy < this.height;
    }

    cellX(worldX) {
        return Math.floor((worldX - this.originX) / this.cellSize);
    }

    cellY(worldY) {
        return Math.floor((worldY - this.originY) / this.cellSize);
    }

    contains(point) {
        return this.inBounds(this.cellX(point.x), this.cellY(point.y));
    }

    cellCenter(gx, gy) {
        return new Vector2(
            this.originX + (gx + 0.5) * this.cellSize,
            this.originY + (gy + 0.5) * this.cellSize
        );
    }

    passable(gx, gy, required) {
        return this.inBounds(gx, gy) && this.clearance[this.index(gx, gy)] >= required;
    }

    passableAt(point, required) {
        return this.passable(this.cellX(point.x), this.cellY(point.y), required);
    }

    // required = 1 is a plain line of sight check.
    lineClear(a, b, required) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (this.cellSize / 2)));

        for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            if (!this.passable(this.cellX(a.x + dx * t), this.cellY(a.y + dy * t), required)) return false;
        }
        return true;
    }

    nearestPassable(gx, gy, required, maxRadius = 8) {
        if (this.passable(gx, gy, required)) return { gx, gy };

        for (let r = 1; r <= maxRadius; r++) {
            let best = null;
            let bestDist = Infinity;
            for (let y = gy - r; y <= gy + r; y++) {
                for (let x = gx - r; x <= gx + r; x++) {
                    if (Math.max(Math.abs(x - gx), Math.abs(y - gy)) !== r) continue;
                    if (!this.passable(x, y, required)) continue;
                    const d = (x - gx) ** 2 + (y - gy) ** 2;
                    if (d < bestDist) {
                        bestDist = d;
                        best = { gx: x, gy: y };
                    }
                }
            }
            if (best) return best;
        }
        return null;
    }

    // When the goal is unreachable, the path leads to the closest reachable cell.
    findPath(start, goal, required) {
        const startCell = this.nearestPassable(this.cellX(start.x), this.cellY(start.y), required);
        if (!startCell) return null;

        const goalX = Math.max(0, Math.min(this.width - 1, this.cellX(goal.x)));
        const goalY = Math.max(0, Math.min(this.height - 1, this.cellY(goal.y)));
        const goalCell = this.nearestPassable(goalX, goalY, required, 16) ?? { gx: goalX, gy: goalY };

        const { width, _g: g, _parent: parent, _stamp: stamp, _closed: closed, _heap: heap } = this;
        const search = ++this._search;
        const startIndex = this.index(startCell.gx, startCell.gy);
        const goalIndex = this.index(goalCell.gx, goalCell.gy);

        const heuristic = (x, y) => {
            const dx = Math.abs(x - goalCell.gx), dy = Math.abs(y - goalCell.gy);
            return (dx + dy + (SQRT2 - 2) * Math.min(dx, dy)) * HEURISTIC_WEIGHT;
        };

        heap.clear();
        g[startIndex] = 0;
        parent[startIndex] = -1;
        stamp[startIndex] = search;
        heap.push(startIndex, heuristic(startCell.gx, startCell.gy));

        let best = startIndex;
        let bestH = Infinity;

        while (heap.size) {
            const current = heap.pop();
            if (closed[current] === search) continue;
            closed[current] = search;

            const x = current % width, y = (current / width) | 0;
            const h = heuristic(x, y);
            if (h < bestH) {
                bestH = h;
                best = current;
            }
            if (current === goalIndex) break;

            for (const [dx, dy, cost] of NEIGHBORS) {
                const nx = x + dx, ny = y + dy;
                if (!this.passable(nx, ny, required)) continue;
                if (dx !== 0 && dy !== 0 && (!this.passable(x + dx, y, required) || !this.passable(x, y + dy, required))) continue;

                const n = ny * width + nx;
                if (closed[n] === search) continue;

                const tentative = g[current] + cost;
                if (stamp[n] === search && tentative >= g[n]) continue;

                stamp[n] = search;
                g[n] = tentative;
                parent[n] = current;
                heap.push(n, tentative + heuristic(nx, ny));
            }
        }

        const reached = best === goalIndex;
        const cells = [];
        for (let i = best; i !== -1; i = parent[i]) cells.push(i);
        cells.reverse();

        const points = cells.map(i => this.cellCenter(i % width, (i / width) | 0));
        if (reached && this.passableAt(goal, required)) points[points.length - 1] = goal.clone();

        return { points: this.#smooth(points, required), reached };
    }

    // String pulling.
    #smooth(points, required) {
        if (points.length <= 2) return points;

        const result = [points[0]];
        let anchor = points[0];
        let i = 1;
        while (i < points.length - 1) {
            let j = i;
            while (j + 1 < points.length && this.lineClear(anchor, points[j + 1], required)) j++;
            result.push(points[j]);
            anchor = points[j];
            i = j + 1;
        }
        if (result[result.length - 1] !== points[points.length - 1]) result.push(points[points.length - 1]);
        return result;
    }
}

class MinHeap {
    items = [];
    priorities = [];

    get size() {
        return this.items.length;
    }

    clear() {
        this.items.length = 0;
        this.priorities.length = 0;
    }

    push(item, priority) {
        const { items, priorities } = this;
        let i = items.length;
        items.push(item);
        priorities.push(priority);

        while (i > 0) {
            const p = (i - 1) >> 1;
            if (priorities[p] <= priority) break;
            items[i] = items[p];
            priorities[i] = priorities[p];
            i = p;
        }
        items[i] = item;
        priorities[i] = priority;
    }

    pop() {
        const { items, priorities } = this;
        const top = items[0];
        const lastItem = items.pop();
        const lastPriority = priorities.pop();
        const n = items.length;
        if (n === 0) return top;

        let i = 0;
        while (true) {
            const l = 2 * i + 1;
            if (l >= n) break;
            const r = l + 1;
            const c = r < n && priorities[r] < priorities[l] ? r : l;
            if (priorities[c] >= lastPriority) break;
            items[i] = items[c];
            priorities[i] = priorities[c];
            i = c;
        }
        items[i] = lastItem;
        priorities[i] = lastPriority;
        return top;
    }
}
