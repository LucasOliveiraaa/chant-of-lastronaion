import type { SpriteId, SpriteSheetId } from "../assets/Sprites";

export type AnimationId = number;
export type TransitionPolicy = "interrupt" | "finish";

export type AnimationFrame = {
    spriteId: SpriteId;
    duration: number;
}

export type Animation = {
    id: AnimationId;
    name: string;
    frames: AnimationFrame[];
    loop: boolean;
    interruptible: boolean;
}

export type Transition = {
    from: AnimationId;
    to: AnimationId;
    animationId: AnimationId;
    policy: TransitionPolicy;
}

export default class Animations {
    private constructor();
    static getInstance(): Animations;

    defineAnimation(name: string, animation: Omit<Animation, "id" | "name">): AnimationId;
    defineTransition(transition: Transition): void;

    getAnimation(id: AnimationId | string): Animation | null;
    getTransition(from: AnimationId | string, to: AnimationId | string): Transition | null;

    removeAnimation(id: AnimationId | string): void;
    removeTransition(from: AnimationId | string, to: AnimationId | string): void;
}

/**
 * Creates an array of animation frames from a list of sprite IDs and a duration.
 * 
 * The duration is split evenly among the frames, so that the total duration of the animation is equal to the given duration.
 * @param spriteIds The IDs of the sprites to use as frames in the animation.
 * @param duration The total duration of the animation.
 */
export function frames(spriteIds: SpriteId[], duration: number): AnimationFrame[];