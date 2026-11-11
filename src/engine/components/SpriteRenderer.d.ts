import type Component from "../component.js";
import type { ImageAsset } from "../assets.js";
import type Vector2 from "../vector2.js";

export type AnimationConfig = {
    /**
     * The index of the frames to be played.
     * Sheets with one sprite must specify index 0.
     */
    frames: number[];
    /** Total time in seconds to play all frames once. Must be greater than 0. */
    duration: number;
    /**
     * The name of the animation to be played after this one finishes.
     * The transition happens automatically, carrying over leftover time.
     * When not specified, the animation will loop back to the first frame.
     */
    nextAnimation?: string;
};

export type SpriteSheetConfig = {
    gap?: Vector2;
    margin?: Vector2;

    rows?: number;
    cols?: number;

    animations?: Map<string, AnimationConfig> | Record<string, AnimationConfig>;
    /**
     * The animation started on construction.
     * When not specified, the renderer shows frame 0 until setAnimation is called.
     */
    defaultAnimation?: string;
};

export default class SpriteRenderer extends Component {
    readonly currentAnimation: string | null;

    readonly asset: ImageAsset;

    /** Accepts a loaded asset, or the key of an asset loaded through `Assets`. */
    constructor(source: ImageAsset | string, config?: SpriteSheetConfig);

    update(target: any, deltaTime: number): void;

    /**
     * Switches to the given animation. Does nothing if it is already playing,
     * unless `restart` is true. Throws if the animation does not exist.
     */
    setAnimation(name: string, restart?: boolean): void;
}