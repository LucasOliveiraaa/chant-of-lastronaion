/**
 * Static, like Unity's AudioListener.volume / AudioListener.pause. Owns the Web Audio context.
 *
 * Browsers keep audio suspended until the first user gesture; the context resumes on the
 * first click, touch or key press, so sounds played before that start right then.
 */
export default class AudioListener {
    private constructor();

    /** The shared AudioContext, created on first use. Throws if Web Audio isn't supported. */
    static readonly context: AudioContext;
    /** Master volume, 0 to 1. Default 1. */
    static volume: number;
    /** Pauses every sound; sources keep their position and continue when set back to false. */
    static pause: boolean;

    /** @internal Node every mixer group ends in. */
    static readonly __output: GainNode;
}
