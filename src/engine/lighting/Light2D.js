import Component from "../core/Component.js";
import Vector2 from "../math/Vector2.js";

// Unity's Light2D. Drawn by the World's LightingEngine; see LightingEngine for how the frame is lit.
export default class Light2D extends Component {
    lightType = "Point";
    color = "#ffffff";
    intensity = 1;

    pointLightInnerRadius = 0;
    pointLightOuterRadius = 100;
    // 0 to 1: how quickly a point light fades between its inner and outer radius.
    falloffIntensity = 0.5;

    // Freeform polygon, relative to the transform's world position and turned by its rotation.
    shapePath = [
        new Vector2(-50, -50),
        new Vector2(50, -50),
        new Vector2(50, 50),
        new Vector2(-50, 50),
    ];
    shapeLightFalloffSize = 10;
}
