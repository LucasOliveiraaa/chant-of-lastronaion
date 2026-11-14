// Registry of animation clips, addressed by id or name.
// Ids come from a counter and are never reused, so they stay valid after removals.
export default class Animations {
    static instance = null;

    static getInstance() {
        if (!Animations.instance) {
            Animations.instance = new Animations();
        }
        return Animations.instance;
    }

    #nextId = 0;

    animations = new Map();      // id -> { id, name, frames, loop, ... }
    animationNames = new Map();  // name -> id
    transitions = new Map();     // from id -> Map(to id -> transition)

    // Defining a name that already exists updates that clip in place and keeps its id,
    // so it is safe to call from a component's start() that may run more than once.
    defineAnimation(name, animation) {
        if (typeof name !== "string" || !name) {
            throw new Error("An animation needs a non-empty name.");
        }

        const clip = { ...animation, loop: animation.loop ?? false, name };
        const existingId = this.animationNames.get(name);

        if (existingId !== undefined) {
            Object.assign(this.animations.get(existingId), clip, { id: existingId });
            return existingId;
        }

        const id = this.#nextId++;
        this.animations.set(id, { ...clip, id });
        this.animationNames.set(name, id);
        return id;
    }

    hasAnimation(idOrName) {
        return this.#resolve(idOrName) !== undefined;
    }

    getAnimation(idOrName) {
        return this.animations.get(this.#resolve(idOrName)) ?? null;
    }

    removeAnimation(idOrName) {
        const id = this.#resolve(idOrName);
        const animation = this.animations.get(id);
        if (!animation) return;

        this.animationNames.delete(animation.name);
        this.animations.delete(id);
        this.transitions.delete(id);

        for (const [from, toMap] of this.transitions) {
            toMap.delete(id);
            if (toMap.size === 0) this.transitions.delete(from);
        }
    }

    defineTransition(transition) {
        const from = this.#resolve(transition.from);
        const to = this.#resolve(transition.to);
        if (from === undefined || to === undefined) {
            throw new Error(`Transition "${transition.from}" -> "${transition.to}" refers to an unknown animation.`);
        }

        if (!this.transitions.has(from)) {
            this.transitions.set(from, new Map());
        }
        this.transitions.get(from).set(to, { ...transition, from, to });
    }

    getTransition(from, to) {
        return this.transitions.get(this.#resolve(from))?.get(this.#resolve(to)) ?? null;
    }

    removeTransition(from, to) {
        const fromId = this.#resolve(from);
        const fromTransitions = this.transitions.get(fromId);
        if (!fromTransitions) return;

        fromTransitions.delete(this.#resolve(to));
        if (fromTransitions.size === 0) this.transitions.delete(fromId);
    }

    #resolve(idOrName) {
        if (typeof idOrName === "string") return this.animationNames.get(idOrName);
        return this.animations.has(idOrName) ? idOrName : undefined;
    }
}

export function frames(spriteIds, duration) {
    const frameDuration = duration / spriteIds.length;
    return spriteIds.map((spriteId) => ({
        spriteId,
        duration: frameDuration,
    }));
}
