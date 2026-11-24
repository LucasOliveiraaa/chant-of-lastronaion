import Component from "../core/Component.js";
import Time from "../core/Time.js";
import Vector2 from "../math/Vector2.js";
import Camera from "./Camera.js";

// Moves its GameObject (the one with the Camera) so the view keeps a target in frame,
// like a Cinemachine follow camera. Runs in lateUpdate, after the target moved.
export default class CameraFollow extends Component {
    target = null;
    offset = new Vector2(0, 0);
    // Roughly the seconds it takes to catch up; 0 sticks to the target.
    damping = 0.15;
    // Half size, in world pixels, of the box around the view center the target can move in freely.
    deadZone = new Vector2(0, 0);
    // AABB the view is kept inside, or null.
    bounds = null;

    start() {
        this.snap();
    }

    lateUpdate() {
        this.#moveTo(this.#goal(), this.damping > 0 ? 1 - Math.exp(-Time.deltaTime / this.damping) : 1);
    }

    // Jumps to the target right away, e.g. after a teleport or a scene change.
    snap() {
        this.#moveTo(this.#goal(), 1);
    }

    #goal() {
        const current = this.gameObject.transform.worldCenter;
        if (!this.target) return current;

        const desired = this.target.worldCenter.add(this.offset);
        const follow = (want, have, slack) => {
            const delta = want - have;
            if (Math.abs(delta) <= slack) return have;
            return want - Math.sign(delta) * slack;
        };

        return new Vector2(
            follow(desired.x, current.x, Math.max(0, this.deadZone.x)),
            follow(desired.y, current.y, Math.max(0, this.deadZone.y))
        );
    }

    #moveTo(goal, t) {
        const transform = this.gameObject.transform;
        const current = transform.worldCenter;
        let x = current.x + (goal.x - current.x) * t;
        let y = current.y + (goal.y - current.y) * t;

        if (this.bounds) {
            const half = this.gameObject.getComponent(Camera)?.viewSize.divide(2) ?? Vector2.zero();
            x = clampView(x, half.x, this.bounds.min.x, this.bounds.max.x);
            y = clampView(y, half.y, this.bounds.min.y, this.bounds.max.y);
        }

        transform.worldPosition = new Vector2(x - transform.scale.x / 2, y - transform.scale.y / 2);
    }
}

// Keeps [center - half, center + half] inside [min, max], or centers it when it doesn't fit.
function clampView(center, half, min, max) {
    if (max - min <= half * 2) return (min + max) / 2;
    return Math.min(max - half, Math.max(min + half, center));
}
