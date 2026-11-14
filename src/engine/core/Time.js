// Static, like Unity's Time. The __ methods are driven by World's game loop.
export default class Time {
    static #startTime = performance.now();
    static #lastFrameTime = null;

    static #timeScale = 1;
    static #maximumDeltaTime = 1 / 3;
    static #fixedDeltaTime = 1 / 50;

    static #deltaTime = 0;
    static #unscaledDeltaTime = 0;
    static #smoothDeltaTime = 0;
    static #time = 0;
    static #unscaledTime = 0;
    static #fixedTime = 0;
    static #inFixedTimeStep = false;

    static #frameCount = 0;
    static #fps = 0;
    static #fpsTime = 0;
    static #fpsFrames = 0;

    // ---- Unity API ------------------------------------------------------

    /** Scaled seconds since the last frame, capped by maximumDeltaTime. Inside fixedUpdate it is fixedDeltaTime. */
    static get deltaTime() {
        return Time.#inFixedTimeStep ? Time.#fixedDeltaTime : Time.#deltaTime;
    }

    static get unscaledDeltaTime() {
        return Time.#unscaledDeltaTime;
    }

    static get smoothDeltaTime() {
        return Time.#smoothDeltaTime;
    }

    /** Scaled seconds since the game started. Inside fixedUpdate it is fixedTime. */
    static get time() {
        return Time.#inFixedTimeStep ? Time.#fixedTime : Time.#time;
    }

    static get unscaledTime() {
        return Time.#unscaledTime;
    }

    static get fixedTime() {
        return Time.#fixedTime;
    }

    static get realtimeSinceStartup() {
        return (performance.now() - Time.#startTime) / 1000;
    }

    static get fixedDeltaTime() {
        return Time.#fixedDeltaTime;
    }

    static set fixedDeltaTime(value) {
        if (!(value > 0)) throw new RangeError("Time.fixedDeltaTime must be greater than 0.");
        Time.#fixedDeltaTime = value;
    }

    /** 1 is real time, 0 pauses gameplay (update still runs, fixedUpdate doesn't). */
    static get timeScale() {
        return Time.#timeScale;
    }

    static set timeScale(value) {
        if (!(value >= 0)) throw new RangeError("Time.timeScale must be 0 or greater.");
        Time.#timeScale = value;
    }

    /** Upper bound for a frame's deltaTime, so a long stall can't trigger hundreds of physics steps. */
    static get maximumDeltaTime() {
        return Time.#maximumDeltaTime;
    }

    static set maximumDeltaTime(value) {
        if (!(value > 0)) throw new RangeError("Time.maximumDeltaTime must be greater than 0.");
        Time.#maximumDeltaTime = value;
    }

    static get inFixedTimeStep() {
        return Time.#inFixedTimeStep;
    }

    static get frameCount() {
        return Time.#frameCount;
    }

    /** Frames rendered during the last full second (not in Unity, handy for debugging). */
    static get fps() {
        return Time.#fps;
    }

    // ---- Engine internals ----------------------------------------------

    static __start(now = performance.now()) {
        Time.#startTime = now;
        Time.#lastFrameTime = null;
    }

    static __tick(now = performance.now()) {
        if (Time.#lastFrameTime === null) {
            Time.#lastFrameTime = now;
            return;
        }

        const raw = Math.max(0, (now - Time.#lastFrameTime) / 1000);
        Time.#lastFrameTime = now;

        Time.#unscaledDeltaTime = raw;
        Time.#unscaledTime += raw;
        Time.#deltaTime = Math.min(raw, Time.#maximumDeltaTime) * Time.#timeScale;
        Time.#time += Time.#deltaTime;
        Time.#smoothDeltaTime += (Time.#deltaTime - Time.#smoothDeltaTime) * 0.2;

        Time.#frameCount++;
        Time.#fpsFrames++;
        Time.#fpsTime += raw;
        if (Time.#fpsTime >= 1) {
            Time.#fps = Math.round(Time.#fpsFrames / Time.#fpsTime);
            Time.#fpsFrames = 0;
            Time.#fpsTime = 0;
        }
    }

    // Runs one fixed step: deltaTime/time report the fixed values inside it.
    static __fixedStep(callback) {
        Time.#inFixedTimeStep = true;
        try {
            callback();
        } finally {
            Time.#inFixedTimeStep = false;
            Time.#fixedTime += Time.#fixedDeltaTime;
        }
    }
}
