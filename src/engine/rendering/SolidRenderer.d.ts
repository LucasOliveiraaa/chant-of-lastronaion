import type Component from "../core/Component.js";

/** Fills the GameObject's rect (position and scale) with a solid color. */
export default class SolidRenderer extends Component {
    /** Any CSS color. Default "#000000". */
    color: string;
}
