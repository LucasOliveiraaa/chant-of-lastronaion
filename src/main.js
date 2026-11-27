import World from "./engine/core/World.js";
import GameObject from "./engine/core/GameObject.js";
import Projectile, { EnemyProjectile } from "./game/scripts/combat/Projectile.js";
import Vector2 from "./engine/math/Vector2.js";
import { Player } from "./game/scripts/player/Player.js";
import { Camera } from "./game/scripts/camera/Camera.js";
import { Dungeon } from "./game/scripts/dungeon/Dungeon.js";
import UICanvas from "./engine/ui/UICanvas.js";
import { Hearts } from "./game/scripts/gui/Hearts.js";
import { Minimap } from "./game/scripts/gui/Minimap.js";
import { WeaponSlot } from "./game/scripts/gui/WeaponSlot.js";
import { ItemSelection } from "./game/scripts/gui/ItemSelection.js";

const canvas = document.getElementById("game");

async function main() {
    const ui = new GameObject("UI", UICanvas);
    ui.tag = "ui";

    GameObject.instantiate(Hearts);
    GameObject.instantiate(Minimap);
    GameObject.instantiate(WeaponSlot);
    GameObject.instantiate(ItemSelection);
    GameObject.instantiate(Camera);
    GameObject.instantiate(Player);
    GameObject.instantiate(Dungeon);

    Projectile.spawn(EnemyProjectile, new Vector2(305, 285), {
        damage: 1,
        direction: Vector2.left(),
    });

    // Enemies and items come from each chamber's spawn layer (dungeon/chambers/Chambers.js).

    const world = World.getInstance();
    await world.init(canvas);
    world.run();
}

main();
