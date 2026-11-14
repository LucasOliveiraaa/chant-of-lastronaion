const UNLOCK_EVENTS = ["pointerdown", "keydown", "touchend"];

/**
 * Static, like Unity's AudioListener.volume / AudioListener.pause. Owns the Web Audio context.
 *
 * Browsers keep audio suspended until the first user gesture. The context is resumed on
 * the first click, touch or key press, so sounds played before that start right then.
 */
export default class AudioListener {
    static #context = null;
    static #output = null;
    static #volume = 1;
    static #paused = false;

    /** The shared AudioContext, created on first use. */
    static get context() {
        if (!AudioListener.#context) AudioListener.#create();
        return AudioListener.#context;
    }

    /** Master volume, 0 to 1. */
    static get volume() {
        return AudioListener.#volume;
    }

    static set volume(value) {
        AudioListener.#volume = Math.max(0, value);
        if (AudioListener.#output) AudioListener.#output.gain.value = AudioListener.#volume;
    }

    /** Pauses every sound (sources keep their position and resume when set back to false). */
    static get pause() {
        return AudioListener.#paused;
    }

    static set pause(value) {
        AudioListener.#paused = !!value;
        const context = AudioListener.#context;
        if (!context) return;

        // resume() is refused before the first user gesture; the unlock listener retries then.
        const change = AudioListener.#paused ? context.suspend() : context.resume();
        change.catch(() => {});
    }

    /** @internal Node every mixer group ends in. */
    static get __output() {
        AudioListener.context;
        return AudioListener.#output;
    }

    static #create() {
        const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
        if (!AudioContextClass) {
            throw new Error("This browser doesn't support the Web Audio API.");
        }

        const context = new AudioContextClass();
        const output = context.createGain();
        output.gain.value = AudioListener.#volume;
        output.connect(context.destination);

        AudioListener.#context = context;
        AudioListener.#output = output;

        if (context.state === "running") return;

        const unlock = () => {
            if (AudioListener.#paused) return;
            context.resume().then(() => {
                for (const event of UNLOCK_EVENTS) window.removeEventListener(event, unlock, true);
            });
        };
        for (const event of UNLOCK_EVENTS) window.addEventListener(event, unlock, true);
    }
}
