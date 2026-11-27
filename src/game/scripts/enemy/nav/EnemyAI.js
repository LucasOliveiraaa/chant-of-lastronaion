import Component from "../../../../engine/core/Component.js";
import GameObject from "../../../../engine/core/GameObject.js";
import Time from "../../../../engine/core/Time.js";
import Vector2 from "../../../../engine/math/Vector2.js";
import Collider from "../../../../engine/physics/Collider.js";
import DungeonManager from "../../dungeon/DungeonManager.js";
import NavGrid from "./NavGrid.js";

const MAX_SKIPS_PER_FRAME = 4;

export default class EnemyAI extends Component {
    // Null falls back to the first GameObject with targetTag.
    target = null;
    targetTag = "player";

    repathInterval = 0.3;
    turnSpeed = 10;
    clearanceMargin = 2;
    debug = false;

    direction = Vector2.zero();
    desiredDirection = Vector2.zero();
    directionToTarget = Vector2.zero();
    distance = Infinity;
    pathDistance = Infinity;
    hasLineOfSight = false;
    canWalkDirect = false;
    reachable = false;
    path = [];

    #pathIndex = 0;
    #repathTimer = 0;
    #grid = null;
    #wasDirect = false;

    get position() {
        return centerOf(this.gameObject);
    }

    get targetPosition() {
        const target = this.#resolveTarget();
        return target ? centerOf(target) : null;
    }

    get nextWaypoint() {
        return this.path[this.#pathIndex] ?? null;
    }

    get hasPath() {
        return this.path.length > 0;
    }

    get bodyRadius() {
        const collider = this.gameObject.getComponent(Collider);
        if (collider?.isCircle) return collider.radius;
        const size = collider ? collider.getSize(this.gameObject) : this.gameObject.transform.scale;
        return Math.max(size.x, size.y) / 2;
    }

    inRange(range) {
        return this.distance <= range;
    }

    canShoot(range) {
        return this.hasLineOfSight && this.inRange(range);
    }

    repath() {
        this.#repathTimer = 0;
    }

    start() {
        // Spread path searches of enemies spawned together.
        this.#repathTimer = Math.random() * this.repathInterval;
    }

    update() {
        const target = this.#resolveTarget();
        if (!target) {
            this.#clear();
            return;
        }

        const position = this.position;
        const goal = centerOf(target);
        const toTarget = goal.subtract(position);
        this.distance = toTarget.length();
        this.directionToTarget = this.distance > 0 ? toTarget.divide(this.distance) : Vector2.zero();

        const grid = NavGrid.forChamber(DungeonManager.instance?.currentChamber);
        if (!grid) {
            this.hasLineOfSight = this.canWalkDirect = this.reachable = true;
            this.path = [goal];
            this.#pathIndex = 0;
            this.pathDistance = this.distance;
            this.#steer(this.directionToTarget);
            return;
        }

        if (!grid.contains(position)) {
            this.#clear();
            this.distance = toTarget.length();
            return;
        }

        const required = grid.requiredClearance(this.bodyRadius + this.clearanceMargin);
        this.hasLineOfSight = grid.lineClear(position, goal, 1);
        this.canWalkDirect = grid.passableAt(position, required) && grid.lineClear(position, goal, required);

        const lostDirect = this.#wasDirect && !this.canWalkDirect;
        this.#wasDirect = this.canWalkDirect;

        this.#repathTimer -= Time.deltaTime;
        if (grid !== this.#grid || this.#repathTimer <= 0 || lostDirect) {
            this.#grid = grid;
            this.#repathTimer = this.repathInterval * (0.85 + Math.random() * 0.3);
            if (!this.canWalkDirect) this.#searchPath(grid, position, goal, required);
        }

        if (this.canWalkDirect) {
            this.path = [goal];
            this.#pathIndex = 0;
            this.reachable = true;
            this.pathDistance = this.distance;
            this.#steer(this.directionToTarget);
            return;
        }

        this.#follow(grid, position, required);
    }

    #searchPath(grid, position, goal, required) {
        const result = grid.findPath(position, goal, required);
        this.path = result?.points ?? [];
        this.reachable = result?.reached ?? false;
        this.#pathIndex = 0;
    }

    #follow(grid, position, required) {
        const { path } = this;
        if (!path.length) {
            this.pathDistance = Infinity;
            this.#steer(Vector2.zero());
            return;
        }

        const arrive = grid.cellSize;
        for (let skips = 0; this.#pathIndex < path.length - 1 && skips < MAX_SKIPS_PER_FRAME; skips++) {
            const next = path[this.#pathIndex + 1];
            const closeEnough = position.distanceTo(path[this.#pathIndex]) <= arrive;
            if (!closeEnough && !grid.lineClear(position, next, required)) break;
            this.#pathIndex++;
        }

        const waypoint = path[this.#pathIndex];
        let remaining = position.distanceTo(waypoint);
        for (let i = this.#pathIndex; i < path.length - 1; i++) remaining += path[i].distanceTo(path[i + 1]);
        this.pathDistance = remaining;

        const isLast = this.#pathIndex === path.length - 1;
        if (isLast && position.distanceTo(waypoint) <= arrive) {
            this.#steer(this.reachable ? this.directionToTarget : Vector2.zero());
            return;
        }

        const toWaypoint = waypoint.subtract(position);
        const length = toWaypoint.length();
        this.#steer(length > 0 ? toWaypoint.divide(length) : Vector2.zero());
    }

    #steer(desired) {
        this.desiredDirection = desired;
        if (desired.x === 0 && desired.y === 0) {
            this.direction = Vector2.zero();
            return;
        }

        const current = this.direction;
        if (current.x === 0 && current.y === 0) {
            this.direction = desired.clone();
            return;
        }

        const t = 1 - Math.exp(-this.turnSpeed * Time.deltaTime);
        const blended = current.add(desired.subtract(current).multiply(t));
        // Turning around blends through zero.
        this.direction = blended.length() > 1e-3 ? blended.normalize() : desired.clone();
    }

    #clear() {
        this.direction = Vector2.zero();
        this.desiredDirection = Vector2.zero();
        this.directionToTarget = Vector2.zero();
        this.distance = Infinity;
        this.pathDistance = Infinity;
        this.hasLineOfSight = this.canWalkDirect = this.reachable = false;
        this.path = [];
        this.#pathIndex = 0;
    }

    #resolveTarget() {
        if (this.target?.transform && !this.target.transform.isDestroyed) return this.target;
        this.target = GameObject.findWithTag(this.targetTag);
        return this.target;
    }

    onDrawGizmos(graphics) {
        if (!this.debug) return;

        const position = this.position;
        let from = position;
        for (let i = this.#pathIndex; i < this.path.length; i++) {
            const point = this.path[i];
            graphics.drawLine(from.x, from.y, point.x, point.y, this.reachable ? "cyan" : "orange", 2);
            graphics.fillCircle(point.x, point.y, 3, "cyan");
            from = point;
        }

        const tip = position.add(this.direction.multiply(this.bodyRadius + 12));
        graphics.drawLine(position.x, position.y, tip.x, tip.y, "yellow", 2);
    }
}

function centerOf(gameObject) {
    const collider = gameObject.getComponent(Collider);
    return collider ? collider.getCenter(gameObject) : gameObject.transform.worldCenter;
}
