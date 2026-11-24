import UIElement from "./UIElement.js";
import type Graphics from "../rendering/Graphics.js";

export type UILabelAlign = "left" | "center" | "right";
export type UILabelVerticalAlign = "top" | "middle" | "bottom";

/**
 * Draws text inside the element's rect (Unity's UI Text).
 * "\n" always breaks a line; with wordWrap, lines also break at spaces to fit the width.
 */
export default class UILabel extends UIElement {
    constructor();

    text: string;

    fontSize: number;
    fontFamily: string;
    /** CSS font-style/weight prefix, e.g. "bold" or "italic 600". Default "". */
    fontStyle: string;
    color: string;

    /** Default "left". */
    align: UILabelAlign;
    /** Default "top". */
    verticalAlign: UILabelVerticalAlign;
    /** Distance between lines as a multiple of fontSize. Default 1.2. */
    lineHeight: number;

    /** Break lines at spaces to fit the rect's width. Default false. */
    wordWrap: boolean;
    /** Hide text outside the rect. Default false. */
    clip: boolean;

    /** The CSS font string built from fontStyle, fontSize and fontFamily. */
    readonly font: string;

    /** The lines as they will be drawn (measured with graphics when wordWrap is on). */
    getLines(graphics: Graphics): string[];

    render(graphics: Graphics): void;
}
