import Rigidbody from "./Rigidbody.js";
import Collider from "./Collider.js";
import Vector2 from "../math/Vector2.js";
import Time from "../core/Time.js";
import World from "../core/World.js";
import Collision from "./Collision.js";
import ContactPoint from "./ContactPoint.js";

const MAX_SUBSTEPS = 10;
const SOLVER_ITERATIONS = 4;
const PENETRATION_SLOP = 0.01;
const CORRECTION_PERCENT = 0.8;
const BOUNCE_THRESHOLD = 60;
const STILL = Object.freeze({ x: 0, y: 0 });
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// Box2D's tolerances: keeps the reference face from flickering between equally overlapping boxes.
const RELATIVE_TOLERANCE = 0.98;
const ABSOLUTE_TOLERANCE = 0.001;
const CONTACT_TOLERANCE = 0.001;

// Pair keys are idA * stride + idB, so object ids must stay below 2^21.
const ID_STRIDE = 2097152;

// Narrow phase scratch result; normal points from A to B.
const HIT = { nx: 0, ny: 0, depth: 0, count: 0, x1: 0, y1: 0, x2: 0, y2: 0 };
const POINTS = [0, 1].map(() => ({ x: 0, y: 0, rax: 0, ray: 0, rbx: 0, rby: 0, jn: 0, jt: 0, tx: 0, ty: 0 }));
const RV = { x: 0, y: 0 };

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
            if (!body.rb) continue;
            body.rb.force.set(0, 0);
            body.rb.torque = 0;
            if (!body.isStatic) body.rb.angularVelocity = body.w * RAD_TO_DEG;
        }

        this._dispatchEvents(frameContacts, bodies);
    }

    // m = center of mass, c = collider center, o = collider offset, e = half extents (radius for circles).
    _collectBodies() {
        const world = World.getInstance();
        const byObject = new Map();

        for (const rb of world.findObjectsByType(Rigidbody)) {
            if (byObject.has(rb.gameObject)) continue;
            byObject.set(rb.gameObject, { gameObject: rb.gameObject, rb, collider: null });
        }

        for (const collider of world.findObjectsByType(Collider)) {
            const gameObject = collider.gameObject;
            const body = byObject.get(gameObject);
            if (!body) byObject.set(gameObject, { gameObject, rb: null, collider });
            else if (!body.collider) body.collider = collider;
        }

        const bodies = [];
        for (const body of byObject.values()) {
            const { rb, collider } = body;
            const transform = body.gameObject.transform;

            body.id = this._id(body.gameObject);
            body.isStatic = !rb || rb.bodyType === "static";
            body.isKinematic = !body.isStatic && rb.bodyType === "kinematic";
            body.invMass = body.isStatic || body.isKinematic ? 0 : 1 / (rb.mass > 0 ? rb.mass : 1);
            body.bounciness = rb ? rb.bounciness ?? 0 : 0;
            body.friction = rb ? rb.friction ?? 0 : null;

            const canRotate = !body.isStatic && !rb.freezeRotation;
            const inertia = body.invMass > 0 && canRotate ? rb.inertia : 0;
            body.invI = inertia > 0 ? 1 / inertia : 0;
            body.w = canRotate ? (rb.angularVelocity ?? 0) * DEG_TO_RAD : 0;

            const center = transform.worldCenter;
            body.mx = center.x;
            body.my = center.y;
            body.angle = transform.worldRotation * DEG_TO_RAD;
            body.cos = Math.cos(body.angle);
            body.sin = Math.sin(body.angle);

            // Moves are in world space; convert them into a rotated parent's local space.
            const parentAngle = transform.parent ? transform.parent.worldRotation * DEG_TO_RAD : 0;
            body.pcos = Math.cos(parentAngle);
            body.psin = Math.sin(parentAngle);

            body.trigger = false;
            body.isCircle = false;
            body.ox = body.oy = body.ex = body.ey = 0;

            if (collider) {
                body.trigger = !!collider.isTrigger;
                body.isCircle = collider.isCircle;
                body.ox = collider.offset.x;
                body.oy = collider.offset.y;

                if (body.isCircle) {
                    body.ex = body.ey = collider.radius;
                } else {
                    const size = collider.getSize(body.gameObject);
                    body.ex = size.x / 2;
                    body.ey = size.y / 2;
                }
            }

            this._placeCollider(body);
            bodies.push(body);
        }
        return bodies;
    }

    _substepCount(bodies, dt) {
        let steps = 1;
        for (const body of bodies) {
            if (body.isStatic || !body.collider) continue;
            if (body.rb.collisionDetectionMode !== "continuous") continue;

            const v = body.rb.velocity;
            const gs = body.isKinematic ? 0 : body.rb.gravityScale ?? 1;
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

            if (body.isKinematic) {
                this._move(body, velocity.x * h, velocity.y * h);
                this._rotate(body, body.w * h);
                continue;
            }

            const gs = body.rb.gravityScale ?? 1;

            velocity.x += (this.gravity.x * gs + force.x * body.invMass) * h;
            velocity.y += (this.gravity.y * gs + force.y * body.invMass) * h;

            const damping = 1 / (1 + (body.rb.linearDamping ?? 0) * h);
            velocity.x *= damping;
            velocity.y *= damping;

            this._move(body, velocity.x * h, velocity.y * h);

            if (body.invI > 0) {
                body.w += body.rb.torque * body.invI * h;
                body.w /= 1 + (body.rb.angularDamping ?? 0) * h;
                this._rotate(body, body.w * h);
            }
        }
    }

    _move(body, dx, dy) {
        const position = body.gameObject.transform.position;
        position.x += dx * body.pcos + dy * body.psin;
        position.y += -dx * body.psin + dy * body.pcos;
        body.mx += dx;
        body.my += dy;
        body.cx += dx;
        body.cy += dy;
    }

    _rotate(body, radians) {
        if (radians === 0) return;

        body.gameObject.transform.rotation += radians * RAD_TO_DEG;
        body.angle += radians;
        body.cos = Math.cos(body.angle);
        body.sin = Math.sin(body.angle);
        this._placeCollider(body);
    }

    _placeCollider(body) {
        body.cx = body.mx + body.ox * body.cos - body.oy * body.sin;
        body.cy = body.my + body.ox * body.sin + body.oy * body.cos;
    }

    // Sweep and prune on X, then Y overlap, then the narrow phase.
    _detectAndCorrect(active, frameContacts) {
        for (const b of active) {
            let hx = b.ex;
            let hy = b.ey;
            if (!b.isCircle) {
                const cos = Math.abs(b.cos);
                const sin = Math.abs(b.sin);
                hx = b.ex * cos + b.ey * sin;
                hy = b.ex * sin + b.ey * cos;
            }
            b.minX = b.cx - hx;
            b.maxX = b.cx + hx;
            b.minY = b.cy - hy;
            b.maxY = b.cy + hy;
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

                // The last substep that touched the pair is the one reported.
                const key = this._pairKey(a, b);
                const contact = recordContact(frameContacts.get(key), a, b);
                frameContacts.set(key, contact);
                if (contact.enabled) solid.push(contact);
            }
        }

        for (let iter = 0; iter < SOLVER_ITERATIONS; iter++) {
            for (const contact of solid) {
                if (narrowPhase(contact.a, contact.b)) this._resolve(contact);
            }
        }
    }

    // Both contact points' impulses are computed before applying either, so a box resting
    // flat gets equal impulses at both corners and doesn't start to spin.
    _resolve(contact) {
        const { a, b } = contact;
        const { nx, ny, depth, count } = HIT;

        for (let i = 0; i < count; i++) {
            const point = POINTS[i];
            point.x = i === 0 ? HIT.x1 : HIT.x2;
            point.y = i === 0 ? HIT.y1 : HIT.y2;
            point.rax = point.x - a.mx;
            point.ray = point.y - a.my;
            point.rbx = point.x - b.mx;
            point.rby = point.y - b.my;
        }

        for (let i = 0; i < count; i++) this._normalImpulse(a, b, nx, ny, POINTS[i], count);
        for (let i = 0; i < count; i++) this._apply(a, b, nx, ny, POINTS[i], POINTS[i].jn);

        const mu = combineFriction(a.friction, b.friction);
        for (let i = 0; i < count; i++) POINTS[i].jt = 0;
        if (mu > 0) {
            for (let i = 0; i < count; i++) this._frictionImpulse(a, b, nx, ny, POINTS[i], count, mu);
            for (let i = 0; i < count; i++) this._apply(a, b, POINTS[i].tx, POINTS[i].ty, POINTS[i], POINTS[i].jt);
        }

        const recorded = Math.min(count, contact.count);
        for (let i = 0; i < recorded; i++) {
            contact.points[i].jn += POINTS[i].jn;
            contact.points[i].jt += POINTS[i].jt;
        }

        const invSum = a.invMass + b.invMass;
        const correction = (Math.max(depth - PENETRATION_SLOP, 0) / invSum) * CORRECTION_PERCENT;
        if (correction > 0) {
            if (a.invMass > 0) this._move(a, -nx * correction * a.invMass, -ny * correction * a.invMass);
            if (b.invMass > 0) this._move(b, nx * correction * b.invMass, ny * correction * b.invMass);
        }
    }

    _normalImpulse(a, b, nx, ny, point, count) {
        point.jn = 0;

        const k = effectiveMass(a, b, point, nx, ny);
        if (k <= 0) return;

        relativeVelocity(a, b, point);
        const vn = RV.x * nx + RV.y * ny;
        if (vn >= 0) return;

        const restitution = -vn > BOUNCE_THRESHOLD ? Math.max(a.bounciness, b.bounciness) : 0;
        point.jn = (-(1 + restitution) * vn) / k / count;
    }

    _frictionImpulse(a, b, nx, ny, point, count, mu) {
        point.jt = 0;
        if (point.jn <= 0) return;

        relativeVelocity(a, b, point);
        const rn = RV.x * nx + RV.y * ny;
        let tx = RV.x - rn * nx;
        let ty = RV.y - rn * ny;
        const tLen = Math.hypot(tx, ty);
        if (tLen <= 1e-6) return;
        tx /= tLen;
        ty /= tLen;

        const kt = effectiveMass(a, b, point, tx, ty);
        if (kt <= 0) return;

        const maxJt = mu * point.jn;
        point.tx = tx;
        point.ty = ty;
        point.jt = Math.max(-maxJt, Math.min(maxJt, -tLen / kt / count));
    }

    _apply(a, b, dx, dy, point, j) {
        if (j === 0) return;

        const ix = dx * j;
        const iy = dy * j;
        if (a.invMass > 0) {
            a.rb.velocity.x -= ix * a.invMass;
            a.rb.velocity.y -= iy * a.invMass;
        }
        if (b.invMass > 0) {
            b.rb.velocity.x += ix * b.invMass;
            b.rb.velocity.y += iy * b.invMass;
        }
        a.w -= (point.rax * iy - point.ray * ix) * a.invI;
        b.w += (point.rbx * iy - point.rby * ix) * b.invI;
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

        // A pair whose isTrigger was toggled exits as the old kind and enters as the new one.
        for (const [key, contact] of previous) {
            const now = current.get(key);
            if (now && now.enabled === contact.enabled) continue;
            alive ??= new Set(bodies.map((body) => body.gameObject));
            const { a, b } = contact;
            if (alive.has(a.gameObject)) events.push(exitEvent(contact, true));
            if (alive.has(b.gameObject)) events.push(exitEvent(contact, false));
        }
        for (const [key, contact] of current) {
            const before = previous.get(key);
            const stay = before !== undefined && before.enabled === contact.enabled;
            events.push(touchEvent(contact, true, stay), touchEvent(contact, false, stay));
        }

        this._contacts = current;

        // Snapshot so handlers can add/remove objects safely. A handler may destroy an object
        // that later events still mention (a projectile destroying itself on a hit): enter/stay
        // events about it are dropped, so no handler gets a collider without a GameObject.
        for (const [name, target, argument, other] of events) {
            if (target.isDestroyed || other?.isDestroyed) continue;
            target.sendMessage(name, argument);
        }
    }
}

