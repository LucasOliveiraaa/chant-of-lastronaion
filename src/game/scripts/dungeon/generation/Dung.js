// Este arquivo contém a implementação do algoritimo de geração de dungeons (Dungeon Generation, DunG).
// Eu, Lucas, estou implementando em TypeScript primeiro porque não vejo como fazer sem TIPOOSSSSS.
// Basicamente esse algoritimo é uma modificação de um Wave-function Collapser. Isso é necessário já que o WFC não tem a ideia de espaços em branco ou o tamanho esperado para uma dungeon, então eu adicionei algumas patches para que ele gere uma dungeon válida, sem salas órfãs (sem conexões com a sala inicial) e com um tamanho controlável.

// How it plugs into the game (see ../README.md for the whole pipeline):
//   input  - a Map of rooms, one per dungeon cell, compiled from the chamber catalog by
//            ChamberLibrary. Dung only reads id, doors, connections, weight and kind; the
//            game attaches extra fields (the chamber blueprint) that pass through untouched.
//   output - one PlacedRoom per occupied cell. Cells of the same chamber share `instance`,
//            which is what DungeonManager turns into a ChamberManager when the player enters.
//
// Steps: resolveConfig (defaults) -> buildInfos (footprint of every chamber) -> Attempt.run
// (collapse the frontier one cell at a time) -> Attempt.finish (validate the result).
// With boss.exit set, each boss is placed with exactly one extra door, and the cell behind
// it is filled right away with a dead-end room of the exit kind. Failed
// attempts are retried with the same rng until one passes or maxAttempts runs out.

import Vector2 from "../../../../engine/math/Vector2.js";

const DIRS = [
    { name: "top", opposite: "bottom", dx: 0, dy: -1 },
    { name: "right", opposite: "left", dx: 1, dy: 0 },
    { name: "bottom", opposite: "top", dx: 0, dy: 1 },
    { name: "left", opposite: "right", dx: -1, dy: 0 },
];

const key = (x, y) => (x + 32768) * 65536 + (y + 32768);

function mulberry32(seed) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pickWeighted(weights, rng) {
    let total = 0;
    for (const w of weights) total += w;
    if (!(total > 0)) return -1;
    let r = rng() * total;
    let last = -1;
    for (let i = 0; i < weights.length; i++) {
        if (!(weights[i] > 0)) continue;
        last = i;
        r -= weights[i];
        if (r < 0) return i;
    }
    return last;
}

// ---- Configuration ----------------------------------------------------------------

function resolveConfig(config) {
    const tolerance = config.size.tolerance ?? 0.2;
    const target = config.size.target;
    if (!(target > 0)) throw new Error("size.target must be greater than 0");
    if (tolerance < 0) throw new Error("size.tolerance can't be negative");

    const seed = config.rng ? undefined : (config.seed ?? Date.now());
    const cfg = {
        rng: config.rng ?? mulberry32(seed),
        seed,
        maxAttempts: config.maxAttempts ?? 100,
        target,
        minRooms: Math.ceil(target * (1 - tolerance)),
        maxRooms: Math.floor(target * (1 + tolerance)),
        sizeControl: config.size.control ?? true,
        growthBias: config.size.growthBias ?? 12,
        aim: config.size.aim ?? 0.75, // open slots always become rooms, so it overshoots if aimed at 1
        maxExtent: config.size.maxExtent ?? Infinity,
        bossDistance: config.boss?.distance ?? 0,
        bossTolerance: config.boss?.tolerance ?? 1,
        bossCount: config.boss ? (config.boss.count ?? 1) : 0,
        bossBoost: config.boss?.boost ?? 20,
        exitKind: config.boss?.exit ?? null,
        order: config.layout?.order ?? "entropy",
        loopBias: config.layout?.loopBias ?? 1,
        spread: config.layout?.spread ?? 0,
        deadEndPenalty: config.layout?.deadEndPenalty ?? 0.05,
        kinds: config.kinds ?? {},
        weightModifier: config.weightModifier,
    };

    if (cfg.bossCount > 0 && cfg.bossDistance + 1 > cfg.maxRooms) {
        throw new Error("boss.distance doesn't fit in the target size");
    }
    return cfg;
}

