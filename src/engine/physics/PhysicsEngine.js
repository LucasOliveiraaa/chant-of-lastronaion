import Rigidbody from "./Rigidbody.js";
import SquareCollider from "./SquareCollider.js";
import CircleCollider from "./CircleCollider.js";
import Vector2 from "../math/Vector2.js";
import Time from "../core/Time.js";
import World from "../core/World.js";

const MAX_SUBSTEPS = 10;
const SOLVER_ITERATIONS = 4;
const PENETRATION_SLOP = 0.01;
const CORRECTION_PERCENT = 0.8;
const BOUNCE_THRESHOLD = 60;
const STILL = Object.freeze({ x: 0, y: 0 });
const COLLIDER_TYPES = [SquareCollider, CircleCollider];

// Pair keys are idA * stride + idB, so object ids must stay below 2^21.
const ID_STRIDE = 2097152;

// Scratch result of the narrow phase (normal points from A to B), reused to avoid allocations.
const HIT = { nx: 0, ny: 0, depth: 0 };

const byMinX = (a, b) => a.minX - b.minX;

export default class PhysicsEngine {
    constructor() {
        this.gravity = new Vector2(0, 980);

        this._contacts = new Map();
        this._ids = new WeakMap();
        this._nextId = 1;
    }

    fixedUpdate() {
        const dt = Time.fixedDeltaTime;
        if (!(dt > 0)) return;

        const bodies = this._collectBodies();
        const active = bodies.filter((b) => b.collider);
        const steps = this._substepCount(bodies, dt);
        const h = dt / steps;

        const frameContacts = new Map();
        for (let i = 0; i < steps; i++) {
            this._integrate(bodies, h);
            this._detectAndCorrect(active, frameContacts);
        }

        for (const body of bodies) {
            body.rb?.force.set(0, 0);
        }

        this._dispatchEvents(frameContacts, bodies);
    }

    // The only place that reads collider components. Shapes are cached as plain numbers:
    // center (cx, cy) and half extents (ex, ey), where a circle has ex = ey = radius.
    _collectBodies() {
        const world = World.getInstance();
        const byObject = new Map();

        for (const [gameObject, rb] of world.getComponents(Rigidbody)) {
            byObject.set(gameObject, { gameObject, rb, collider: null });
        }

        for (const type of COLLIDER_TYPES) {
            for (const [gameObject, collider] of world.getComponents(type)) {
                const body = byObject.get(gameObject);
                if (!body) byObject.set(gameObject, { gameObject, rb: null, collider });
                else if (!body.collider) body.collider = collider;
            }
        }

        const bodies = [];
        for (const body of byObject.values()) {
            const { rb, collider } = body;

            body.id = this._id(body.gameObject);
            body.isStatic = !rb || !!rb.static;
            body.invMass = body.isStatic ? 0 : 1 / (rb.mass > 0 ? rb.mass : 1);
            body.bounciness = rb ? rb.bounciness ?? 0 : 0;
            body.friction = rb ? rb.friction ?? 0 : null;

            body.trigger = false;
            body.isCircle = false;
            body.cx = body.cy = body.ex = body.ey = 0;

            if (collider) {
                const center = collider.getCenter(body.gameObject);

                body.trigger = !!collider.trigger;
                body.isCircle = collider instanceof CircleCollider;
                body.cx = center.x;
                body.cy = center.y;
                
                if (body.isCircle) {
                    body.ex = body.ey = collider.radius;
                } else {
                    const size = collider.getSize(body.gameObject);
                    body.ex = size.x / 2;
                    body.ey = size.y / 2;
                }
            }

            bodies.push(body);
        }
        return bodies;
    }

    _substepCount(bodies, dt) {
        let steps = 1;
        for (const body of bodies) {
            if (body.isStatic || !body.collider) continue;
            if (body.rb.collisionDetection !== "continuous") continue;

            const v = body.rb.velocity;
            const gs = body.rb.gravityScale ?? 1;
            const vx = v.x + this.gravity.x * gs * dt;
            const vy = v.y + this.gravity.y * gs * dt;
            const distance = Math.hypot(vx, vy) * dt;

            const minExtent = Math.min(body.ex, body.ey);
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
            const gs = body.rb.gravityScale ?? 1;

            velocity.x += (this.gravity.x * gs + force.x * body.invMass) * h;
            velocity.y += (this.gravity.y * gs + force.y * body.invMass) * h;

            const damping = 1 / (1 + (body.rb.linearDrag ?? 0) * h);
            velocity.x *= damping;
            velocity.y *= damping;

            this._move(body, velocity.x * h, velocity.y * h);
        }
    }

    _move(body, dx, dy) {
        const position = body.gameObject.transform.position;
        position.x += dx;
        position.y += dy;
        body.cx += dx;
        body.cy += dy;
    }

    // Broad phase is a sweep and prune on the X axis: sorted by minX, each body only
    // looks at the ones that start before it ends. Then Y overlap, then the exact test.
    _detectAndCorrect(active, frameContacts) {
        for (const b of active) {
            b.minX = b.cx - b.ex;
            b.maxX = b.cx + b.ex;
            b.minY = b.cy - b.ey;
            b.maxY = b.cy + b.ey;
        }
        active.sort(byMinX);

        const solid = [];
        for (let i = 0; i < active.length; i++) {
            const a = active[i];

            for (let j = i + 1; j < active.length; j++) {
                const b = active[j];
                if (b.minX >= a.maxX) break;
                if (a.invMass === 0 && b.invMass === 0) continue;
                if (b.minY >= a.maxY || a.minY >= b.maxY) continue;
                if (!narrowPhase(a, b)) continue;

                frameContacts.set(this._pairKey(a, b), [a.gameObject, b.gameObject]);
                if (!a.trigger && !b.trigger) solid.push(a, b);
            }
        }

        for (let iter = 0; iter < SOLVER_ITERATIONS; iter++) {
            for (let i = 0; i < solid.length; i += 2) {
                const a = solid[i];
                const b = solid[i + 1];
                if (narrowPhase(a, b)) this._resolve(a, b, HIT.nx, HIT.ny, HIT.depth);
            }
        }
    }

