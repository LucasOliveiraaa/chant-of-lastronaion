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

export type SpriteSheetConfig = {
    gap: Vector2;
    margin: Vector2;

    rows: number;
    cols: number;

    animations: Map<string, AnimationConfig>;
};

export default class SpriteRenderer extends Component {
    constructor(sprite: HTMLImageElement, config: SpriteSheetConfig);

    update(target: any, deltaTime: number): void;

    setAnimation(name: string): void;
}