// ---- Footprints ---------------------------------------------------------------------

// Footprint of every room seen from each one of its cells (the anchor)
function buildInfos(roomDict) {
    // symmetric links, even if only one side declares the connection
    const links = new Map();
    for (const id of roomDict.keys()) links.set(id, new Map());
    for (const room of roomDict.values()) {
        for (const d of DIRS) {
            const other = room.connections[d.name];
            if (other === null) continue;
            if (!links.has(other)) throw new Error(`Room ${room.id} connects to ${other}, which doesn't exist`);
            links.get(room.id).set(d.name, other);
            links.get(other).set(d.opposite, room.id);
        }
    }

    const infos = new Map();
    for (const anchor of roomDict.keys()) {
        const cells = [{ id: anchor, dx: 0, dy: 0 }];
        const cellAt = new Map([[key(0, 0), anchor]]);
        const seen = new Set([anchor]);

        for (let i = 0; i < cells.length; i++) {
            const cur = cells[i];
            for (const d of DIRS) {
                const next = links.get(cur.id).get(d.name);
                if (next === undefined) continue;
                const nx = cur.dx + d.dx, ny = cur.dy + d.dy;
                const at = cellAt.get(key(nx, ny));
                if (at !== undefined) {
                    if (at !== next) throw new Error(`Inconsistent layout in room ${anchor}`);
                    continue;
                }
                if (seen.has(next)) throw new Error(`Inconsistent layout in room ${anchor}`);
                seen.add(next);
                cellAt.set(key(nx, ny), next);
                cells.push({ id: next, dx: nx, dy: ny });
            }
        }

        const kinds = cells.map(c => roomDict.get(c.id).kind ?? "normal");
        infos.set(anchor, {
            priority: Math.max(...cells.map(c => roomDict.get(c.id).priority ?? 0)),
            cells,
            cellAt,
            // divided by the cell count, otherwise big rooms get more anchors
            weight: (roomDict.get(anchor).weight ?? 1) / cells.length,
            kind: kinds.find(k => k !== "normal") ?? "normal",
            span: Math.max(...cells.map(c => Math.max(Math.abs(c.dx), Math.abs(c.dy)))),
        });
    }
    return infos;
}

// ---- One generation attempt ----------------------------------------------------------

class Attempt {
    grid = new Map();
    frontier = new Map(); // empty cells with a door pointing at them
    depths = [];          // distance of each instance through its entry path
    kindCounts = new Map();
    bossInstances = [];
    exitSlots = new Set(); // cells right after a boss, reserved for its exit room

    constructor(roomDict, infos, spawnable, cfg, maxSpan) {
        this.roomDict = roomDict;
        this.infos = infos;
        this.spawnable = spawnable;
        this.cfg = cfg;
        this.maxSpan = maxSpan;
    }

    run(initialRoom) {
        this.place(this.infos.get(initialRoom), 0, 0, 0);
        while (this.frontier.size > 0) {
            const reason = this.step();
            if (reason) return { reason };
        }
        return this.finish();
    }

