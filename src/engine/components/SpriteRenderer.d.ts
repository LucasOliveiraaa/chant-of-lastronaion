import type Component from "../component.js";
import type Vector2 from "../vector2.js";

export type AnimationConfig = {
    /**
     * The index of the frames to be played.
     * Sheets with one sprite must specify index 0.
     */
    frames: number[];
    duration: number;
    loop: boolean;
};

export type SpriteConfig = {
    sprite: HTMLImageElement;

    gap: Vector2;
    margin: Vector2;

    rows: number;
    cols: number;

    animations: AnimationConfig[];
};

export default class SpriteRenderer extends Component {
    constructor(config: SpriteConfig);
}