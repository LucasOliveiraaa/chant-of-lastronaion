import type Renderer from "./Renderer.js";

/** Fills the GameObject's rect (position, scale and rotation) with a solid color. */
export default class SolidRenderer extends Renderer {
    /** Any CSS color. Default "#000000". */
    color: string;
}
