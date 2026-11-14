import Input from "../input/Input.js";
import Time from "./Time.js";
import PhysicsEngine from "../physics/PhysicsEngine.js";

export default class World {
    static instance = null;

    gameObjects = [];
    physics = new PhysicsEngine();

    __running = false;
    __initialized = false;
    __accumulatedTime = 0;
    __rafId = null;

    static getInstance() {
        if (!World.instance) {
            World.instance = new World();
        }

        return World.instance;
    }

    async init(canvas) {
        if (this.__initialized) return;

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        if (!this.ctx) {
            throw new Error("Could not initialize canvas context.");
        }

        this.resize();
        window.addEventListener("resize", this.resize.bind(this));

        Input.init(canvas);
        Time.startTime();

        this.__initialized = true;

        await Promise.all(
            this.gameObjects.map(gameObject => gameObject.start())
        );
    }

    add(gameObject) {
        if (this.gameObjects.includes(gameObject)) {
            return gameObject;
        }

        this.gameObjects.push(gameObject);

        if (this.__initialized) {
            gameObject.start();
        }

        return gameObject;
    }

    remove(gameObject) {
        const index = this.gameObjects.indexOf(gameObject);

        if (index !== -1) {
            this.gameObjects.splice(index, 1);
        }
    }

    getGameObjectsByName(name) {
        return this.gameObjects.filter(
            gameObject => gameObject.name === name
        );
    }

    getGameObjectsByTag(tag) {
        return this.gameObjects.filter(
            gameObject => gameObject.tags.has(tag)
        );
    }

    getComponents(componentClass) {
        const components = [];

        for (const gameObject of this.gameObjects) {
            const component = gameObject.getComponent(componentClass);

            if (component) {
                components.push([gameObject, component]);
            }
        }

        return components;
    }

    resize() {
        if (!this.canvas) return;

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    run() {
        if (this.__running) return;

        if (!this.__initialized) {
            throw new Error("World must be initialized before running.");
        }

        this.__running = true;

        const frame = () => {
            if (!this.__running) return;

            Time.tick();
            this.__accumulatedTime += Time.deltaTime;

            this.ctx.clearRect(
                0,
                0,
                this.canvas.width,
                this.canvas.height
            );

            const objects = [...this.gameObjects];

            while (this.__accumulatedTime >= Time.fixedDeltaTime) {
                this.physics.fixedUpdate();

                for (const gameObject of objects) {
                    gameObject.fixedUpdate();
                }

                this.__accumulatedTime -= Time.fixedDeltaTime;
            }

            for (const gameObject of objects) {
                gameObject.update();
            }

            for (const gameObject of objects) {
                gameObject.lateUpdate();
            }

            this.__rafId = requestAnimationFrame(frame);
        };

        this.__rafId = requestAnimationFrame(frame);
    }

    stop() {
        this.__running = false;

        if (this.__rafId !== null) {
            cancelAnimationFrame(this.__rafId);
            this.__rafId = null;
        }
    }
}
