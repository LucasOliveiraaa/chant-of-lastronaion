import Rigidbody from "./components/Rigidbody.js";
import Collider from "./components/Collider.js";
import Vector2 from "./Vector2.js";
import World from "./World.js";

const MAX_DELTA_TIME = 1 / 30;
const MAX_SUBSTEPS = 10;
const SOLVER_ITERATIONS = 4;
const PENETRATION_SLOP = 0.01;
const CORRECTION_PERCENT = 0.8;
const BOUNCE_THRESHOLD = 60;
const STILL = Object.freeze({ x: 0, y: 0 });

export default class PhysicsEngine {
    constructor() {
        this.gravity = new Vector2(0, 980);

        this._contacts = new Map();
        this._ids = new WeakMap();
        this._nextId = 1;
    }

    update(deltaTime) {
        const dt = Math.min(deltaTime, MAX_DELTA_TIME);
        if (!(dt > 0)) return;

        const bodies = this._collectBodies();
        const steps = this._substepCount(bodies, dt);
        const h = dt / steps;

        const frameContacts = new Map();
        for (let i = 0; i < steps; i++) {
            this._integrate(bodies, h);
            this._detectAndCorrect(bodies, frameContacts);
        }

        for (const body of bodies) {
            body.rb?.force.set(0, 0);
        }

        this._dispatchEvents(frameContacts);
    }

    _collectBodies() {
        const world = World.getInstance();
        const byEntity = new Map();

        for (const [entity, rb] of world.getComponents(Rigidbody)) {
            byEntity.set(entity, { entity, rb, collider: null });
        }

        for (const [entity, collider] of world.getComponents(Collider)) {
            const body = byEntity.get(entity);
            if (body) body.collider = collider;
            else byEntity.set(entity, { entity, rb: null, collider });
        }

        const bodies = [];
        for (const body of byEntity.values()) {
            const cfg = body.rb?.config;
            body.isStatic = !body.rb || !!cfg.static;
            body.invMass = body.isStatic ? 0 : 1 / (cfg.mass > 0 ? cfg.mass : 1);
            body.bounciness = cfg ? cfg.bounciness ?? 0 : 0;
            body.friction = cfg ? cfg.friction ?? 0 : null;
            body.trigger = !!body.collider?.config.trigger;
            bodies.push(body);
        }
        return bodies;
    }

    _substepCount(bodies, dt) {
        let steps = 1;
        for (const body of bodies) {
            if (body.isStatic || !body.collider) continue;
            if (body.rb.config.collisionDetection !== "continuous") continue;

            const v = body.rb.velocity;
            const gs = body.rb.config.gravityScale ?? 1;
            const vx = v.x + this.gravity.x * gs * dt;
            const vy = v.y + this.gravity.y * gs * dt;
            const distance = Math.hypot(vx, vy) * dt;

            const cfg = body.collider.config;
            const minExtent = cfg.type === "circle"
                ? cfg.radius
                : Math.min(cfg.size.x, cfg.size.y) / 2;

            if (minExtent > 0) {
                steps = Math.max(steps, Math.ceil(distance / minExtent));
            }
        }
        return Math.min(steps, MAX_SUBSTEPS);
    }

    _integrate(bodies, h) {
        for (const body of bodies) {
            if (body.isStatic) continue;

            const { velocity, force } = body.rb;
            const cfg = body.rb.config;
            const gs = cfg.gravityScale ?? 1;

            velocity.x += (this.gravity.x * gs + force.x * body.invMass) * h;
            velocity.y += (this.gravity.y * gs + force.y * body.invMass) * h;

            const damping = 1 / (1 + (cfg.linearDrag ?? 0) * h);
            velocity.x *= damping;
            velocity.y *= damping;

            body.entity.position.x += velocity.x * h;
            body.entity.position.y += velocity.y * h;
        }
    }

