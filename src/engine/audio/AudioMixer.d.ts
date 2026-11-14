/** Built-in groups. Custom ones can be added with `AudioMixer.createGroup`. */
export type AudioMixerGroup = "Master" | "Music" | "SFX" | (string & {});

/**
 * Named volume groups that AudioSources route into (a light version of Unity's AudioMixer).
 * "Master", "Music" and "SFX" exist by default; "Music" and "SFX" feed into "Master".
 * Volumes are linear, 0 to 1. Unknown group names throw.
 */
export default class AudioMixer {
    private constructor();

    /** Adds a group that feeds into `parent` (default "Master"). Throws if the name is taken. */
    static createGroup(name: string, parent?: AudioMixerGroup): void;
    static hasGroup(name: string): boolean;

    static getVolume(group: AudioMixerGroup): number;
    static setVolume(group: AudioMixerGroup, volume: number): void;

    static getMute(group: AudioMixerGroup): boolean;
    static setMute(group: AudioMixerGroup, mute: boolean): void;

    /** @internal The group's input node, created (with its parents) on first use. */
    static __getNode(group: AudioMixerGroup): GainNode;
}
