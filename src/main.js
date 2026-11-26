import World from "./engine/core/World.js";
import GameObject from "./engine/core/GameObject.js";
import Collider from "./engine/physics/Collider.js";
import SolidRenderer from "./engine/rendering/SolidRenderer.js";
import Trap from "./game/components/Trap.js";
import { createProjectile } from "./game/components/Projectile.js";
import Vector2 from "./engine/math/Vector2.js";
import { Player } from "./game/scripts/player/Player.js";
import { Camera } from "./game/scripts/camera/Camera.js";
import { Dungeon } from "./game/scripts/dungeon/Dungeon.js";
import UICanvas from "./engine/ui/UICanvas.js";
import { Hearts } from "./game/scripts/gui/Hearts.js";
import { Minimap } from "./game/scripts/gui/Minimap.js";
import { ItemSelection } from "./game/scripts/gui/ItemSelection.js";
import Interactable from "./game/scripts/items/Interactable.js";
import Enemy from "./game/scripts/enemy/Enemy.js";
import EnemyAI from "./game/scripts/enemy/EnemyAI.js";

const canvas = document.getElementById("game");

function createTestItem(name, x, y, color) {
    const item = new GameObject(name, SolidRenderer, Interactable);
    item.transform.position.set(x, y);
    item.transform.scale.set(20, 20);
    item.getComponent(SolidRenderer).color = color;

    const interactable = item.getComponent(Interactable);
    interactable.displayName = name;
    interactable.onInteract = (it) => {
        console.log(`Interagiu com ${it.label}`);
        it.gameObject.destroy();
    };
}

async function main() {
    const ui = new GameObject("UI", UICanvas);
    ui.tag = "ui";

    GameObject.instantiate(Hearts);
    GameObject.instantiate(Minimap);
    GameObject.instantiate(ItemSelection);
    GameObject.instantiate(Camera);
    GameObject.instantiate(Player);
    GameObject.instantiate(Dungeon);

    const trap = new GameObject("Trap", SolidRenderer, Trap, Collider);
    trap.transform.position.set(380, 220);
    trap.getComponent(Collider).isTrigger = true;

    createProjectile(new Vector2(300, 280), "enemy", 1, new Vector2(-1, 0));

    createTestItem("Baú", 200, 120, "#8B5A2B");
    createTestItem("Poção de vida", 235, 135, "#D0342C");
    createTestItem("Mercador", 330, 110, "#3C8D5A");

    const enemy = new GameObject("Enemy", SolidRenderer, Collider, Enemy);
    enemy.transform.position.set(70, 70);
    enemy.getComponent(EnemyAI).debug = true;

    const world = World.getInstance();
    await world.init(canvas);
    world.run();
}

main();
