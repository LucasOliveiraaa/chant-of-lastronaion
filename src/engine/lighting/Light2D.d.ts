import type Component from "../core/Component.js";
import type Vector2 from "../math/Vector2.js";

/**
 * - "Point": radial light centered on the transform's world position.
 * - "Global": lights the whole screen evenly (use it as the ambient light).
 * - "Freeform": lights the polygon in shapePath, with a soft edge of shapeLightFalloffSize.
 */
export type LightType = "Point" | "Global" | "Freeform";

/**
 * Unity's Light2D. Lights add up and the result multiplies everything the Renderers drew,
 * so whatever no light reaches is black. Gizmos and UI are never lit.
 * With no started Light2D in the scene, the frame is drawn unlit.
 */
export default class Light2D extends Component {
    /** Default "Point". */
    lightType: LightType;
    /** Any CSS color; its alpha scales the intensity. Default "#ffffff". */
    color: string;
    /** Multiplies the color. Each channel is clamped to full brightness. Default 1. */
    intensity: number;

    /** Point: full intensity up to this radius, in pixels. Default 0. */
    pointLightInnerRadius: number;
    /** Point: no light past this radius, in pixels. Default 100. */
    pointLightOuterRadius: number;
    /** Point: 0 to 1, higher fades faster after the inner radius. Default 0.5. */
    falloffIntensity: number;

    /** Freeform: polygon points relative to the transform's world position, turned by its world rotation. Default a 100px square. */
    shapePath: Vector2[];
    /** Freeform: width in pixels of the soft edge outside the polygon. 0 is a hard edge. Default 10. */
    shapeLightFalloffSize: number;
}
