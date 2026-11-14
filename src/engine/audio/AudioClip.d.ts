/** A decoded sound, loaded with `Assets.loadAudio` (Unity's AudioClip). */
export default class AudioClip {
    /** Key it was loaded with in Assets. */
    readonly key: string;
    readonly src: string;
    readonly buffer: AudioBuffer;

    /** Same as key. */
    readonly name: string;
    /** Duration in seconds. */
    readonly length: number;
    readonly samples: number;
    readonly channels: number;
    /** Sample rate in Hz. */
    readonly frequency: number;
}
