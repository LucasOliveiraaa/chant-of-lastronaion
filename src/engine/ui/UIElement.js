import Component from "../core/Component.js";
import RectTransform from "./RectTransform.js";

export default class UIElement extends Component {
    // Like Unity's [RequireComponent(typeof(RectTransform))], added by addComponent.
    static requiredComponents = [RectTransform];

    // Receives pointer events and blocks the elements behind it
    raycastTarget = false;

    // Like Unity's [RequireComponent(typeof(RectTransform))]: adds one if missing.
    // Subclasses that override awake() must call super.awake().
    awake() {
        if (!(this.gameObject.transform instanceof RectTransform)) {
            this.gameObject.addComponent(RectTransform);
        }
    }

    get rectTransform() {
        return this.gameObject.transform;
    }

    get rect() {
        return this.gameObject.transform.rect;
    }

    // Called by the canvas in tree order, after layout, in screen space. The state
    // (alpha, clips) is restored after each element.
    render(graphics) {}
}
