import AudioClip from "../audio/AudioClip.js";
import AudioListener from "../audio/AudioListener.js";

const AUDIO_EXTENSION = /\.(mp3|ogg|oga|opus|wav|m4a|aac|flac|webm)(\?.*)?$/i;

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

// Loads assets on demand and caches them by key. There is a single scene, so nothing has
// to be preloaded: components can await what they need in start().
export default class Assets {
    static #assets = new Map();
    static #loading = new Map();

    /**
     * Loads every asset of the manifest in parallel ({ key: src }). Audio files are recognized
     * by extension; everything else loads as an image. Rejects naming the first asset that fails.
     */
    static async load(manifest) {
        await Promise.all(
            Object.entries(manifest).map(([key, src]) =>
                AUDIO_EXTENSION.test(src) ? Assets.loadAudio(key, src) : Assets.loadImage(key, src)
            )
        );
    }

    static loadImage(key, src) {
        return Assets.#loadOnce(key, src, () => new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(new ImageAsset(key, src, image));
            image.onerror = () => reject(new Error("the image could not be loaded"));
            image.src = src;
        }));
    }

    static loadAudio(key, src) {
        return Assets.#loadOnce(key, src, async () => {
            const response = await fetch(src);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.arrayBuffer();
            const buffer = await AudioListener.context.decodeAudioData(data);
            return new AudioClip(key, src, buffer);
        });
    }

    static has(key) {
        return Assets.#assets.has(key);
    }

    static get(key) {
        const asset = Assets.#assets.get(key);
        if (!asset) {
            throw new Error(`Asset "${key}" is not loaded. Did you await Assets.load()?`);
        }
        return asset;
    }

    // Concurrent or repeated loads of a key share one promise.
    static #loadOnce(key, src, create) {
        const existing = Assets.#loading.get(key);
        if (existing) {
            if (existing.src !== src) {
                return Promise.reject(new Error(`Asset "${key}" is already registered with source "${existing.src}".`));
            }
            return existing.promise;
        }

        const promise = create()
            .then((asset) => {
                Assets.#assets.set(key, asset);
                return asset;
            })
            .catch((error) => {
                Assets.#loading.delete(key);
                throw new Error(`Failed to load asset "${key}" from "${src}": ${error.message}`);
            });

        Assets.#loading.set(key, { src, promise });
        return promise;
    }
}