    // Returns a failure reason, or null if everything is fine
    step() {
        const { cfg } = this;
        const entries = [...this.frontier.values()];

        for (const e of entries) {
            e.depth = this.depthAt(e.x, e.y);
            if (!e.candidates) {
                e.candidates = this.exitSlots.has(key(e.x, e.y)) ? this.getExitCandidates(e.x, e.y) : this.getCandidates(e.x, e.y);
                e.entropy = undefined;
            }
            if (e.candidates.length === 0) return "contradiction";
        }

        // A boss was just placed: its exit room goes behind it before anything else.
        const slot = entries.find(e => this.exitSlots.has(key(e.x, e.y)));
        if (slot) {
            const weights = slot.candidates.map(c => c.info.weight);
            this.applyPriority(slot.candidates, weights);
            const i = pickWeighted(weights, cfg.rng);
            if (i < 0) return "no-valid-weight";
            this.place(slot.candidates[i].info, slot.x, slot.y, slot.depth);
            return null;
        }

        // Missing boss: force it as soon as a cell reaches the right distance
        const needBoss = this.bossInstances.length < cfg.bossCount;
        let forced;
        if (needBoss) {
            const noShallow = entries.every(e => e.depth >= cfg.bossDistance);
            const ready = entries.filter(e =>
                Math.abs(e.depth - cfg.bossDistance) <= cfg.bossTolerance &&
                (e.depth >= cfg.bossDistance || noShallow) &&
                e.candidates.some(c => c.info.kind === "boss"));
            if (ready.length > 0) forced = ready[Math.floor(cfg.rng() * ready.length)];
        }

        const target = forced ?? this.selectEntry(entries);
        let cands = target.candidates;

        if (forced) {
            cands = cands.filter(c => c.info.kind === "boss");
        } else if (cfg.sizeControl && this.depths.length + this.frontier.size > cfg.maxRooms) {
            // over the limit: only what opens the fewest doors
            const min = Math.min(...cands.map(c => c.delta));
            cands = cands.filter(c => c.delta === min);
        }

        const weights = cands.map(c => this.weightOf(c, target, needBoss));
        this.applyPriority(cands, weights);
        const i = pickWeighted(weights, cfg.rng);
        if (i < 0) return "no-valid-weight";
        this.place(cands[i].info, target.x, target.y, target.depth);
        return null;
    }

    // Per kind, the highest-priority candidates that can be placed win: lower-priority ones
    // are dropped, except where size control needs them. Over the target size, a lower one
    // that opens fewer doors than every higher one stays in, so priority never makes the
    // dungeon overshoot.
    applyPriority(cands, weights) {
        const top = new Map(); // kind -> { priority, minDelta } of the best tier that can be placed
        cands.forEach((c, i) => {
            if (!(weights[i] > 0)) return;
            const t = top.get(c.info.kind);
            if (!t || c.info.priority > t.priority) top.set(c.info.kind, { priority: c.info.priority, minDelta: c.delta });
            else if (c.info.priority === t.priority) t.minDelta = Math.min(t.minDelta, c.delta);
        });

        const overTarget = this.cfg.sizeControl && this.sizePressure() > 0;
        cands.forEach((c, i) => {
            const t = top.get(c.info.kind);
            if (!t || c.info.priority >= t.priority) return;
            if (overTarget && c.delta < t.minDelta) return;
            weights[i] = 0;
        });
    }

    // > 0 when the projected size is past the size the generator aims for.
    sizePressure() {
        const { cfg } = this;
        const projected = this.depths.length + this.frontier.size;
        return Math.max(-1, Math.min(2, (projected - cfg.target * cfg.aim) / cfg.target));
    }

    selectEntry(entries) {
        const { cfg } = this;
        switch (cfg.order) {
            case "bfs": return entries[0];
            case "dfs": return entries[entries.length - 1];
            case "random": return entries[Math.floor(cfg.rng() * entries.length)];
        }

        // Shannon entropy of the base weights, lowest first (ties are random)
        let best = Infinity;
        let pool = [];
        for (const e of entries) {
            e.entropy ??= this.entropyOf(e.candidates);
            if (e.entropy < best - 1e-9) { best = e.entropy; pool = [e]; }
            else if (e.entropy < best + 1e-9) pool.push(e);
        }
        return pool[Math.floor(cfg.rng() * pool.length)];
    }

    entropyOf(cands) {
        let sum = 0, sumLog = 0;
        for (const c of cands) {
            const w = c.info.weight * (this.cfg.kinds[c.info.kind]?.weight ?? 1);
            if (w <= 0) continue;
            sum += w;
            sumLog += w * Math.log(w);
        }
        return sum > 0 ? Math.log(sum) - sumLog / sum : 0;
    }

