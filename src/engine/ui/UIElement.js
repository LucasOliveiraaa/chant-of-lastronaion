import Component from "../core/Component.js";
import RectTransform from "./RectTransform.js";

export default class UIElement extends Component {
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

    // Called by the canvas in tree order, after layout. UI never draws in update().
    render(ctx) {}
}
