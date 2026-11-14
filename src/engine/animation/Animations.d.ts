import type { SpriteId } from "../assets/Sprites";

/** Stable: never reused after a clip is removed. */
export type AnimationId = number;
export type TransitionPolicy = "interrupt" | "finish";

export type AnimationFrame = {
    /** Sprite id or sprite name. */
    spriteId: SpriteId | string;
    /** Seconds this frame stays on screen. */
    duration: number;
};

export type Animation = {
    id: AnimationId;
    name: string;
    frames: AnimationFrame[];
    /** Default false. */
    loop: boolean;
    /** Not used by the Animator yet. */
    interruptible?: boolean;
};

export type AnimationDefinition = Omit<Animation, "id" | "name" | "loop"> & { loop?: boolean };

export type Transition = {
    from: AnimationId;
    to: AnimationId;
    /** Not used by the Animator yet. */
    animationId?: AnimationId;
    /** Not used by the Animator yet. */
    policy?: TransitionPolicy;
};

export type TransitionDefinition = Omit<Transition, "from" | "to"> & {
    from: AnimationId | string;
    to: AnimationId | string;
};

/** Registry of animation clips, addressed by id or name. */
export default class Animations {
    private constructor();
    static getInstance(): Animations;

    /**
     * Registers a clip and returns its id.
     * Defining a name that already exists updates that clip in place and keeps its id.
     */
    defineAnimation(name: string, animation: AnimationDefinition): AnimationId;
    hasAnimation(idOrName: AnimationId | string): boolean;
    getAnimation(idOrName: AnimationId | string): Animation | null;
    removeAnimation(idOrName: AnimationId | string): void;

    /** Throws if either end is unknown. Names are resolved to ids. */
    defineTransition(transition: TransitionDefinition): void;
    getTransition(from: AnimationId | string, to: AnimationId | string): Transition | null;
    removeTransition(from: AnimationId | string, to: AnimationId | string): void;
}

/**
 * Creates an array of animation frames from a list of sprite ids (or names) and a duration.
 *
 * The duration is split evenly among the frames, so that the total duration of the animation is equal to the given duration.
 * @param spriteIds The ids or names of the sprites to use as frames in the animation.
 * @param duration The total duration of the animation, in seconds.
 */
export function frames(spriteIds: (SpriteId | string)[], duration: number): AnimationFrame[];
