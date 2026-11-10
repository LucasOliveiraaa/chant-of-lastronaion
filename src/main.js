import SpriteRenderer from "./engine/components/SpriteRenderer.js";
import World from "./engine/world.js"
import Player from "./game/player.js";

const canvas = document.getElementById("game");

const world = new World(canvas);

world.addEntity(new Player());

world.run();