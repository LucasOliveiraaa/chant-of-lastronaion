import Input from "../input/Input.js";
import Time from "./Time.js";
import PhysicsEngine from "../physics/PhysicsEngine.js";

// The single scene plus the game loop. GameObjects register themselves on construction.
export default class World {
    static instance = null;

    gameObjects = [];
    physics = new PhysicsEngine();

    canvas = null;
    ctx = null;

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

        Input.__init(canvas);
        Time.__start();

        this.__initialized = true;

        await Promise.all(
            this.gameObjects.map(gameObject => gameObject.start())
        );
    }

    addGameObject(gameObject) {
        if (this.gameObjects.includes(gameObject)) {
            return gameObject;
        }

        this.gameObjects.push(gameObject);

        if (this.__initialized) {
            gameObject.start();
        }

        return gameObject;
    }

    removeGameObject(gameObject) {
        const index = this.gameObjects.indexOf(gameObject);

        if (index !== -1) {
            this.gameObjects.splice(index, 1);
        }
    }

    // Every component of the given type in the scene (Unity's Object.FindObjectsByType).
    findObjectsByType(componentClass) {
        const components = [];

        for (const gameObject of this.gameObjects) {
            components.push(...gameObject.getComponents(componentClass));
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

        const frame = (now) => {
            if (!this.__running) return;

            Time.__tick(now);
            Input.__beginFrame(Time.unscaledDeltaTime);
            this.__accumulatedTime += Time.deltaTime;

            this.ctx.clearRect(
                0,
                0,
                this.canvas.width,
                this.canvas.height
            );

            const objects = [...this.gameObjects];

            // deltaTime is capped by Time.maximumDeltaTime, which bounds the steps per frame.
            while (this.__accumulatedTime >= Time.fixedDeltaTime) {
                Time.__fixedStep(() => {
                    this.physics.fixedUpdate();

                    for (const gameObject of objects) {
                        gameObject.fixedUpdate();
                    }
                });

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
