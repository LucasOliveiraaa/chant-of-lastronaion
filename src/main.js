import World from "./engine/core/World.js";
import GameObject from "./engine/core/GameObject.js";
import SpriteRenderer from "./engine/rendering/SpriteRenderer.js";
import Animator from "./engine/animation/Animator.js";
import PlayerMovement from "./game/components/PlayerMovement.js";
import Rigidbody from "./engine/physics/Rigidbody.js";
import SquareCollider from "./engine/physics/SquareCollider.js";
import SolidRenderer from "./engine/rendering/SolidRenderer.js";

const canvas = document.getElementById("game");

function createWall(x, y, width, height, color = "#00FF00") {
    const wall = new GameObject("Wall", SolidRenderer, SquareCollider, Rigidbody);
    wall.transform.position.set(x, y);
    wall.transform.scale.set(width, height);

    wall.getComponent(SolidRenderer).color = color;
    wall.getComponent(SquareCollider).debug = true;
    const wallRigidbody = wall.getComponent(Rigidbody);
    wallRigidbody.gravityScale = 0;
    wallRigidbody.bodyType = "static";
}

async function main() {
    const player = new GameObject("Player", SpriteRenderer, Animator, Rigidbody, SquareCollider, PlayerMovement);
    player.transform.position.set(100, 100);

    createWall(0, 0, 500, 20);
    createWall(0, 0, 20, 500);
    createWall(0, 480, 500, 20);
    createWall(480, 0, 20, 500);

    const world = World.getInstance();
    await world.init(canvas);
    world.run();
}

main()