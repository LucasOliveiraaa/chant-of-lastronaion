import Component from "../core/Component.js";
import World from "../core/World.js";
import Time from "../core/Time.js";
import Vector2 from "../math/Vector2.js";
import AABB from "../math/AABB.js";

const DEG_TO_RAD = Math.PI / 180;

// Unity's orthographic Camera. It looks at its transform's world center and turns with its
// world rotation. Without a camera the world is drawn 1:1, with (0, 0) at the screen's top-left.
export default class Camera extends Component {
    enabled = true;
    // Screen pixels per world pixel.
    zoom = 1;
    // Drawn behind the world, unlit. null leaves the canvas transparent.
    backgroundColor = null;

    #shakeMagnitude = 0;
    #shakeDuration = 0;
    #shakeElapsed = 0;
    #shakeX = 0;
    #shakeY = 0;

    // The first started, enabled camera. It is the one the RenderingEngine draws with.
    static get main() {
        return World.getInstance().findObjectsByType(Camera)
            .find(camera => camera.isStarted && camera.enabled) ?? null;
    }

    // Size of the visible area in world pixels.
    get viewSize() {
        const { canvas } = World.getInstance();
        const zoom = this.#zoom;
        return new Vector2(canvas.width / zoom, canvas.height / zoom);
    }

    // World-space box around the visible area (rotation included).
    get viewBounds() {
        const { canvas } = World.getInstance();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const [x, y] of [[0, 0], [canvas.width, 0], [0, canvas.height], [canvas.width, canvas.height]]) {
            const point = this.screenToWorldPoint(new Vector2(x, y));
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }

        return new AABB(new Vector2(minX, minY), new Vector2(maxX, maxY));
    }

    // Shakes the view by up to magnitude screen pixels, fading out over duration seconds.
    // A weaker shake doesn't cut a stronger one short.
    shake(magnitude, duration) {
        const remaining = this.#shakeDuration > 0
            ? this.#shakeMagnitude * (1 - this.#shakeElapsed / this.#shakeDuration)
            : 0;
        if (magnitude < remaining) return;

        this.#shakeMagnitude = magnitude;
        this.#shakeDuration = Math.max(0, duration);
        this.#shakeElapsed = 0;
    }

    update() {
        if (this.#shakeElapsed >= this.#shakeDuration) {
            this.#shakeX = this.#shakeY = 0;
            return;
        }

        this.#shakeElapsed += Time.deltaTime;
        const strength = this.#shakeMagnitude * Math.max(0, 1 - this.#shakeElapsed / this.#shakeDuration);
        this.#shakeX = (Math.random() * 2 - 1) * strength;
        this.#shakeY = (Math.random() * 2 - 1) * strength;
    }

    worldToScreenPoint(point) {
        const [a, b, c, d, e, f] = this.__viewMatrix();
        return new Vector2(a * point.x + c * point.y + e, b * point.x + d * point.y + f);
    }

    screenToWorldPoint(point) {
        const { canvas } = World.getInstance();
        const zoom = this.#zoom;
        const center = this.gameObject.transform.worldCenter;

        return new Vector2(
            (point.x - this.#shakeX - canvas.width / 2) / zoom,
            (point.y - this.#shakeY - canvas.height / 2) / zoom
        ).rotate(this.gameObject.transform.worldRotation).add(center);
    }

    // World to screen matrix [a, b, c, d, e, f]: screen = zoom * rotate(-rotation, world - center) + half screen.
    __viewMatrix() {
        const { canvas } = World.getInstance();
        const transform = this.gameObject.transform;
        const center = transform.worldCenter;
        const angle = transform.worldRotation * DEG_TO_RAD;
        const zoom = this.#zoom;

        const a = zoom * Math.cos(angle);
        const b = -zoom * Math.sin(angle);
        const c = -b;
        const d = a;

        return [
            a, b, c, d,
            canvas.width / 2 + this.#shakeX - (a * center.x + c * center.y),
            canvas.height / 2 + this.#shakeY - (b * center.x + d * center.y),
        ];
    }

    get #zoom() {
        return Math.max(this.zoom, 1e-6);
    }
}