function recordContact(contact, a, b) {
    contact ??= {
        a: null, b: null, enabled: false, nx: 0, ny: 0, count: 0, rvx: 0, rvy: 0,
        points: [0, 1].map(() => ({ x: 0, y: 0, separation: 0, jn: 0, jt: 0, rvx: 0, rvy: 0 })),
    };

    contact.a = a;
    contact.b = b;
    contact.enabled = !a.trigger && !b.trigger;
    contact.nx = HIT.nx;
    contact.ny = HIT.ny;
    contact.count = HIT.count;

    const va = a.isStatic ? STILL : a.rb.velocity;
    const vb = b.isStatic ? STILL : b.rb.velocity;
    contact.rvx = vb.x - va.x;
    contact.rvy = vb.y - va.y;

    const scratch = POINTS[0];
    for (let i = 0; i < HIT.count; i++) {
        const point = contact.points[i];
        point.x = i === 0 ? HIT.x1 : HIT.x2;
        point.y = i === 0 ? HIT.y1 : HIT.y2;
        point.separation = -HIT.depth;
        point.jn = 0;
        point.jt = 0;

        scratch.rax = point.x - a.mx;
        scratch.ray = point.y - a.my;
        scratch.rbx = point.x - b.mx;
        scratch.rby = point.y - b.my;
        relativeVelocity(a, b, scratch);
        point.rvx = RV.x;
        point.rvy = RV.y;
    }
    return contact;
}

