/** Static, like Unity's Time. All values are in seconds. */
export default class Time {
    private constructor();

    /** Scaled time since the last frame, capped by maximumDeltaTime. Inside fixedUpdate it returns fixedDeltaTime. */
    static readonly deltaTime: number;
    /** Real time since the last frame, ignoring timeScale and maximumDeltaTime. */
    static readonly unscaledDeltaTime: number;
    /** deltaTime smoothed over the last frames. */
    static readonly smoothDeltaTime: number;

    /** Scaled time since the game started. Inside fixedUpdate it returns fixedTime. */
    static readonly time: number;
    /** Real time since the game started, advanced once per frame. */
    static readonly unscaledTime: number;
    /** Scaled time at the start of the current fixed step. */
    static readonly fixedTime: number;
    /** Real time since the page loaded, read live (not per frame). */
    static readonly realtimeSinceStartup: number;

    /** Interval of fixedUpdate and the physics step. Default 1/50. */
    static fixedDeltaTime: number;
    /** 1 is real time, 0.5 slow motion, 0 pauses gameplay (update still runs, fixedUpdate doesn't). */
    static timeScale: number;
    /** Upper bound for a frame's deltaTime. Default 1/3. */
    static maximumDeltaTime: number;

    /** True while fixedUpdate and the physics step run. */
    static readonly inFixedTimeStep: boolean;

    static readonly frameCount: number;
    /** Frames rendered during the last full second (not in Unity, handy for debugging). */
    static readonly fps: number;

    /** @internal Called by World. */
    static __start(now?: number): void;
    /** @internal Called by World once per frame. */
    static __tick(now?: number): void;
    /** @internal Called by World for every fixed step. */
    static __fixedStep(callback: () => void): void;
}
