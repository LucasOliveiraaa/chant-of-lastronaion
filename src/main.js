import World from "./engine/core/World.js";
import GameObject from "./engine/core/GameObject.js";
import SquareCollider from "./engine/physics/SquareCollider.js";
import SolidRenderer from "./engine/rendering/SolidRenderer.js";
import Trap from "./game/components/Trap.js";
import { createProjectile } from "./game/components/Projectile.js";
import Vector2 from "./engine/math/Vector2.js";
import { Player } from "./game/scripts/player/Player.js";
import { Camera } from "./game/scripts/camera/Camera.js";
import { Dungeon } from "./game/scripts/dungeon/Dungeon.js";

const canvas = document.getElementById("game");

async function main() {
    GameObject.instantiate(Camera);
    GameObject.instantiate(Player);
    // Builds the start chamber (the cell at world (0, 0)) and puts the player in it.
    GameObject.instantiate(Dungeon);

    const trap = new GameObject("Trap", SolidRenderer, Trap, SquareCollider);
    trap.transform.position.set(380, 220);
    trap.getComponent(SquareCollider).isTrigger = true;

    createProjectile(new Vector2(300, 280), "enemy", 1, new Vector2(-1, 0));

    const world = World.getInstance();
    await world.init(canvas);
    world.run();
}

main();
