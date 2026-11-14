export default class Time {
    private constructor();
    static getInstance(): Time;

    public static get elapsedTime(): number;

    public static get fixedDeltaTime(): number;
    public static get deltaTime(): number;

    public static get fps(): number;
    public static get frameCount(): number;
}