    _resolve(a, b, nx, ny, depth) {
        const invSum = a.invMass + b.invMass;
        const va = a.isStatic ? STILL : a.rb.velocity;
        const vb = b.isStatic ? STILL : b.rb.velocity;

        const approach = (vb.x - va.x) * nx + (vb.y - va.y) * ny;

        if (approach < 0) {
            const restitution = -approach > BOUNCE_THRESHOLD
                ? Math.max(a.bounciness, b.bounciness)
                : 0;
            const jn = (-(1 + restitution) * approach) / invSum;
            this._applyImpulse(a, b, nx * jn, ny * jn);

            const mu = combineFriction(a.friction, b.friction);
            if (mu > 0) {
                const rx = vb.x - va.x;
                const ry = vb.y - va.y;
                const rn = rx * nx + ry * ny;
                let tx = rx - rn * nx;
                let ty = ry - rn * ny;
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
            if (!a.isStatic) this._move(a, -nx * correction * a.invMass, -ny * correction * a.invMass);
            if (!b.isStatic) this._move(b, nx * correction * b.invMass, ny * correction * b.invMass);
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

    _id(gameObject) {
        let id = this._ids.get(gameObject);
        if (id === undefined) {
            id = this._nextId++;
            this._ids.set(gameObject, id);
        }
        return id;
    }

    _pairKey(a, b) {
        return a.id < b.id ? a.id * ID_STRIDE + b.id : b.id * ID_STRIDE + a.id;
    }

    _dispatchEvents(current, bodies) {
        const previous = this._contacts;
        const events = [];
        let alive = null;

        for (const [key, [a, b]] of current) {
            const name = previous.has(key) ? "OnCollisionStay" : "OnCollisionEnter";
            events.push([name, a, b], [name, b, a]);
        }
        for (const [key, [a, b]] of previous) {
            if (current.has(key)) continue;
            alive ??= new Set(bodies.map((body) => body.gameObject));
            // A removed object gets no message, but the survivor still learns the contact ended.
            if (alive.has(a)) events.push(["OnCollisionExit", a, b]);
            if (alive.has(b)) events.push(["OnCollisionExit", b, a]);
        }

        this._contacts = current;

        // Messages run on a snapshot so they can add/remove objects safely.
        for (const [name, target, other] of events) {
            target.sendMessage(name, other);
        }
    }
}

// Geometric mean like Unity; a body without a Rigidbody doesn't affect the result.
function combineFriction(fa, fb) {
    if (fa === null) return fb ?? 0;
    if (fb === null) return fa;
    return Math.sqrt(fa * fb);
}

function narrowPhase(a, b) {
    if (!a.isCircle && !b.isCircle) return boxBox(a, b);
    if (a.isCircle && b.isCircle) return circleCircle(a, b);
    if (a.isCircle) return circleBox(a, b);

    if (!circleBox(b, a)) return false;
    HIT.nx = -HIT.nx;
    HIT.ny = -HIT.ny;
    return true;
}

function boxBox(a, b) {
    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;
    const px = a.ex + b.ex - Math.abs(dx);
    const py = a.ey + b.ey - Math.abs(dy);
    if (px <= 0 || py <= 0) return false;

    if (px < py) {
        HIT.nx = dx < 0 ? -1 : 1;
        HIT.ny = 0;
        HIT.depth = px;
    } else {
        HIT.nx = 0;
        HIT.ny = dy < 0 ? -1 : 1;
        HIT.depth = py;
    }
    return true;
}

function circleCircle(a, b) {
    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;
    const radii = a.ex + b.ex;
    const distSq = dx * dx + dy * dy;
    if (distSq >= radii * radii) return false;

    const dist = Math.sqrt(distSq);
    if (dist === 0) {
        HIT.nx = 0;
        HIT.ny = 1;
    } else {
        HIT.nx = dx / dist;
        HIT.ny = dy / dist;
    }
    HIT.depth = radii - dist;
    return true;
}

// Normal points from the circle to the box.
function circleBox(circle, box) {
    const radius = circle.ex;
    const hx = box.ex;
    const hy = box.ey;
    const dx = circle.cx - box.cx;
    const dy = circle.cy - box.cy;

    const closestX = Math.max(-hx, Math.min(hx, dx));
    const closestY = Math.max(-hy, Math.min(hy, dy));
    const diffX = dx - closestX;
    const diffY = dy - closestY;
    const distSq = diffX * diffX + diffY * diffY;

    if (distSq > 0) {
        if (distSq >= radius * radius) return false;
        const dist = Math.sqrt(distSq);
        HIT.nx = -diffX / dist;
        HIT.ny = -diffY / dist;
        HIT.depth = radius - dist;
        return true;
    }

    // Center is inside the box: leave through the nearest face.
    const left = dx + hx;
    const right = hx - dx;
    const top = dy + hy;
    const bottom = hy - dy;
    const min = Math.min(left, right, top, bottom);

    if (min === left) { HIT.nx = 1; HIT.ny = 0; }
    else if (min === right) { HIT.nx = -1; HIT.ny = 0; }
    else if (min === top) { HIT.nx = 0; HIT.ny = 1; }
    else { HIT.nx = 0; HIT.ny = -1; }

    HIT.depth = radius + min;
    return true;
}