    _detectAndCorrect(bodies, frameContacts) {
        const solid = [];
        const bounds = bodies.map((b) => (b.collider ? this._bounds(b) : null));

        for (let i = 0; i < bodies.length; i++) {
            const a = bodies[i];
            if (!bounds[i]) continue;

            for (let j = i + 1; j < bodies.length; j++) {
                const b = bodies[j];
                if (!bounds[j]) continue;
                if (a.invMass === 0 && b.invMass === 0) continue;

                const ba = bounds[i];
                const bb = bounds[j];
                if (ba.maxX <= bb.minX || bb.maxX <= ba.minX) continue;
                if (ba.maxY <= bb.minY || bb.maxY <= ba.minY) continue;

                if (!this._narrowPhase(a, b)) continue;

                frameContacts.set(this._pairKey(a.entity, b.entity), [a.entity, b.entity]);
                if (!a.trigger && !b.trigger) solid.push([a, b]);
            }
        }

        for (let iter = 0; iter < SOLVER_ITERATIONS; iter++) {
            for (const [a, b] of solid) {
                const hit = this._narrowPhase(a, b);
                if (hit) this._resolve(a, b, hit);
            }
        }
    }

    _resolve(a, b, { normal, depth }) {
        const invSum = a.invMass + b.invMass;
        const va = a.isStatic ? STILL : a.rb.velocity;
        const vb = b.isStatic ? STILL : b.rb.velocity;

        const approach = (vb.x - va.x) * normal.x + (vb.y - va.y) * normal.y;

        if (approach < 0) {
            const restitution = -approach > BOUNCE_THRESHOLD
                ? Math.max(a.bounciness, b.bounciness)
                : 0;
            const jn = (-(1 + restitution) * approach) / invSum;
            this._applyImpulse(a, b, normal.x * jn, normal.y * jn);

            const mu = combineFriction(a.friction, b.friction);
            if (mu > 0) {
                const rx = vb.x - va.x;
                const ry = vb.y - va.y;
                const rn = rx * normal.x + ry * normal.y;
                let tx = rx - rn * normal.x;
                let ty = ry - rn * normal.y;
                const tLen = Math.hypot(tx, ty);

                if (tLen > 1e-6) {
                    tx /= tLen;
                    ty /= tLen;
                    const maxJt = mu * jn;
                    const jt = Math.max(-maxJt, Math.min(maxJt, -tLen / invSum));
                    this._applyImpulse(a, b, tx * jt, ty * jt);
                }
            }
        }

        const correction = (Math.max(depth - PENETRATION_SLOP, 0) / invSum) * CORRECTION_PERCENT;
        if (correction > 0) {
            a.entity.position.x -= normal.x * correction * a.invMass;
            a.entity.position.y -= normal.y * correction * a.invMass;
            b.entity.position.x += normal.x * correction * b.invMass;
            b.entity.position.y += normal.y * correction * b.invMass;
        }
    }

    _applyImpulse(a, b, ix, iy) {
        if (!a.isStatic) {
            a.rb.velocity.x -= ix * a.invMass;
            a.rb.velocity.y -= iy * a.invMass;
        }
        if (!b.isStatic) {
            b.rb.velocity.x += ix * b.invMass;
            b.rb.velocity.y += iy * b.invMass;
        }
    }

    _center(body) {
        return body.collider.getCenter(body.entity);
    }

    _bounds(body) {
        return body.collider.getBounds(body.entity);
    }

    _narrowPhase(a, b) {
        const ca = this._center(a);
        const cb = this._center(b);
        const sa = a.collider.config;
        const sb = b.collider.config;

        if (sa.type === "square" && sb.type === "square") {
            return boxBox(ca, sa, cb, sb);
        }
        if (sa.type === "circle" && sb.type === "circle") {
            return circleCircle(ca, sa.radius, cb, sb.radius);
        }
        if (sa.type === "circle") {
            return circleBox(ca, sa.radius, cb, sb);
        }
        const hit = circleBox(cb, sb.radius, ca, sa);
        if (!hit) return null;
        return { normal: { x: -hit.normal.x, y: -hit.normal.y }, depth: hit.depth };
    }

