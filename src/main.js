import Assets from "./engine/assets.js";
import SpriteRenderer from "./engine/components/SpriteRenderer.js";
import { range } from "./engine/lib/sprite.js";
import World from "./engine/world.js";
import Player from "./game/entities/player.js";

const world = World.getInstance();
world.init(document.getElementById("game"));

await Assets.load({
    player: "./assets/player-spritesheet.png",
});

const player = world.addEntity(new Player());

player.addComponent(new SpriteRenderer(Assets.get("player"), {
    rows: 54,
    cols: 13,
    animations: {
        idle: { frames: [312, 313], duration: 0.5 },
        runNorth: { frames: range(494, 501), duration: 0.5 },
        runWest: { frames: range(507, 514), duration: 0.5 },
        runSouth: { frames: range(520, 527), duration: 0.5 },
        runEast: { frames: range(533, 540), duration: 0.5 },
    },
    defaultAnimation: "idle",
}));

world.run();