    weightOf(c, at, needBoss) {
        const { cfg } = this;
        const kind = c.info.kind;
        let w = c.info.weight;

        if (kind === "boss") {
            if (this.bossInstances.length >= cfg.bossCount) return 0;
            if (Math.abs(at.depth - cfg.bossDistance) > cfg.bossTolerance) return 0;
            // Never before its distance: grabbing the first cell within tolerance ended the
            // growth early (no boss left to reach, so every branch closed) and packed the
            // whole dungeon around the start. The tolerance is still accepted when a cell
            // can only be reached that way (forced placement) and in the final check.
            if (at.depth < cfg.bossDistance) return 0;
            w *= cfg.bossBoost;
        } else {
            const rule = cfg.kinds[kind];
            const count = this.kindCounts.get(kind) ?? 0;
            if (rule?.max !== undefined && count >= rule.max) return 0;
            w *= rule?.weight ?? 1;
            if (rule?.min !== undefined && count < rule.min) w *= 10;

            // no boss yet and still far: avoid dead ends, closing the last way on only as a last resort
            if (needBoss && at.depth < cfg.bossDistance && c.delta < 0) {
                w *= cfg.deadEndPenalty;
                if (this.frontier.size <= 1) w *= cfg.deadEndPenalty * cfg.deadEndPenalty;
            }

            // size control: over the target discourages doors, under encourages them
            if (cfg.sizeControl) {
                w *= Math.exp(-cfg.growthBias * this.sizePressure() * c.delta);
            }
            if (c.loops > 0) w *= Math.pow(cfg.loopBias, c.loops);
            // open layouts: discourage squeezing into built-up spots and doors facing them
            if (cfg.spread > 0) w *= Math.exp(-cfg.spread * c.crowding);
        }

        if (cfg.weightModifier) {
            w *= cfg.weightModifier({
                room: c.id, cells: c.info.cells.map(cell => cell.id), kind, x: at.x, y: at.y, distance: at.depth,
                roomCount: this.depths.length, frontierSize: this.frontier.size,
                newDoors: c.open, loops: c.loops, weight: w,
            });
        }
        return w;
    }

    getCandidates(x, y) {
        const { cfg } = this;
        const out = [];
        for (const [id, info] of this.spawnable) {
            if (info.kind === cfg.exitKind) continue; // only behind a boss, see getExitCandidates
            const fit = this.tryFit(info, x, y);
            if (!fit) continue;
            // a boss with an exit needs exactly one way in, one way out, and room for the exit there
            if (info.kind === "boss" && cfg.exitKind && !(fit.joined === 1 && fit.open === 1 && this.exitFits(info, x, y, fit.targets[0]))) continue;
            // delta: new open doors - 1 (the entry slot gets filled)
            out.push({
                id, info, delta: fit.open - 1, open: fit.open, loops: Math.max(0, fit.joined - 1),
                crowding: cfg.spread > 0 ? this.crowdingOf(info, x, y, fit.targets) : 0,
            });
        }
        return out;
    }

    getExitCandidates(x, y) {
        const out = [];
        for (const [id, info] of this.spawnable) {
            if (info.kind !== this.cfg.exitKind) continue;
            const fit = this.tryFit(info, x, y);
            if (fit && fit.open === 0) out.push({ id, info, delta: -1, open: 0, loops: 0, crowding: 0 });
        }
        return out;
    }

    // Whether an exit room fits at `slot` once the boss is placed at (x, y).
    exitFits(info, x, y, slot) {
        const cells = info.cells.map(c => [key(x + c.dx, y + c.dy), { room: c.id }]);
        for (const [k, v] of cells) this.grid.set(k, v);
        try {
            for (const [, exit] of this.spawnable) {
                if (exit.kind !== this.cfg.exitKind) continue;
                const fit = this.tryFit(exit, slot.x, slot.y);
                if (fit && fit.open === 0) return true;
            }
            return false;
        } finally {
            for (const [k] of cells) this.grid.delete(k);
        }
    }

