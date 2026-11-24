import World from "../core/World.js";
import Graphics from "./Graphics.js";
import Renderer from "./Renderer.js";
import Camera from "./Camera.js";
import UICanvas from "../ui/UICanvas.js";

const IDENTITY = [1, 0, 0, 1, 0, 0];

const byOrder = (a, b) => (a.sortingLayer - b.sortingLayer) || (a.sortingOrder - b.sortingOrder);

// Draws the frame after lateUpdate(), through Camera.main (1:1 when there is none), in passes:
//   1. Renderers, culled to the view and sorted by sortingLayer, then sortingOrder,
//   2. lighting, over what the renderers drew,
//   3. the camera's background color, behind everything and unlit,
//   4. gizmos (onDrawGizmos of any component), unlit and in world space,
//   5. UI canvases, in screen space on top of everything.
export default class RenderingEngine {
    constructor() {
        this.graphics = null;
        this.drawGizmos = true;
        this.culling = true;
    }

    render() {
        const world = World.getInstance();
        const graphics = this.graphics ??= new Graphics(world.ctx);
        const camera = Camera.main;
        const view = camera ? camera.__viewMatrix() : IDENTITY;

        graphics.__beginFrame();
        graphics.__setView(view);

        this.#renderWorld(world, graphics, camera);

        graphics.__resetSpace();
        world.lighting.render(view);

        if (camera?.backgroundColor) graphics.__fillBehind(camera.backgroundColor);

        if (this.drawGizmos) this.#renderGizmos(world, graphics);

        graphics.__resetSpace();
        graphics.alpha = 1;
        for (const canvas of world.findObjectsByType(UICanvas)) {
            if (canvas.isStarted) canvas.render(graphics);
        }
    }

    #renderWorld(world, graphics, camera) {
        const view = this.culling ? this.#viewBounds(graphics, camera) : null;

        const renderers = world.findObjectsByType(Renderer).filter(renderer =>
            renderer.isStarted && renderer.enabled && (!view || overlaps(renderer.bounds, view))
        );
        renderers.sort(byOrder);

        for (const renderer of renderers) {
            graphics.__setLocalSpace(renderer.gameObject.transform);
            graphics.alpha = 1;
            renderer.render(graphics);
        }
    }

    #renderGizmos(world, graphics) {
        graphics.__setWorldSpace();
        graphics.alpha = 1;

        for (const gameObject of world.gameObjects) {
            for (const componentList of gameObject.components.values()) {
                for (const component of componentList) {
                    if (component.isStarted) component.onDrawGizmos?.(graphics);
                }
            }
        }
    }

    #viewBounds(graphics, camera) {
        if (camera) return camera.viewBounds;
        return { min: { x: 0, y: 0 }, max: { x: graphics.width, y: graphics.height } };
    }
}

function overlaps(a, b) {
    return a.max.x >= b.min.x && a.max.y >= b.min.y && a.min.x <= b.max.x && a.min.y <= b.max.y;
}
