import World from "../core/World.js";
import Light2D from "./Light2D.js";

const FALLOFF_STOPS = 8;
const MAX_CACHED_COLORS = 256;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toScreen = ([a, b, c, d, e, f], point) => ({
    x: a * point.x + c * point.y + e,
    y: b * point.x + d * point.y + f,
});

// Builds a lightmap (black, plus every light added on top) and multiplies the frame by it.
export default class LightingEngine {
    constructor() {
        this._lightmap = null;
        this._scratch = null;
        this._probe = null;
        this._colors = new Map();
    }

    // Called by the RenderingEngine after the Renderers, so gizmos and UI stay unlit.
    // view is the camera's world to screen matrix [a, b, c, d, e, f].
    render(view = [1, 0, 0, 1, 0, 0]) {
        const lights = World.getInstance().findObjectsByType(Light2D).filter(light => light.isStarted);
        if (lights.length === 0) return;

        const { canvas, ctx } = World.getInstance();
        const width = canvas.width;
        const height = canvas.height;
        if (width === 0 || height === 0) return;

        const lightmap = this._lightmap ??= document.createElement("canvas");
        if (lightmap.width !== width || lightmap.height !== height) {
            lightmap.width = width;
            lightmap.height = height;
        }

        const lctx = lightmap.getContext("2d");
        lctx.setTransform(1, 0, 0, 1, 0, 0);
        lctx.globalCompositeOperation = "source-over";
        lctx.fillStyle = "#000000";
        lctx.fillRect(0, 0, width, height);

        lctx.globalCompositeOperation = "lighter";
        for (const light of lights) {
            switch (light.lightType) {
                case "Global": this._drawGlobal(lctx, light, width, height); break;
                case "Point": this._drawPoint(lctx, light, view); break;
                case "Freeform": this._drawFreeform(lctx, light, view, width, height); break;
                default: console.warn(`Unknown light type "${light.lightType}".`);
            }
        }

        // Keep the light only where something was drawn, so the empty background stays unlit.
        lctx.globalCompositeOperation = "destination-in";
        lctx.drawImage(canvas, 0, 0);

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "multiply";
        ctx.drawImage(lightmap, 0, 0);
        ctx.restore();
    }

    _drawGlobal(ctx, light, width, height) {
        ctx.fillStyle = this._lightColor(light, 1);
        ctx.fillRect(0, 0, width, height);
    }

    _drawPoint(ctx, light, view) {
        const zoom = Math.hypot(view[0], view[1]);
        const outer = Math.max(0, light.pointLightOuterRadius) * zoom;
        if (outer === 0) return;
        const inner = clamp(light.pointLightInnerRadius * zoom, 0, outer);
        const { x, y } = toScreen(view, light.gameObject.transform.worldPosition);

        // 0 -> 0.5 (soft), 0.5 -> 2, 1 -> 8 (sharp).
        const exponent = 2 ** (4 * clamp(light.falloffIntensity, 0, 1) - 1);

        const gradient = ctx.createRadialGradient(x, y, inner, x, y, outer);
        for (let i = 0; i <= FALLOFF_STOPS; i++) {
            const t = i / FALLOFF_STOPS;
            gradient.addColorStop(t, this._lightColor(light, (1 - t) ** exponent));
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x - outer, y - outer, outer * 2, outer * 2);
    }

    _drawFreeform(ctx, light, view, width, height) {
        const shape = light.shapePath;
        if (!shape || shape.length < 3) return;

        // In screen pixels from here on.
        const transform = light.gameObject.transform;
        const origin = transform.worldPosition;
        const rotation = transform.worldRotation;
        const path = shape.map(point => toScreen(view, point.rotate(rotation).add(origin)));
        const color = this._lightColor(light, 1);
        const falloff = Math.max(0, light.shapeLightFalloffSize) * Math.hypot(view[0], view[1]);

        if (falloff === 0) {
            ctx.fillStyle = color;
            this._tracePath(ctx, path, 0, 0);
            ctx.fill();
            return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const point of path) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }

        // Screen area the light can reach, limited to the visible part (plus the blur margin).
        const pad = Math.ceil(falloff) + 1;
        const left = Math.floor(Math.max(minX - pad, -pad));
        const top = Math.floor(Math.max(minY - pad, -pad));
        const right = Math.ceil(Math.min(maxX + pad, width + pad));
        const bottom = Math.ceil(Math.min(maxY + pad, height + pad));
        const w = right - left;
        const h = bottom - top;
        if (w <= 0 || h <= 0) return;

        // The soft edge is the shape's shadow. It is drawn on a scratch canvas first, because with
        // "lighter" the shadow under the shape would add up with the shape itself.
        const scratch = this._scratch ??= document.createElement("canvas");
        if (scratch.width < w || scratch.height < h) {
            scratch.width = Math.max(scratch.width, w);
            scratch.height = Math.max(scratch.height, h);
        }

        const sctx = scratch.getContext("2d");
        sctx.setTransform(1, 0, 0, 1, 0, 0);
        sctx.clearRect(0, 0, w, h);
        sctx.save();
        sctx.shadowColor = color;
        sctx.shadowBlur = falloff;
        sctx.fillStyle = color;
        this._tracePath(sctx, path, -left, -top);
        sctx.fill();
        sctx.restore();

        ctx.drawImage(scratch, 0, 0, w, h, left, top, w, h);
    }

    _tracePath(ctx, path, offsetX, offsetY) {
        ctx.beginPath();
        ctx.moveTo(path[0].x + offsetX, path[0].y + offsetY);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x + offsetX, path[i].y + offsetY);
        }
        ctx.closePath();
    }

    // The light's color scaled by its intensity (and the color's own alpha), as a CSS rgba().
    _lightColor(light, alpha) {
        const { r, g, b, a } = this._parseColor(light.color);
        const k = Math.max(0, light.intensity) * a;
        const channel = (value) => Math.round(clamp(value * k, 0, 255));
        return `rgba(${channel(r)}, ${channel(g)}, ${channel(b)}, ${clamp(alpha, 0, 1)})`;
    }

    // Lets the browser parse any CSS color by painting it on a 1x1 canvas.
    _parseColor(color) {
        let rgba = this._colors.get(color);
        if (rgba) return rgba;

        const probe = this._probe ??= Object.assign(document.createElement("canvas"), { width: 1, height: 1 })
            .getContext("2d", { willReadFrequently: true });

        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = "#000000";
        probe.fillStyle = color;
        probe.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
        rgba = { r, g, b, a: a / 255 };

        if (this._colors.size >= MAX_CACHED_COLORS) this._colors.clear();
        this._colors.set(color, rgba);
        return rgba;
    }
}
