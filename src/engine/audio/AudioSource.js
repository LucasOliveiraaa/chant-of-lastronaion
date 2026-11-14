import Component from "../core/Component.js";
import AudioListener from "./AudioListener.js";
import AudioMixer from "./AudioMixer.js";

/**
 * Plays AudioClips (Unity's AudioSource). Sound is not positional.
 *
 * Music: a looping source routed to the "Music" group.
 * Effects: playOneShot(clip) on any source; one-shots overlap and don't affect play()/stop() state.
 */
export default class AudioSource extends Component {
    clip = null;
    // Like Unity, the clip starts by itself when the component starts (set clip before then).
    playOnAwake = true;
    // Name of an AudioMixer group. Read when playback starts.
    outputAudioMixerGroup = "Master";

    #volume = 1;
    #pitch = 1;
    #mute = false;
    #loop = false;

    #output = null;
    #outputGroup = null;
    #node = null;
    #oneShots = new Set();

    #state = "stopped";
    #startContextTime = 0;
    #startOffset = 0;
    #pausedAt = 0;
    #nextStart = 0;

    start() {
        if (this.playOnAwake && this.clip) this.play();
    }

    onDestroy() {
        this.stop();
        this.#output?.disconnect();
        this.#output = null;
    }

    // ---- Settings -------------------------------------------------------

    get volume() {
        return this.#volume;
    }

    set volume(value) {
        this.#volume = Math.max(0, value);
        this.#applyGain();
    }

    get mute() {
        return this.#mute;
    }

    set mute(value) {
        this.#mute = !!value;
        this.#applyGain();
    }

    /** Playback speed; also changes the pitch, like Unity. */
    get pitch() {
        return this.#pitch;
    }

    set pitch(value) {
        if (!(value > 0)) throw new RangeError("AudioSource.pitch must be greater than 0.");

        if (this.#state === "playing") {
            this.#startOffset = this.time;
            this.#startContextTime = AudioListener.context.currentTime;
            this.#node.playbackRate.value = value;
        }
        this.#pitch = value;
    }

    get loop() {
        return this.#loop;
    }

    set loop(value) {
        this.#loop = !!value;
        if (this.#node) this.#node.loop = this.#loop;
    }

    // ---- State ----------------------------------------------------------

    get isPlaying() {
        return this.#state === "playing";
    }

    /** Playback position of clip in seconds. Setting it seeks (or sets where play() starts). */
    get time() {
        if (this.#state === "paused") return this.#pausedAt;
        if (this.#state !== "playing") return this.#nextStart;

        const length = this.clip.length;
        const elapsed = (AudioListener.context.currentTime - this.#startContextTime) * this.#pitch;
        const position = this.#startOffset + elapsed;
        return this.#loop ? position % length : Math.min(position, length);
    }

    set time(value) {
        const length = this.clip?.length ?? 0;
        const position = Math.max(0, Math.min(value, length));

        if (this.#state === "playing") this.#startNode(position);
        else if (this.#state === "paused") this.#pausedAt = position;
        else this.#nextStart = position;
    }

    // ---- Playback -------------------------------------------------------

    /** Plays clip from the start (or from the time set while stopped). */
    play() {
        if (!this.clip) {
            console.warn(`AudioSource on "${this.gameObject?.name}" has no clip to play.`);
            return;
        }
        this.#startNode(this.#nextStart);
        this.#nextStart = 0;
    }

    pause() {
        if (this.#state !== "playing") return;
        this.#pausedAt = this.time;
        this.#stopNode();
        this.#state = "paused";
    }

    unPause() {
        if (this.#state !== "paused") return;
        this.#startNode(this.#pausedAt);
    }

    /** Stops clip and every one-shot, and rewinds to the start. */
    stop() {
        this.#stopNode();
        for (const node of this.#oneShots) this.#disposeNode(node);
        this.#oneShots.clear();
        this.#state = "stopped";
        this.#nextStart = 0;
    }

    /** Plays a clip once, on top of anything else, scaled by this source's volume. */
    playOneShot(clip, volumeScale = 1) {
        if (!clip) return;

        const context = AudioListener.context;
        const gain = context.createGain();
        gain.gain.value = Math.max(0, volumeScale);
        gain.connect(this.#ensureOutput());

        const node = context.createBufferSource();
        node.buffer = clip.buffer;
        node.playbackRate.value = this.#pitch;
        node.connect(gain);
        node.onended = () => {
            this.#oneShots.delete(node);
            gain.disconnect();
        };

        this.#oneShots.add(node);
        node.start();
    }

    // ---- Internals ------------------------------------------------------

    #ensureOutput() {
        const context = AudioListener.context;

        if (!this.#output) {
            this.#output = context.createGain();
            this.#applyGain();
        }
        if (this.#outputGroup !== this.outputAudioMixerGroup) {
            this.#output.disconnect();
            this.#output.connect(AudioMixer.__getNode(this.outputAudioMixerGroup));
            this.#outputGroup = this.outputAudioMixerGroup;
        }
        return this.#output;
    }

    #startNode(offset) {
        this.#stopNode();

        const context = AudioListener.context;
        const node = context.createBufferSource();
        node.buffer = this.clip.buffer;
        node.loop = this.#loop;
        node.playbackRate.value = this.#pitch;
        node.connect(this.#ensureOutput());
        node.onended = () => {
            if (this.#node !== node) return;
            this.#node = null;
            this.#state = "stopped";
        };

        node.start(0, offset);
        this.#node = node;
        this.#startContextTime = context.currentTime;
        this.#startOffset = offset;
        this.#state = "playing";
    }

    #stopNode() {
        if (!this.#node) return;
        this.#disposeNode(this.#node);
        this.#node = null;
    }

    #disposeNode(node) {
        node.onended = null;
        try {
            node.stop();
        } catch {
            // Already stopped.
        }
        node.disconnect();
    }

    #applyGain() {
        if (this.#output) this.#output.gain.value = this.#mute ? 0 : this.#volume;
    }
}