function touchEvent(contact, forA, stay) {
    const self = forA ? contact.a : contact.b;
    const other = forA ? contact.b : contact.a;
    if (!contact.enabled) {
        return [stay ? "OnTriggerStay" : "OnTriggerEnter", self.gameObject, other.collider, other.gameObject];
    }
    return [stay ? "OnCollisionStay" : "OnCollisionEnter", self.gameObject, buildCollision(contact, forA, true), other.gameObject];
}

function exitEvent(contact, forA) {
    const self = forA ? contact.a : contact.b;
    const other = forA ? contact.b : contact.a;
    if (!contact.enabled) return ["OnTriggerExit", self.gameObject, other.collider];
    return ["OnCollisionExit", self.gameObject, buildCollision(contact, forA, false)];
}

// The record's normal is A->B and velocities are B relative to A; Unity expects them from the
// receiver's point of view, so A gets the normal flipped and B the velocities flipped.
function buildCollision(contact, forA, withContacts) {
    const self = forA ? contact.a : contact.b;
    const other = forA ? contact.b : contact.a;
    const normalSign = forA ? -1 : 1;
    const velocitySign = -normalSign;

    const contacts = [];
    if (withContacts) {
        for (let i = 0; i < contact.count; i++) {
            const point = contact.points[i];
            contacts.push(new ContactPoint({
                point: new Vector2(point.x, point.y),
                normal: new Vector2(contact.nx * normalSign, contact.ny * normalSign),
                separation: point.separation,
                normalImpulse: point.jn,
                tangentImpulse: point.jt,
                relativeVelocity: new Vector2(point.rvx * velocitySign, point.rvy * velocitySign),
                collider: other.collider,
                otherCollider: self.collider,
                rigidbody: other.rb,
                otherRigidbody: self.rb,
                enabled: contact.enabled,
            }));
        }
    }

    return new Collision({
        gameObject: other.gameObject,
        collider: other.collider,
        otherCollider: self.collider,
        rigidbody: other.rb,
        otherRigidbody: self.rb,
        relativeVelocity: new Vector2(contact.rvx * velocitySign, contact.rvy * velocitySign),
        enabled: contact.enabled,
        contacts,
    });
}

