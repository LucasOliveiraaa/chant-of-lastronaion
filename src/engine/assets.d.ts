export class ImageAsset {
    readonly key: string;
    readonly src: string;
    readonly image: HTMLImageElement;
    readonly width: number;
    readonly height: number;
}

export default class Assets {
    private constructor();

    /**
     * Loads every asset of the manifest in parallel.
     * Keys are the names used later with `Assets.get`, values are the sources.
     */
    static load(manifest: Record<string, string>): Promise<void>;

    static loadImage(key: string, src: string): Promise<ImageAsset>;

    /** Throws if the asset has not finished loading. */
    static get(key: string): ImageAsset;
}