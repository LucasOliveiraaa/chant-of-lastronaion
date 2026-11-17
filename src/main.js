import World from "./engine/core/World.js";
import GameObject from "./engine/core/GameObject.js";
import SpriteRenderer from "./engine/rendering/SpriteRenderer.js";
import Animator from "./engine/animation/Animator.js";
import PlayerMovement from "./game/components/PlayerMovement.js";
import Rigidbody from "./engine/physics/Rigidbody.js";
import SquareCollider from "./engine/physics/SquareCollider.js";
import SolidRenderer from "./engine/rendering/SolidRenderer.js";
import RectTransform from "./engine/ui/RectTransform.js";
import UIButton from "./engine/ui/UIButton.js";
import UICanvas from "./engine/ui/UICanvas.js";
import Health from "./game/components/PlayerState.js";
import Enemy from "./game/components/Enemy.js";
import Trap from "./game/components/Trap.js";
import PlayerState from "./game/components/PlayerState.js";

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
    const player = new GameObject("Player", SolidRenderer, Animator, Rigidbody, SquareCollider, PlayerMovement, PlayerState);
    player.tag = "player";
    player.transform.position.set(100, 100);

    // const enemy = new GameObject("Enemy", SolidRenderer, Rigidbody, SquareCollider, Enemy);
    // enemy.transform.position.set(200, 200);

    const trap = new GameObject("Trap", SolidRenderer, Trap, SquareCollider);
    trap.transform.position.set(300, 300);
    trap.getComponent(SquareCollider).trigger = true;

    createWall(0, 0, 500, 20);
    createWall(0, 0, 20, 500);
    createWall(0, 480, 500, 20);
    createWall(480, 0, 20, 500);

    const world = World.getInstance();
    await world.init(canvas);
    world.run();
}

main()