function effectiveMass(a, b, point, dx, dy) {
    const ra = point.rax * dy - point.ray * dx;
    const rb = point.rbx * dy - point.rby * dx;
    return a.invMass + b.invMass + ra * ra * a.invI + rb * rb * b.invI;
}

// Writes to RV.
function relativeVelocity(a, b, point) {
    const va = a.isStatic ? STILL : a.rb.velocity;
    const vb = b.isStatic ? STILL : b.rb.velocity;
    RV.x = vb.x - b.w * point.rby - (va.x - a.w * point.ray);
    RV.y = vb.y + b.w * point.rbx - (va.y + a.w * point.rax);
}

// A body without a Rigidbody doesn't affect the result.
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

function projectedRadius(box, x, y) {
    return box.ex * Math.abs(x * box.cos + y * box.sin) + box.ey * Math.abs(-x * box.sin + y * box.cos);
}

// SAT, then clip the incident face against the reference face.
function boxBox(a, b) {
    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;

    let bestA = Infinity, axisA = 0;
    let bestB = Infinity, axisB = 0;

    for (let i = 0; i < 4; i++) {
        const owner = i < 2 ? a : b;
        const x = i % 2 === 0 ? owner.cos : -owner.sin;
        const y = i % 2 === 0 ? owner.sin : owner.cos;

        const overlap = projectedRadius(a, x, y) + projectedRadius(b, x, y) - Math.abs(dx * x + dy * y);
        if (overlap <= 0) return false;

        if (i < 2 && overlap < bestA) { bestA = overlap; axisA = i; }
        if (i >= 2 && overlap < bestB) { bestB = overlap; axisB = i - 2; }
    }

    const useB = bestB < RELATIVE_TOLERANCE * bestA - ABSOLUTE_TOLERANCE;
    const ref = useB ? b : a;
    const inc = useB ? a : b;
    const axis = useB ? axisB : axisA;

    let rnx = axis === 0 ? ref.cos : -ref.sin;
    let rny = axis === 0 ? ref.sin : ref.cos;
    if ((inc.cx - ref.cx) * rnx + (inc.cy - ref.cy) * rny < 0) {
        rnx = -rnx;
        rny = -rny;
    }

    const refExtent = axis === 0 ? ref.ex : ref.ey;
    const refHalf = axis === 0 ? ref.ey : ref.ex;
    const fcx = ref.cx + rnx * refExtent;
    const fcy = ref.cy + rny * refExtent;
    const tx = -rny;
    const ty = rnx;

    const ux = inc.cos, uy = inc.sin;
    const vx = -inc.sin, vy = inc.cos;
    const du = rnx * ux + rny * uy;
    const dv = rnx * vx + rny * vy;

    let icx, icy, ehx, ehy;
    if (Math.abs(du) >= Math.abs(dv)) {
        const s = du > 0 ? -1 : 1;
        icx = inc.cx + ux * s * inc.ex;
        icy = inc.cy + uy * s * inc.ex;
        ehx = vx * inc.ey;
        ehy = vy * inc.ey;
    } else {
        const s = dv > 0 ? -1 : 1;
        icx = inc.cx + vx * s * inc.ey;
        icy = inc.cy + vy * s * inc.ey;
        ehx = ux * inc.ex;
        ehy = uy * inc.ex;
    }

    let p1x = icx - ehx, p1y = icy - ehy;
    let p2x = icx + ehx, p2y = icy + ehy;
    let t1 = (p1x - fcx) * tx + (p1y - fcy) * ty;
    let t2 = (p2x - fcx) * tx + (p2y - fcy) * ty;

    for (const [limit, sign] of [[refHalf, 1], [-refHalf, -1]]) {
        const out1 = (t1 - limit) * sign > 0;
        const out2 = (t2 - limit) * sign > 0;
        if (out1 && out2) return contactFallback(a, b, useB, rnx, rny, bestA, bestB);
        if (out1 || out2) {
            const f = (limit - t1) / (t2 - t1);
            const x = p1x + (p2x - p1x) * f;
            const y = p1y + (p2y - p1y) * f;
            if (out1) { p1x = x; p1y = y; t1 = limit; }
            else { p2x = x; p2y = y; t2 = limit; }
        }
    }

    // Moved halfway out so the points sit between the boxes.
    HIT.count = 0;
    for (const [px, py] of [[p1x, p1y], [p2x, p2y]]) {
        const separation = (px - fcx) * rnx + (py - fcy) * rny;
        if (separation > CONTACT_TOLERANCE) continue;

        const x = px - rnx * separation / 2;
        const y = py - rny * separation / 2;
        if (HIT.count === 0) { HIT.x1 = x; HIT.y1 = y; }
        else { HIT.x2 = x; HIT.y2 = y; }
        HIT.count++;
    }
    if (HIT.count === 0) return contactFallback(a, b, useB, rnx, rny, bestA, bestB);

    HIT.nx = useB ? -rnx : rnx;
    HIT.ny = useB ? -rny : rny;
    HIT.depth = useB ? bestB : bestA;
    return true;
}

