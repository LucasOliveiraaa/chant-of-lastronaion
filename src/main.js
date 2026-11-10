import SpriteRenderer from "./engine/components/SpriteRenderer.js";
import Vector2 from "./engine/vector2.js";
import World from "./engine/world.js"
import Player from "./game/entities/player.js";

const canvas = document.getElementById("game");

const world = World.getInstance();
world.init(canvas);

async function loadImage(src) {
    const img = new Image();
    img.src = src;
    
    return new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
}

!(async () => {
    const playerSprite = await loadImage("./assets/player-spritesheet.png");

    const player = world.addEntity(new Player());

    const renderer = player.addComponent(new SpriteRenderer(playerSprite, {
        rows: 54,
        cols: 13,
        gap: new Vector2(0, 0),
        margin: new Vector2(0, 0),
        animations: {
            idle: {
                frames: [312, 313],
                duration: 0.5,
                loop: true
            }
        }
    }));

    renderer.setAnimation("idle");

    world.run();
})()