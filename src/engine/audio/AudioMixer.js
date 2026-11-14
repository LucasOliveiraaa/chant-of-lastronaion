import AudioListener from "./AudioListener.js";

/**
 * Named volume groups that AudioSources route into (a light version of Unity's AudioMixer).
 * "Master", "Music" and "SFX" exist by default; "Music" and "SFX" feed into "Master".
 * Volumes are linear, 0 to 1.
 */
export default class AudioMixer {
    static #groups = new Map([
        ["Master", { name: "Master", parent: null, volume: 1, mute: false, node: null }],
        ["Music", { name: "Music", parent: "Master", volume: 1, mute: false, node: null }],
        ["SFX", { name: "SFX", parent: "Master", volume: 1, mute: false, node: null }],
    ]);

    static createGroup(name, parent = "Master") {
        if (AudioMixer.#groups.has(name)) {
            throw new Error(`Audio mixer group "${name}" already exists.`);
        }
        AudioMixer.#getGroup(parent);
        AudioMixer.#groups.set(name, { name, parent, volume: 1, mute: false, node: null });
    }

    static hasGroup(name) {
        return AudioMixer.#groups.has(name);
    }

    static getVolume(name) {
        return AudioMixer.#getGroup(name).volume;
    }

    static setVolume(name, volume) {
        const group = AudioMixer.#getGroup(name);
        group.volume = Math.max(0, volume);
        AudioMixer.#apply(group);
    }

    static getMute(name) {
        return AudioMixer.#getGroup(name).mute;
    }

    static setMute(name, mute) {
        const group = AudioMixer.#getGroup(name);
        group.mute = !!mute;
        AudioMixer.#apply(group);
    }

    /** @internal The group's input node, created (with its parents) on first use. */
    static __getNode(name) {
        const group = AudioMixer.#getGroup(name);

        if (!group.node) {
            group.node = AudioListener.context.createGain();
            AudioMixer.#apply(group);

            const destination = group.parent === null
                ? AudioListener.__output
                : AudioMixer.__getNode(group.parent);
            group.node.connect(destination);
        }

        return group.node;
    }

    static #getGroup(name) {
        const group = AudioMixer.#groups.get(name);
        if (!group) throw new Error(`Audio mixer group "${name}" does not exist.`);
        return group;
    }

    static #apply(group) {
        if (group.node) group.node.gain.value = group.mute ? 0 : group.volume;
    }
}