// Rounding left no clipped point.
function contactFallback(a, b, useB, rnx, rny, bestA, bestB) {
    HIT.nx = useB ? -rnx : rnx;
    HIT.ny = useB ? -rny : rny;
    HIT.depth = useB ? bestB : bestA;
    HIT.count = 1;
    HIT.x1 = (a.cx + b.cx) / 2;
    HIT.y1 = (a.cy + b.cy) / 2;
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
    HIT.count = 1;
    HIT.x1 = a.cx + HIT.nx * (a.ex - HIT.depth / 2);
    HIT.y1 = a.cy + HIT.ny * (a.ex - HIT.depth / 2);
    return true;
}

// Normal points from the circle to the box.
function circleBox(circle, box) {
    const radius = circle.ex;
    const hx = box.ex;
    const hy = box.ey;
    const { cos, sin } = box;
    const wx = circle.cx - box.cx;
    const wy = circle.cy - box.cy;
    const dx = wx * cos + wy * sin;
    const dy = -wx * sin + wy * cos;

    const closestX = Math.max(-hx, Math.min(hx, dx));
    const closestY = Math.max(-hy, Math.min(hy, dy));
    const diffX = dx - closestX;
    const diffY = dy - closestY;
    const distSq = diffX * diffX + diffY * diffY;

    let nx, ny, px, py;
    if (distSq > 0) {
        if (distSq >= radius * radius) return false;
        const dist = Math.sqrt(distSq);
        nx = -diffX / dist;
        ny = -diffY / dist;
        px = closestX;
        py = closestY;
        HIT.depth = radius - dist;
    } else {
        const left = dx + hx;
        const right = hx - dx;
        const top = dy + hy;
        const bottom = hy - dy;
        const min = Math.min(left, right, top, bottom);

        px = dx;
        py = dy;
        if (min === left) { nx = 1; ny = 0; px = -hx; }
        else if (min === right) { nx = -1; ny = 0; px = hx; }
        else if (min === top) { nx = 0; ny = 1; py = -hy; }
        else { nx = 0; ny = -1; py = hy; }

        HIT.depth = radius + min;
    }

    HIT.nx = nx * cos - ny * sin;
    HIT.ny = nx * sin + ny * cos;
    HIT.count = 1;
    HIT.x1 = box.cx + px * cos - py * sin;
    HIT.y1 = box.cy + px * sin + py * cos;
    return true;
}
