export default class Animations {
    static instance = null;
    constructor() {}

    static getInstance() {
        if (!Animations.instance) {
            Animations.instance = new Animations();
        }
        return Animations.instance;
    }

    animations = new Map();
    animationNames = new Map();
    transitions = new Map();

    defineAnimation(name, animation) {
        const id = this.animations.size;
        this.animations.set(id, {animation, name, id});
        this.animationNames.set(name, id);
        return id;
    }

    defineTransition(transition) {
        if (!this.transitions.has(transition.from)) {
            this.transitions.set(transition.from, new Map());
        }

        this.transitions.get(transition.from).set(transition.to, transition);
    }

    getAnimation(id) {
        if (typeof id === "string") {
            id = this.animationNames.get(id);
        }
        return this.animations.get(id) || null;
    }
    
    getTransition(from, to) {
        if (typeof from === "string") {
            from = this.animationNames.get(from);
        }
        if (typeof to === "string") {
            to = this.animationNames.get(to);
        }
        const fromTransitions = this.transitions.get(from);
        if (!fromTransitions) return null;
        return fromTransitions.get(to) || null;
    }

    removeAnimation(id) {
        if (typeof id === "string") {
            id = this.animationNames.get(id);
        }
        const animation = this.animations.get(id);
        if (!animation) return;

        this.animationNames.delete(animation.animation.name);
        this.animations.delete(id);
        this.transitions.delete(id);

        for (const [from, toMap] of this.transitions.entries()) {
            toMap.delete(id);
            if (toMap.size === 0) {
                this.transitions.delete(from);
            }
        }
    }

    removeTransition(from, to) {
        if (typeof from === "string") {
            from = this.animationNames.get(from);
        }
        if (typeof to === "string") {
            to = this.animationNames.get(to);
        }
        const fromTransitions = this.transitions.get(from);
        if (!fromTransitions) return;

        fromTransitions.delete(to);
        if (fromTransitions.size === 0) {
            this.transitions.delete(from);
        }
    }
}

export function frames(spriteIds, duration) {
    const frameDuration = duration / spriteIds.length;
    return spriteIds.map((spriteId) => ({
        spriteId,
        duration: frameDuration,
    }));
}