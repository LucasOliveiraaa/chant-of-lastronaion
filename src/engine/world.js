import Input from "./input.js";
import PhysicsEngine from "./physics.js";

export default class World {
    static instance = null;

    entities = [];
    lastTime = null;
    physics = new PhysicsEngine();

    /**
     * Returns the singleton instance of the World class.
     * @returns {World}
     */
    static getInstance() {
        if (!World.instance) {
            World.instance = new World();
        }
        return World.instance;
    }

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.resize();
        window.addEventListener("resize", this.resize.bind(this));

        Input.init(canvas);
    }

    /**
     * Adds an entity to the world.
     * @param {import("./entity.js").default} entity 
     */
    addEntity(entity) {
        this.entities.push(entity);
        return entity;
    }

    /**
     * Removes an entity from the world.
     * @param {import("./entity.js").default} entity 
     */
    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index !== -1) {
            this.entities.splice(index, 1);
        }
    }

    /**
     * Gets all entities with the specified name.
     * @param {string} name 
     * @returns {import("./entity.js").default[]}
     */
    getEntitiesByName(name) {
        return this.entities.filter(entity => entity.name === name);
    }
    
    /**
     * Gets all entities with the specified tag.
     * @param {string} tag 
     * @returns {import("./entity.js").default[]}
     */
    getEntitiesByTag(tag) {
        return this.entities.filter(entity => entity.tags.has(tag));
    }

    getComponents(componentClass) {
        const components = [];
        for (const entity of this.entities) {
            const component = entity.getComponent(componentClass);
            if (component) {
                components.push([entity, component]);
            }
        }
        return components;
    }

    resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    run() {
        if (!this.lastTime) {
            this.lastTime = performance.now();
        }
        const now = performance.now();
        const deltaTime = (now - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = now;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.physics.update(deltaTime);

        for (const entity of this.entities) {
            entity.__update(deltaTime);
        }

        requestAnimationFrame(this.run.bind(this));
    }
}