import Vector2 from "../math/Vector2.js";

export default class Input {
    static instance = null;

    constructor() {}

    static getInstance() {
        if (!Input.instance) {
            Input.instance = new Input();
        }
        return Input.instance;
    }

    __keys = new Set();
    __mouse = {
        pos: new Vector2(0, 0),
        buttons: new Set()
    }
    __axisConfigs = new Map();

    static init(canvas) {
        canvas.addEventListener("mousedown", (event) => {
            Input.getInstance().__mouse.buttons.add(event.button);
        });
        canvas.addEventListener("mouseup", (event) => {
            Input.getInstance().__mouse.buttons.delete(event.button);
        });
        canvas.addEventListener("mousemove", (event) => {
            const rect = canvas.getBoundingClientRect();
            Input.getInstance().__mouse.pos.set(
                event.clientX - rect.left,
                event.clientY - rect.top
            );
        });

        window.addEventListener("keydown", (event) => {
            Input.getInstance().__keys.add(event.code);
        });
        window.addEventListener("keyup", (event) => {
            Input.getInstance().__keys.delete(event.code);
        });
    }

    static isKeyPressed(...keys) {
        return keys.some(key => Input.getInstance().__keys.has(key));
    }

    static isMouseButtonPressed(button) {
        return Input.getInstance().__mouse.buttons.has(button);
    }

    static getMousePosition() {
        return Input.getInstance().__mouse.pos;
    }

    static getAxis(axisName) {
        const config = Input.getInstance().__axisConfigs.get(axisName);
        if (!config) {
            return 0;
        }

        let value = 0;
        if (Input.isKeyPressed(...config.positive)) {
            value += 1;
        }
        if (Input.isKeyPressed(...config.negative)) {
            value -= 1;
        }
        return value;
    }

    static setAxisConfig(axisName, config) {
        Input.getInstance().__axisConfigs.set(axisName, config);
    }
}