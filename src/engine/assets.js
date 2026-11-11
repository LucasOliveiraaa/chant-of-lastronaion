export class ImageAsset {
    constructor(key, src, image) {
        this.key = key;
        this.src = src;
        this.image = image;
    }

    get width() {
        return this.image.naturalWidth;
    }

    get height() {
        return this.image.naturalHeight;
    }
}

export default class Assets {
    static #assets = new Map();
    static #loading = new Map();

    /**
     * Loads every asset of the manifest in parallel ({ key: src }).
     * Rejects naming the first asset that fails.
     */
    static async load(manifest) {
        await Promise.all(
            Object.entries(manifest).map(([key, src]) => Assets.loadImage(key, src))
        );
    }

    static loadImage(key, src) {
        const existing = Assets.#loading.get(key);
        if (existing) {
            if (existing.src !== src) {
                throw new Error(`Asset "${key}" is already registered with source "${existing.src}".`);
            }
            return existing.promise;
        }

        const promise = new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(new ImageAsset(key, src, image));
            image.onerror = () => reject(new Error(`Failed to load asset "${key}" from "${src}".`));
            image.src = src;
        })
            .then((asset) => {
                Assets.#assets.set(key, asset);
                return asset;
            })
            .catch((error) => {
                Assets.#loading.delete(key);
                throw error;
            });

        Assets.#loading.set(key, { src, promise });
        return promise;
    }

    static get(key) {
        const asset = Assets.#assets.get(key);
        if (!asset) {
            throw new Error(`Asset "${key}" is not loaded. Did you await Assets.load()?`);
        }
        return asset;
    }
}