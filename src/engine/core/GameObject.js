
import Transform from "./Transform.js";
import World from "./World.js";
import Vector2 from "../math/Vector2.js";

// Set only while instantiate() builds a clone, so the World doesn't start it half-built.
let deferRegistration = false;

// Engine bookkeeping that every component gets fresh and must never be copied.
const UNCOPIED_COMPONENT_FIELDS = new Set(["gameObject", "observers", "__state", "__startPromise"]);
// The clone's hierarchy is rebuilt by instantiate, not copied.
const UNCOPIED_TRANSFORM_FIELDS = new Set(["parent", "children"]);

export default class GameObject {
    components = new Map();

    name = null;
    tag = "Untagged";

    transform = new Transform();

    __lifecycleStarted = false;
    __startQueue = Promise.resolve();

    constructor(name = "Game Object", ...components) {
        this.name = name;
        this.transform.gameObject = this;

        for (const component of components) {
            this.addComponent(component);
        }

        if (!deferRegistration && !this.isPrefab) {
            World.getInstance().addGameObject(this);
        }
    }

    get isPrefab() {
        return false;
    }

    // ---- Unity's Object.Instantiate ------------------------------------

    // Overloads, like Unity:
    //   instantiate(original)
    //   instantiate(original, parent, instantiateInWorldSpace = false)
    //   instantiate(original, position, rotation, parent = null)
    static instantiate(original, ...args) {
        if (!(original instanceof GameObject)) {
            throw new TypeError("instantiate: the original must be a GameObject.");
        }

        let parent = null;
        let position = null;
        let rotation = null;
        let worldSpace = true;

        if (args[0] instanceof Vector2) {
            [position, rotation = 0, parent = null] = args;
        } else if (args.length > 0) {
            [parent = null, worldSpace = false] = args;
        }

        if (parent !== null && !(parent instanceof Transform)) {
            throw new TypeError("instantiate: parent must be a Transform.");
        }

        // Every object in the original hierarchy -> its copy, so references between them
        // point at the copies (Unity does the same). Everything else stays shared.
        const clones = new Map();
        const pending = [];
        const root = GameObject.__cloneHierarchy(original, clones, pending);
        root.name = `${original.name}(Clone)`;

        for (const [source, target] of pending) {
            GameObject.__copyFields(source, target, clones);
        }

        // Placement. Like Unity, a clone without a parent goes to the scene root.
        const transform = root.transform;
        transform.setParent(parent, false);

        if (position) {
            transform.worldRotation = rotation;
            transform.worldPosition = position;
        } else if (worldSpace) {
            transform.worldRotation = original.transform.worldRotation;
            transform.worldPosition = original.transform.worldPosition;
        }

        // Awake on the whole hierarchy first, then registration starts it (Start runs later).
        const objects = [root, ...[...transform.descendants()].map(child => child.gameObject)];

        for (const gameObject of objects) {
            for (const componentList of gameObject.components.values()) {
                for (const component of [...componentList]) {
                    if (!(component instanceof Transform)) {
                        component.awake?.();
                    }
                }
            }
        }

        for (const gameObject of objects) {
            World.getInstance().addGameObject(gameObject);
        }

        return root;
    }

    // Creates the copy of a GameObject, its components and its children, without copying
    // any field yet. [source, copy] pairs to copy are pushed to pending.
    static __cloneHierarchy(original, clones, pending) {
        let clone;
        deferRegistration = true;
        try {
            clone = new GameObject(original.name);
        } finally {
            deferRegistration = false;
        }

        clone.tag = original.tag;
        clones.set(original, clone);

        for (const [key, componentList] of original.components) {
            for (const component of componentList) {
                // A Transform in the list is a RectTransform; only the active one is copied.
                if (component instanceof Transform && component !== original.transform) continue;

                const copy = new component.constructor();
                copy.setup(clone);
                clones.set(component, copy);

                if (component === original.transform) {
                    clone.transform = copy;
                } else {
                    pending.push([component, copy]);
                }

                if (!clone.components.has(key)) {
                    clone.components.set(key, []);
                }
                clone.components.get(key).push(copy);
            }
        }

        clone.transform.gameObject = clone;
        clones.set(original.transform, clone.transform);
        pending.push([original.transform, clone.transform]);

        for (const child of original.transform.children) {
            if (!child.gameObject) continue;

            const childClone = GameObject.__cloneHierarchy(child.gameObject, clones, pending);
            childClone.transform.setParent(clone.transform, false);
        }

        return clone;
    }

    // Copies the source component's own fields into the fresh copy.
    static __copyFields(source, target, clones) {
        const isTransform = source instanceof Transform;

        for (const key of Object.keys(source)) {
            if (UNCOPIED_COMPONENT_FIELDS.has(key)) continue;
            if (isTransform && UNCOPIED_TRANSFORM_FIELDS.has(key)) continue;

            const value = source[key];

            // A function the copy already made for itself (a bound handler or arrow field)
            // closes over the copy; the original's would close over the original. Functions
            // assigned from outside (e.g. onClick) are shared.
            if (typeof value === "function" && typeof target[key] === "function") continue;

            target[key] = GameObject.__cloneValue(value, clones);
        }
    }

