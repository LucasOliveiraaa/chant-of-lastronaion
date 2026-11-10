import Vector2 from "./vector2.js";

export default class Input {
    static instance = null;

    #keys = new Set();
    #mouse = {
        pos: new Vector2(0, 0),
        buttons: new Set()
    }

    constructor() {}

    static getInstance() {
        if (!Input.instance) {
            Input.instance = new Input();
        }
        return Input.instance;
    }

    static init(canvas) {
        canvas.addEventListener("mousedown", (event) => {
            Input.getInstance().#mouse.buttons.add(event.button);
        });
        canvas.addEventListener("mouseup", (event) => {
            Input.getInstance().#mouse.buttons.delete(event.button);
        });
        canvas.addEventListener("mousemove", (event) => {
            const rect = canvas.getBoundingClientRect();
            Input.getInstance().#mouse.pos.set(
                event.clientX - rect.left,
                event.clientY - rect.top
            );
        });

        window.addEventListener("keydown", (event) => {
            Input.getInstance().#keys.add(event.code);
        });
        window.addEventListener("keyup", (event) => {
            Input.getInstance().#keys.delete(event.code);
        });
    }

    static isKeyPressed(key) {
        return Input.getInstance().#keys.has(key);
    }

    static isMouseButtonPressed(button) {
        return Input.getInstance().#mouse.buttons.has(button);
    }

    static getMousePosition() {
        return Input.getInstance().#mouse.pos;
    }
}