    // How built-up a placement is: taken cells around the room (diagonals too), new doors
    // whose slot touches existing rooms (it will squeeze in between them), and new doors
    // that don't lead farther from the start (the map folds back on itself).
    crowdingOf(info, x, y, targets) {
        const own = new Set(info.cells.map(c => key(x + c.dx, y + c.dy)));
        const seen = new Set();
        let crowd = 0;
        for (const c of info.cells) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const k = key(x + c.dx + dx, y + c.dy + dy);
                    if (own.has(k) || seen.has(k)) continue;
                    seen.add(k);
                    if (this.grid.has(k)) crowd++;
                }
            }
        }
        for (const t of targets) {
            for (const d of DIRS) {
                const k = key(t.x + d.dx, t.y + d.dy);
                if (!own.has(k) && this.grid.has(k)) crowd++;
            }
            if (t.x * t.x + t.y * t.y <= t.fromX * t.fromX + t.fromY * t.fromY) crowd++;
        }
        return crowd;
    }

    // null if it doesn't fit; open = doors to empty cells (targets = those cells),
    // joined = doors to existing rooms
    tryFit(info, x, y) {
        const ext = this.cfg.maxExtent;
        let open = 0, joined = 0;
        const targets = [];

        for (const cell of info.cells) {
            const cx = x + cell.dx, cy = y + cell.dy;
            if (this.grid.has(key(cx, cy)) || Math.abs(cx) > ext || Math.abs(cy) > ext) return null;
            const doors = this.roomDict.get(cell.id).doors;

            for (const d of DIRS) {
                const isOpen = doors[d.name];

                const inner = info.cellAt.get(key(cell.dx + d.dx, cell.dy + d.dy));
                if (inner !== undefined) {
                    if (isOpen !== this.roomDict.get(inner).doors[d.opposite]) return null;
                    continue;
                }

                const nx = cx + d.dx, ny = cy + d.dy;
                if (Math.abs(nx) > ext || Math.abs(ny) > ext) {
                    if (isOpen) return null; // door out of bounds
                    continue;
                }

                const neighbor = this.grid.get(key(nx, ny));
                if (neighbor) {
                    if (isOpen !== this.roomDict.get(neighbor.room).doors[d.opposite]) return null;
                    if (isOpen) joined++;
                } else if (isOpen) {
                    open++;
                    targets.push({ x: nx, y: ny, fromX: cx, fromY: cy });
                }
            }
        }
        return { open, joined, targets };
    }

    depthAt(x, y) {
        let best = Infinity;
        for (const d of DIRS) {
            const n = this.grid.get(key(x + d.dx, y + d.dy));
            if (n && this.roomDict.get(n.room).doors[d.opposite]) {
                best = Math.min(best, this.depths[n.instance]);
            }
        }
        return best + 1;
    }

    place(info, x, y, depth) {
        const instance = this.depths.push(depth) - 1;
        this.kindCounts.set(info.kind, (this.kindCounts.get(info.kind) ?? 0) + 1);
        if (info.kind === "boss") this.bossInstances.push(instance);

        for (const cell of info.cells) {
            const cx = x + cell.dx, cy = y + cell.dy;
            this.grid.set(key(cx, cy), { room: cell.id, position: new Vector2(cx, cy), instance });
            this.frontier.delete(key(cx, cy));
        }

        for (const cell of info.cells) {
            const doors = this.roomDict.get(cell.id).doors;
            for (const d of DIRS) {
                if (!doors[d.name]) continue;
                const nx = x + cell.dx + d.dx, ny = y + cell.dy + d.dy;
                const k = key(nx, ny);
                if (!this.grid.has(k) && !this.frontier.has(k)) {
                    this.frontier.set(k, { x: nx, y: ny, depth: 0 });
                }
                // the boss's one open door leads to its exit
                if (info.kind === "boss" && this.cfg.exitKind && !this.grid.has(k)) this.exitSlots.add(k);
            }
        }

        // invalidate the cache of cells close enough to be affected
        const r = this.maxSpan + 1;
        for (const e of this.frontier.values()) {
            const near = info.cells.some(c =>
                Math.abs(e.x - (x + c.dx)) <= r && Math.abs(e.y - (y + c.dy)) <= r);
            if (near) e.candidates = undefined;
        }
    }

    finish() {
        const { cfg } = this;
        const n = this.depths.length;
        if (n < cfg.minRooms || n > cfg.maxRooms) return { reason: n < cfg.minRooms ? "too-small" : "too-big" };
        if (this.bossInstances.length < cfg.bossCount) return { reason: "boss-missing" };
        if (cfg.exitKind && (this.kindCounts.get(cfg.exitKind) ?? 0) < this.bossInstances.length) return { reason: "exit-missing" };

        for (const [kind, rule] of Object.entries(cfg.kinds)) {
            if (rule.min !== undefined && (this.kindCounts.get(kind) ?? 0) < rule.min) return { reason: `kind-min:${kind}` };
        }

        // real BFS (loops can shorten paths)
        // VAI FUNCIONAR SIM
        const adj = this.depths.map(() => []);
        for (const cell of this.grid.values()) {
            const doors = this.roomDict.get(cell.room).doors;
            for (const d of DIRS) {
                if (!doors[d.name]) continue;
                const nb = this.grid.get(key(cell.position.x + d.dx, cell.position.y + d.dy));
                if (nb && nb.instance !== cell.instance) adj[cell.instance].push(nb.instance);
            }
        }

        const dist = new Array(n).fill(-1);
        dist[0] = 0;
        const queue = [0];
        for (let i = 0; i < queue.length; i++) {
            for (const nb of adj[queue[i]]) {
                if (dist[nb] < 0) { dist[nb] = dist[queue[i]] + 1; queue.push(nb); }
            }
        }

        if (dist.some(d => d < 0)) return { reason: "orphan-room" };
        const bossDistances = this.bossInstances.map(b => dist[b]);
        if (bossDistances.some(d => Math.abs(d - cfg.bossDistance) > cfg.bossTolerance)) {
            return { reason: "boss-distance" };
        }

        const rooms = [...this.grid.values()].map(c => ({ ...c, distance: dist[c.instance] }));
        return { rooms, roomCount: n, bossDistances };
    }
}

