import Sprites from "../assets/Sprites.js";

const DEG_TO_RAD = Math.PI / 180;

// Every draw call of the engine goes through here. Context state is cached so repeated
// styles aren't sent to the canvas again; restore() drops the cache, since it rewinds the state.
export default class Graphics {
    #ctx;
    #state = {};
    // World to screen matrix [a, b, c, d, e, f], set from the camera every frame.
    #view = [1, 0, 0, 1, 0, 0];

    constructor(ctx) {
        this.#ctx = ctx;
    }

    get width() {
        return this.#ctx.canvas.width;
    }

    get height() {
        return this.#ctx.canvas.height;
    }

    get alpha() {
        return this.#ctx.globalAlpha;
    }

    set alpha(value) {
        this.#set("globalAlpha", Math.min(1, Math.max(0, value)));
    }

    get imageSmoothing() {
        return this.#ctx.imageSmoothingEnabled;
    }

    set imageSmoothing(value) {
        this.#set("imageSmoothingEnabled", !!value);
    }

    save() {
        this.#ctx.save();
    }

    restore() {
        this.#ctx.restore();
        this.#state = {};
    }

    // Draws are clipped to this rect until restore().
    clip(x, y, width, height) {
        const ctx = this.#ctx;
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();
    }

    clear() {
        const ctx = this.#ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    setTransform(a, b, c, d, e, f) {
        this.#ctx.setTransform(a, b, c, d, e, f);
    }

    fillRect(x, y, width, height, color) {
        this.#set("fillStyle", color);
        this.#ctx.fillRect(x, y, width, height);
    }

    strokeRect(x, y, width, height, color, lineWidth = 1) {
        this.#stroke(color, lineWidth);
        this.#ctx.strokeRect(x, y, width, height);
    }

    fillRoundRect(x, y, width, height, radius, color) {
        this.#roundRect(x, y, width, height, radius);
        this.#set("fillStyle", color);
        this.#ctx.fill();
    }

    strokeRoundRect(x, y, width, height, radius, color, lineWidth = 1) {
        this.#roundRect(x, y, width, height, radius);
        this.#stroke(color, lineWidth);
        this.#ctx.stroke();
    }

    fillCircle(x, y, radius, color) {
        this.#circle(x, y, radius);
        this.#set("fillStyle", color);
        this.#ctx.fill();
    }

    strokeCircle(x, y, radius, color, lineWidth = 1) {
        this.#circle(x, y, radius);
        this.#stroke(color, lineWidth);
        this.#ctx.stroke();
    }

    fillPolygon(points, color) {
        if (points.length < 3) return;
        this.#polygon(points);
        this.#set("fillStyle", color);
        this.#ctx.fill();
    }

    strokePolygon(points, color, lineWidth = 1) {
        if (points.length < 2) return;
        this.#polygon(points);
        this.#stroke(color, lineWidth);
        this.#ctx.stroke();
    }

    drawLine(x1, y1, x2, y2, color, lineWidth = 1) {
        const ctx = this.#ctx;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        this.#stroke(color, lineWidth);
        ctx.stroke();
    }

    // Accepts a sprite object or its id or name.
    drawSprite(sprite, x, y, width, height, flipX = false, flipY = false) {
        const sprites = Sprites.getInstance();
        if (typeof sprite !== "object") sprite = sprites.getSprite(sprite);
        if (!sprite) return;

        const image = sprites.getSpriteSheet(sprite.spriteSheetId)?.asset.image;
        if (!image) return;

        const { position, size } = sprite;
        const ctx = this.#ctx;

        if (!flipX && !flipY) {
            ctx.drawImage(image, position.x, position.y, size.x, size.y, x, y, width, height);
            return;
        }

        // Mirrors around the destination rect's center.
        ctx.save();
        ctx.translate(x + width / 2, y + height / 2);
        ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
        ctx.drawImage(image, position.x, position.y, size.x, size.y, -width / 2, -height / 2, width, height);
        ctx.restore();
    }

    drawImage(image, x, y, width = image.width, height = image.height) {
        this.#ctx.drawImage(image, x, y, width, height);
    }

    drawText(text, x, y, { font = "16px sans-serif", color = "#000000", align = "left", baseline = "alphabetic", maxWidth } = {}) {
        this.#set("font", font);
        this.#set("fillStyle", color);
        this.#set("textAlign", align);
        this.#set("textBaseline", baseline);

        if (maxWidth === undefined) this.#ctx.fillText(text, x, y);
        else this.#ctx.fillText(text, x, y, maxWidth);
    }

    measureText(text, font = "16px sans-serif") {
        this.#set("font", font);
        return this.#ctx.measureText(text).width;
    }

    // ---- Engine internals ----------------------------------------------

    // Resizing the canvas resets its state, so the cache can't be trusted across frames.
    __beginFrame() {
        this.#state = {};
        this.clear();
        this.alpha = 1;
    }

    __setView(matrix) {
        this.#view = matrix;
    }

    /** Screen space, origin at the canvas' top-left corner. */
    __resetSpace() {
        this.#ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    /** World space, as seen by the camera. */
    __setWorldSpace() {
        this.#ctx.setTransform(...this.#view);
    }

    /** The transform's rect space: origin at the rect's top-left, rotated around its center. */
    __setLocalSpace(transform) {
        const center = transform.worldCenter;
        const angle = transform.worldRotation * DEG_TO_RAD;
        const halfWidth = transform.scale.x / 2;
        const halfHeight = transform.scale.y / 2;

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const e = center.x - cos * halfWidth + sin * halfHeight;
        const f = center.y - sin * halfWidth - cos * halfHeight;

        // view * local
        const [va, vb, vc, vd, ve, vf] = this.#view;
        this.#ctx.setTransform(
            va * cos + vc * sin,
            vb * cos + vd * sin,
            -va * sin + vc * cos,
            -vb * sin + vd * cos,
            va * e + vc * f + ve,
            vb * e + vd * f + vf
        );
    }

    /** Fills what is still transparent, behind everything drawn so far. */
    __fillBehind(color) {
        const ctx = this.#ctx;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }

    /** @internal Raw context, for engine passes (e.g. lighting) that need canvas features. */
    get __context() {
        return this.#ctx;
    }

    #set(key, value) {
        if (this.#state[key] === value) return;
        this.#state[key] = value;
        this.#ctx[key] = value;
    }

    #stroke(color, lineWidth) {
        this.#set("strokeStyle", color);
        this.#set("lineWidth", lineWidth);
    }

    #circle(x, y, radius) {
        const ctx = this.#ctx;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
    }

    #roundRect(x, y, width, height, radius) {
        const ctx = this.#ctx;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, width, height, radius);
        else ctx.rect(x, y, width, height);
    }

    #polygon(points) {
        const ctx = this.#ctx;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.closePath();
    }
}