    _id(entity) {
        let id = this._ids.get(entity);
        if (id === undefined) {
            id = this._nextId++;
            this._ids.set(entity, id);
        }
        return id;
    }

    _pairKey(a, b) {
        const ia = this._id(a);
        const ib = this._id(b);
        return ia < ib ? `${ia}:${ib}` : `${ib}:${ia}`;
    }

    _dispatchEvents(current) {
        const previous = this._contacts;
        const alive = new Set(World.getInstance().entities);
        const events = [];

        for (const [key, [a, b]] of current) {
            events.push(previous.has(key) ? "onCollisionStay" : "onCollisionEnter", a, b);
        }
        for (const [key, [a, b]] of previous) {
            if (current.has(key)) continue;
            // A removed entity gets no callback, but the survivor still learns the contact ended.
            if (alive.has(a)) events.push("onCollisionExit", a, b);
            if (alive.has(b)) events.push("onCollisionExit", b, a);
        }

        this._contacts = current;

        // Callbacks run on a snapshot so they can add/remove entities safely.
        for (let i = 0; i < events.length; i += 3) {
            const name = events[i];
            const a = events[i + 1];
            const b = events[i + 2];
            if (name === "onCollisionExit") {
                a[name]?.(b);
            } else {
                a[name]?.(b);
                b[name]?.(a);
            }
        }
    }
}

// Geometric mean like Unity; a body without a Rigidbody doesn't affect the result.
function combineFriction(fa, fb) {
    if (fa === null) return fb ?? 0;
    if (fb === null) return fa;
    return Math.sqrt(fa * fb);
}

function boxBox(ca, sa, cb, sb) {
    const dx = cb.x - ca.x;
    const dy = cb.y - ca.y;
    const px = sa.size.x / 2 + sb.size.x / 2 - Math.abs(dx);
    const py = sa.size.y / 2 + sb.size.y / 2 - Math.abs(dy);
    if (px <= 0 || py <= 0) return null;

    if (px < py) return { normal: { x: dx < 0 ? -1 : 1, y: 0 }, depth: px };
    return { normal: { x: 0, y: dy < 0 ? -1 : 1 }, depth: py };
}

function circleCircle(ca, ra, cb, rb) {
    const dx = cb.x - ca.x;
    const dy = cb.y - ca.y;
    const radii = ra + rb;
    const distSq = dx * dx + dy * dy;
    if (distSq >= radii * radii) return null;

    const dist = Math.sqrt(distSq);
    if (dist === 0) return { normal: { x: 0, y: 1 }, depth: radii };
    return { normal: { x: dx / dist, y: dy / dist }, depth: radii - dist };
}

function circleBox(cc, radius, cb, box) {
    const hx = box.size.x / 2;
    const hy = box.size.y / 2;
    const dx = cc.x - cb.x;
    const dy = cc.y - cb.y;

    const closestX = Math.max(-hx, Math.min(hx, dx));
    const closestY = Math.max(-hy, Math.min(hy, dy));
    const diffX = dx - closestX;
    const diffY = dy - closestY;
    const distSq = diffX * diffX + diffY * diffY;

    if (distSq > 0) {
        if (distSq >= radius * radius) return null;
        const dist = Math.sqrt(distSq);
        return { normal: { x: -diffX / dist, y: -diffY / dist }, depth: radius - dist };
    }

    // Center is inside the box: leave through the nearest face.
    const left = dx + hx;
    const right = hx - dx;
    const top = dy + hy;
    const bottom = hy - dy;
    const min = Math.min(left, right, top, bottom);

    let normal;
    if (min === left) normal = { x: 1, y: 0 };
    else if (min === right) normal = { x: -1, y: 0 };
    else if (min === top) normal = { x: 0, y: 1 };
    else normal = { x: 0, y: -1 };

    return { normal, depth: radius + min };
}