    // Vectors, arrays, plain objects, Maps and Sets are copied (deeply); references into the
    // cloned hierarchy are remapped; anything else (assets, outside objects) is shared.
    static __cloneValue(value, clones) {
        if (value === null || typeof value !== "object") return value;
        if (clones.has(value)) return clones.get(value);

        if (value instanceof Vector2) {
            return value.clone();
        }

        if (Array.isArray(value)) {
            const copy = [];
            clones.set(value, copy);
            for (const item of value) copy.push(GameObject.__cloneValue(item, clones));
            return copy;
        }

        if (value instanceof Map) {
            const copy = new Map();
            clones.set(value, copy);
            for (const [k, v] of value) {
                copy.set(GameObject.__cloneValue(k, clones), GameObject.__cloneValue(v, clones));
            }
            return copy;
        }

        if (value instanceof Set) {
            const copy = new Set();
            clones.set(value, copy);
            for (const item of value) copy.add(GameObject.__cloneValue(item, clones));
            return copy;
        }

        const prototype = Object.getPrototypeOf(value);
        if (prototype === Object.prototype || prototype === null) {
            const copy = Object.create(prototype);
            clones.set(value, copy);
            for (const key of Object.keys(value)) {
                copy[key] = GameObject.__cloneValue(value[key], clones);
            }
            return copy;
        }

        return value;
    }

    // ---- Unity's static lookups ----------------------------------------

    static find(name) {
        return World.getInstance().gameObjects.find(gameObject => gameObject.name === name) ?? null;
    }

    static findWithTag(tag) {
        return World.getInstance().gameObjects.find(gameObject => gameObject.tag === tag) ?? null;
    }

    static findGameObjectsWithTag(tag) {
        return World.getInstance().gameObjects.filter(gameObject => gameObject.tag === tag);
    }

    compareTag(tag) {
        return this.tag === tag;
    }

    sendMessage(message, ...args) {
        for (const componentList of this.components.values()) {
            for (const component of [...componentList]) {
                if (component.isStarted) {
                    component.notify(message, ...args);
                }
            }
        }
    }

    addComponent(componentClass) {
        // Unity's [RequireComponent]: the required components are added first, if missing.
        for (const required of componentClass.requiredComponents ?? []) {
            if (!(this.transform instanceof required) && !this.getComponent(required)) {
                this.addComponent(required);
            }
        }

        const component = new componentClass();

        component.setup(this);

        // Prefab components don't awake (Unity's prefab assets don't either); awake runs on
        // each instantiated copy. A Transform's awake is structural (a RectTransform replaces
        // the default transform), so it still runs.
        if (!this.isPrefab || component instanceof Transform) {
            component.awake?.();
        }

        if (!this.components.has(componentClass)) {
            this.components.set(componentClass, []);
        }

        this.components.get(componentClass).push(component);

        // Automatically initialize components added after startup.
        if (this.__lifecycleStarted) {
            this.__queueComponentStart(component);
        }

        return component;
    }

    removeComponent(componentClass) {
        for (const [key, componentList] of this.components) {
            const remaining = componentList.filter(component => {
                if (component instanceof componentClass) {
                    component.__destroy();
                    return false;
                }

                return true;
            });

            if (remaining.length === 0) {
                this.components.delete(key);
            } else {
                this.components.set(key, remaining);
            }
        }
    }

    getComponent(componentClass) {
        for (const componentList of this.components.values()) {
            for (const component of componentList) {
                if (component instanceof componentClass) {
                    return component;
                }
            }
        }

        return null;
    }

    getComponents(componentClass) {
        const components = [];

        for (const componentList of this.components.values()) {
            for (const component of componentList) {
                if (component instanceof componentClass) {
                    components.push(component);
                }
            }
        }

        return components;
    }

    destroy() {
        // Like Unity, children go with their parent. Done first, while the transforms
        // still point at their GameObjects.
        const transform = this.transform;
        for (const child of [...transform.children]) {
            child.gameObject?.destroy();
        }
        transform.setParent(null, false);

        for (const componentList of this.components.values()) {
            for (const component of componentList) {
                component.__destroy();
            }
        }

        this.components.clear();

        World.getInstance().removeGameObject(this);
    }

    __queueComponentStart(component) {
        this.__startQueue = this.__startQueue
            .then(() => component.__initialize())
            .catch(error => {
                console.error(
                    `Error starting component in ${this.name}:`,
                    error
                );
            });

        return this.__startQueue;
    }

    async start() {
        if (this.__lifecycleStarted) {
            return this.__startQueue;
        }

        this.__lifecycleStarted = true;

        for (const componentList of this.components.values()) {
            for (const component of componentList) {
                this.__queueComponentStart(component);
            }
        }

        await this.__startQueue;
    }

    fixedUpdate() {
        for (const componentList of this.components.values()) {
            for (const component of [...componentList]) {
                if (component.isStarted) {
                    component.fixedUpdate();
                }
            }
        }
    }

    update() {
        for (const componentList of this.components.values()) {
            for (const component of [...componentList]) {
                if (component.isStarted) {
                    component.update();
                }
            }
        }
    }

    lateUpdate() {
        for (const componentList of this.components.values()) {
            for (const component of [...componentList]) {
                if (component.isStarted) {
                    component.lateUpdate();
                }
            }
        }
    }
}
