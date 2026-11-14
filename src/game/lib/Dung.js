// Este arquivo contém a implementação do algoritimo de geração de dungeons (Dungeon Generation, DunG).
// Eu, Lucas, estou implementando em TypeScript primeiro porque não vejo como fazer sem TIPOOSSSSS.
// Basicamente esse algoritimo é uma modificação de um Wave-function Collapser. Isso é necessário já que o WFC não tem a ideia de espaços em branco ou o tamanho esperado para uma dungeon, então eu adicionei algumas patches para que ele gere uma dungeon válida, sem salas órfãs (sem conexões com a sala inicial) e com um tamanho controlável.

import Vector2 from "../../engine/math/Vector2.js";

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
        order: config.layout?.order ?? "entropy",
        loopBias: config.layout?.loopBias ?? 1,
        deadEndPenalty: config.layout?.deadEndPenalty ?? 0.05,
        kinds: config.kinds ?? {},
        weightModifier: config.weightModifier,
    };

    if (cfg.bossCount > 0 && cfg.bossDistance + 1 > cfg.maxRooms) {
        throw new Error("boss.distance doesn't fit in the target size");
    }
    return cfg;
}

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

class Attempt {
    grid = new Map();
    frontier = new Map(); // empty cells with a door pointing at them
    depths = [];          // distance of each instance through its entry path
    kindCounts = new Map();
    bossInstances = [];

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
                e.candidates = this.getCandidates(e.x, e.y);
                e.entropy = undefined;
            }
            if (e.candidates.length === 0) return "contradiction";
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

        const i = pickWeighted(cands.map(c => this.weightOf(c, target, needBoss)), cfg.rng);
        if (i < 0) return "no-valid-weight";
        this.place(cands[i].info, target.x, target.y, target.depth);
        return null;
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
            w *= cfg.bossBoost;
        } else {
            const rule = cfg.kinds[kind];
            const count = this.kindCounts.get(kind) ?? 0;
            if (rule?.max !== undefined && count >= rule.max) return 0;
            w *= rule?.weight ?? 1;
            if (rule?.min !== undefined && count < rule.min) w *= 10;

            // no boss yet and still far: avoid dead ends
            if (needBoss && at.depth < cfg.bossDistance && c.delta < 0) w *= cfg.deadEndPenalty;

            // size control: over the target discourages doors, under encourages them
            if (cfg.sizeControl) {
                const projected = this.depths.length + this.frontier.size;
                const pressure = Math.max(-1, Math.min(2, (projected - cfg.target * cfg.aim) / cfg.target));
                w *= Math.exp(-cfg.growthBias * pressure * c.delta);
            }
            if (c.loops > 0) w *= Math.pow(cfg.loopBias, c.loops);
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
        const out = [];
        for (const [id, info] of this.spawnable) {
            const fit = this.tryFit(info, x, y);
            // delta: new open doors - 1 (the entry slot gets filled)
            if (fit) out.push({ id, info, delta: fit.open - 1, open: fit.open, loops: Math.max(0, fit.joined - 1) });
        }
        return out;
    }

    // null if it doesn't fit; open = doors to empty cells, joined = doors to existing rooms
    tryFit(info, x, y) {
        const ext = this.cfg.maxExtent;
        let open = 0, joined = 0;

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
                }
            }
        }
        return { open, joined };
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

function generateDungeonWithStats(roomDict, initialRoom, config) {
    const cfg = resolveConfig(config);

    const infos = buildInfos(roomDict);
    if (!infos.has(initialRoom)) throw new Error(`Initial room ${initialRoom} doesn't exist`);
    if (cfg.bossCount > 0 && ![...infos.values()].some(i => i.kind === "boss")) {
        throw new Error('boss is configured but no room has kind "boss"');
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