import type AudioClip from "../audio/AudioClip";

export class ImageAsset {
    readonly key: string;
    readonly src: string;
    readonly image: HTMLImageElement;
    readonly width: number;
    readonly height: number;
}

export type Asset = ImageAsset | AudioClip;

/**
 * Loads assets on demand and caches them by key. There is a single scene, so nothing has
 * to be preloaded: components can await what they need in `start()`.
 * Concurrent or repeated loads of the same key share one load.
 */
export default class Assets {
    private constructor();

    /**
     * Loads every asset of the manifest in parallel.
     * Keys are the names used later with `Assets.get`, values are the sources.
     * Audio files (mp3, ogg, opus, wav, m4a, aac, flac, webm) are recognized by extension;
     * everything else loads as an image.
     */
    static load(manifest: Record<string, string>): Promise<void>;

    static loadImage(key: string, src: string): Promise<ImageAsset>;
    /** Fetches and decodes a sound. Needs the page to be served over HTTP(S). */
    static loadAudio(key: string, src: string): Promise<AudioClip>;

    /** True once the asset has finished loading. */
    static has(key: string): boolean;
    /** Throws if the asset has not finished loading. */
    static get<T extends Asset = Asset>(key: string): T;
}
