export default class Component {
    observers = new Map();
    gameObject = null;

    __state = "created";
    __startPromise = null;

    get isStarted() {
        return this.__state === "started";
    }

    get isDestroyed() {
        return this.__state === "destroyed";
    }

    get lifecycleState() {
        return this.__state;
    }

    setup(gameObject) {
        this.gameObject = gameObject;

        this.on("OnCollisionEnter", (collision) => {
            this.onCollisionEnter?.(collision);
        });

        this.on("OnCollisionStay", (collision) => {
            this.onCollisionStay?.(collision);
        });

        this.on("OnCollisionExit", (collision) => {
            this.onCollisionExit?.(collision);
        });

        this.on("OnTriggerEnter", (other) => {
            this.onTriggerEnter?.(other);
        });

        this.on("OnTriggerStay", (other) => {
            this.onTriggerStay?.(other);
        });

        this.on("OnTriggerExit", (other) => {
            this.onTriggerExit?.(other);
        });
    }

    on(event, callback) {
        if (!this.observers.has(event)) {
            this.observers.set(event, []);
        }

        this.observers.get(event).push(callback);
    }

    off(event, callback) {
        if (!this.observers.has(event)) return;

        const callbacks = this.observers.get(event);
        const index = callbacks.indexOf(callback);

        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }

    notify(event, ...args) {
        if (!this.observers.has(event)) return;

        for (const callback of [...this.observers.get(event)]) {
            callback(...args);
        }
    }

    async __initialize() {
        if (this.__state === "started" ||
            this.__state === "failed" ||
            this.__state === "destroyed") {
            return;
        }

        if (this.__state === "starting") {
            return this.__startPromise;
        }

        this.__state = "starting";

        this.__startPromise = (async () => {
            try {
                await this.start();

                if (this.__state !== "destroyed") {
                    this.__state = "started";
                }
            } catch (error) {
                this.__state = "failed";
                throw error;
            } finally {
                this.__startPromise = null;
            }
        })();

        return this.__startPromise;
    }

    __destroy() {
        if (this.__state === "destroyed") return;

        this.__state = "destroyed";

        if (!this.gameObject?.isPrefab) {
            try {
                this.onDestroy();
            } catch (error) {
                console.error("Error in component onDestroy():", error);
            }
        }

        this.observers.clear();
        this.gameObject = null;
    }

    start() {}

    fixedUpdate() {}
    update() {}
    lateUpdate() {}

    onDestroy() {}
}
