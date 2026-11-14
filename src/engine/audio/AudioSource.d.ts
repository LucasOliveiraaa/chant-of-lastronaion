import type Component from "../core/Component.js";
import type AudioClip from "./AudioClip.js";
import type { AudioMixerGroup } from "./AudioMixer.js";

/**
 * Plays AudioClips (Unity's AudioSource). Sound is not positional.
 *
 * - Music: a looping source with `outputAudioMixerGroup = "Music"`.
 * - Effects: `playOneShot(clip)` on any source; one-shots overlap and don't affect play/stop state.
 */
export default class AudioSource extends Component {
    clip: AudioClip | null;
    /** Plays clip when the component starts, like Unity. Default true. */
    playOnAwake: boolean;
    /** AudioMixer group the sound goes through. Read when playback starts. Default "Master". */
    outputAudioMixerGroup: AudioMixerGroup;

    /** 0 to 1. Default 1. */
    volume: number;
    mute: boolean;
    /** Playback speed; also changes the pitch, like Unity. Must be > 0. Default 1. */
    pitch: number;
    loop: boolean;

    readonly isPlaying: boolean;
    /** Playback position of clip in seconds. Setting it seeks (or sets where play() starts). */
    time: number;

    /** Plays clip from the start (or from the time set while stopped). */
    play(): void;
    pause(): void;
    unPause(): void;
    /** Stops clip and every one-shot, and rewinds to the start. */
    stop(): void;
    /** Plays a clip once, on top of anything else, scaled by this source's volume. */
    playOneShot(clip: AudioClip, volumeScale?: number): void;
}
