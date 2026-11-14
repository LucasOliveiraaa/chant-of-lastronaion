
import Transform from "./Transform.js";
import World from "./World.js";

export default class GameObject {
    components = new Map();

    name = null;
    tag = null;
    tags = new Set();

    transform = new Transform();

    __lifecycleStarted = false;
    __startQueue = Promise.resolve();

    constructor(name = "Game Object", ...components) {
        this.name = name;

        for (const component of components) {
            this.addComponent(component);
        }

        World.getInstance().add(this);
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

        console.log(component);
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
        for (const componentList of this.components.values()) {
            for (const component of componentList) {
                component.__destroy();
            }
        }

        this.components.clear();

        World.getInstance().remove(this);
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
