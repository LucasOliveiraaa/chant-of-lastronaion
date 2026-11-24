import Prefab from "../../../engine/core/Prefab.js";
import EngineCamera from "../../../engine/rendering/Camera.js";
import CameraController from "./CameraController.js";

export class CameraPrefab extends Prefab {
    constructor() {
        // CameraController requires the engine's Camera and CameraFollow.
        super("Camera", CameraController);

        this.getComponent(EngineCamera).backgroundColor = "#000000";
    }
}

export const Camera = new CameraPrefab();