// ---- Public API -----------------------------------------------------------------------

function generateDungeonWithStats(roomDict, initialRoom, config) {
    const cfg = resolveConfig(config);

    const infos = buildInfos(roomDict);
    if (!infos.has(initialRoom)) throw new Error(`Initial room ${initialRoom} doesn't exist`);
    if (cfg.bossCount > 0 && ![...infos.values()].some(i => i.kind === "boss")) {
        throw new Error('boss is configured but no room has kind "boss"');
    }
    if (cfg.exitKind && ![...infos.values()].some(i => i.kind === cfg.exitKind)) {
        throw new Error(`boss.exit is "${cfg.exitKind}" but no room has that kind`);
    }

    const spawnable = [...infos.entries()].filter(([id]) => (roomDict.get(id).kind ?? "normal") !== "start");
    const maxSpan = Math.max(...[...infos.values()].map(i => i.span));
    const failures = {};

    for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
        const result = new Attempt(roomDict, infos, spawnable, cfg, maxSpan).run(initialRoom);
        if ("reason" in result) {
            failures[result.reason] = (failures[result.reason] ?? 0) + 1;
            continue;
        }
        return { ...result, seed: cfg.seed, attempts: attempt, failures };
    }
    throw new Error(`No valid dungeon in ${cfg.maxAttempts} attempts. Failures: ${JSON.stringify(failures)}`);
}

function generateDungeon(roomDict, initialRoom, config) {
    return generateDungeonWithStats(roomDict, initialRoom, config).rooms;
}

export { generateDungeon, generateDungeonWithStats };