import type Component from "../core/Component.js";
import type RectTransform from "./RectTransform.js";
import type { Rect } from "./RectTransform.js";

export default class UIElement extends Component {
    /** Receives pointer events and blocks the elements behind it. */
    raycastTarget: boolean;

    /** Adds a RectTransform to the GameObject if it doesn't have one. Overrides must call super.awake(). */
    awake(): void;

    readonly rectTransform: RectTransform;
    readonly rect: Rect;

    /** Called by the canvas in tree order, after layout. */
    render(ctx: CanvasRenderingContext2D): void;
}