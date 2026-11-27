// A rectangular grid of values, row-major, addressed in tiles from the chamber's top-left
// corner. A chamber blueprint has two layers of the same size: tiles (TileIds) and spawns
// (SpawnIds). null means "nothing here" (void for tiles, no spawn for spawns).
/** @template T */
export default class Layer {
    /**
     * @param {number} width
     * @param {number} height
     * @param {T | null} [fill]
     */
    constructor(width, height, fill = null) {
        this.width = width;
        this.height = height;
        /** @type {(T | null)[]} */
        this.values = new Array(width * height).fill(fill);
    }

    inBounds(x, y) {
        return x >= 0 && y >= 0 && x < this.width && y < this.height;
    }

    /** Row-major index of (x, y); stable for the layer's lifetime, so it works as a key. */
    index(x, y) {
        return y * this.width + x;
    }

    /** @returns {T | null} null outside the layer. */
    get(x, y) {
        return this.inBounds(x, y) ? this.values[this.index(x, y)] : null;
    }

    /** @param {T | null} value */
    set(x, y, value) {
        if (!this.inBounds(x, y)) throw new RangeError(`(${x}, ${y}) is outside the ${this.width}x${this.height} layer.`);
        this.values[this.index(x, y)] = value;
    }

    /**
     * Every non-null cell.
     * @returns {Generator<{ x: number, y: number, index: number, value: T }>}
     */
    *entries() {
        for (let index = 0; index < this.values.length; index++) {
            const value = this.values[index];
            if (value === null) continue;
            yield { x: index % this.width, y: Math.floor(index / this.width), index, value };
        }
    }

    /** ASCII form, e.g. layer.toRows(v => v === null ? " " : v). Handy for debugging in the console. */
    toRows(format) {
        const rows = [];
        for (let y = 0; y < this.height; y++) {
            let row = "";
            for (let x = 0; x < this.width; x++) row += format(this.get(x, y));
            rows.push(row);
        }
        return rows;
    }
}
