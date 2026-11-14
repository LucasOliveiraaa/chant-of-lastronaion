export default class Time {
    static instance = null;
    constructor() {}

    static getInstance() {
        if (!Time.instance) {
            Time.instance = new Time();
        }
        return Time.instance;
    }

    __lastTime = null;

    __startTime = 0;

    __fixedDeltaTime = 1 / 50;
    __deltaTime = 0;

    __frameCount = 0;
    __accumulatedTime = 0;
    __accumulatedFrameCount = 0;
    __fps = 0;

    static startTime() {
        const self = Time.getInstance();
        self.__startTime = performance.now();
    }

    static tick() {
        const self = Time.getInstance();
        if (self.__lastTime === null) {
            self.__lastTime = performance.now();
            return;
        }

        const currentTime = performance.now();
        self.__deltaTime = (currentTime - self.__lastTime) / 1000;
        self.__lastTime = currentTime;

        self.__frameCount++;
        self.__accumulatedFrameCount++;
        self.__accumulatedTime += self.__deltaTime;

        if (self.__accumulatedTime >= 1) {
            self.__fps = self.__accumulatedFrameCount;
            self.__accumulatedFrameCount = 0;
            self.__accumulatedTime -= 1;
        }
    }

    static get fixedDeltaTime() {
        return Time.getInstance().__fixedDeltaTime;
    }

    static get deltaTime() {
        return Time.getInstance().__deltaTime;
    }

    static get elapsedTime() {
        const self = Time.getInstance();
        return (performance.now() - self.__startTime) / 1000;
    }

    static get fps() {
        return Time.getInstance().__fps;
    }

    static get frameCount() {
        return Time.getInstance().__frameCount;
    }
}