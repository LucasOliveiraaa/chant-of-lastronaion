
import Transform from "./Transform.js";
import World from "./World.js";

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

        World.getInstance().addGameObject(this);
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
        const component = new componentClass();

        component.setup(this);

        component.awake?.();

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
