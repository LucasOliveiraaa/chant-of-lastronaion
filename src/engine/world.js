export default class World {
    entities = [];
    lastTime = 0;

    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.resize();
        window.addEventListener("resize", this.resize.bind(this));
    }

    addEntity(entity) {
        this.entities.push(entity);
    }

    resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    run() {
        const now = performance.now();
        const deltaTime = now - this.lastTime;
        this.lastTime = now;

        for (const entity of this.entities) {
            entity.__update(this, deltaTime);
        }

        requestAnimationFrame(this.run.bind(this));
    }
}