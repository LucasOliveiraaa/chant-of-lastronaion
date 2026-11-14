// A decoded sound, loaded with Assets.loadAudio (Unity's AudioClip).
export default class AudioClip {
    constructor(key, src, buffer) {
        this.key = key;
        this.src = src;
        this.buffer = buffer;
    }

    get name() {
        return this.key;
    }

    /** Duration in seconds. */
    get length() {
        return this.buffer.duration;
    }

    get samples() {
        return this.buffer.length;
    }

    get channels() {
        return this.buffer.numberOfChannels;
    }

    get frequency() {
        return this.buffer.sampleRate;
    }
}
