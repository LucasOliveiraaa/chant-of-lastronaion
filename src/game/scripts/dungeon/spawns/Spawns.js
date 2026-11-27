import GameObject from "../../../../engine/core/GameObject.js";
import Prefab from "../../../../engine/core/Prefab.js";
import Vector2 from "../../../../engine/math/Vector2.js";
import Collider from "../../../../engine/physics/Collider.js";
import SolidRenderer from "../../../../engine/rendering/SolidRenderer.js";
import SpriteRenderer from "../../../../engine/rendering/SpriteRenderer.js";
import Sprites from "../../../../engine/assets/Sprites.js";
import Enemy from "../../enemy/Enemy.js";
import EnemyState from "../../enemy/EnemyState.js";
import Interactable from "../../items/Interactable.js";
import { HeartPrefab } from "../../items/Heart.js";

// The spawn registry: everything a chamber's spawn layer can place, the counterpart of the
// tile registry (tiles/Tiles.js) for the second layer.
//
// Chamber templates name spawns by `name` (e.g. { type: "enemy", x: 8, y: 5 }), so names
// must stay stable once chambers use them. A template can also give a Prefab as `type`,
// without registering it here. When a chamber is entered, ChamberManager calls `create`
// once per spawn point that wasn't used up in an earlier visit (an enemy killed, an item
// picked up) and parents the result to the chamber, so leaving the chamber removes it.

/** @typedef {number} SpawnId */
/** @typedef {"enemy" | "item"} SpawnCategory */

/**
 * @typedef {object} SpawnDefinition
 * @property {SpawnId | null} id null for a Prefab given straight in a chamber.
 * @property {string} name What chambers write as a spawn's `type`. Lowercase.
 * @property {SpawnCategory} category
 * @property {(center: Vector2) => GameObject} create Builds the object centered on `center`
 *     (world space). Destroying it marks the spawn as used up.
 */

/**
 * What `addSpawn` takes: either a `create` function or a `prefab` to instantiate. The
 * category of a prefab is worked out (enemy if it has an EnemyState) unless given.
 * @typedef {{ name: string, category?: SpawnCategory } &
 *     ({ create: SpawnDefinition["create"] } | { prefab: Prefab })} SpawnOptions
 */

export const SpawnCategory = Object.freeze({ ENEMY: "enemy", ITEM: "item" });

/** @type {Record<SpawnId, SpawnDefinition>} */
export const Spawn = {};

/** @type {Map<string, SpawnId>} */
const byName = new Map();
let nextId = 0;

/**
 * @param {SpawnOptions} options
 * @returns {SpawnId}
 */
function addSpawn(options) {
    const key = normalizeName(options.name);
    if (byName.has(key)) throw new Error(`There already is a spawn named "${options.name}".`);

    const id = nextId++;
    Spawn[id] = { ...definitionFrom(options), id };
    byName.set(key, id);
    return id;
}

/** @param {SpawnOptions} options @returns {Omit<SpawnDefinition, "id">} */
function definitionFrom({ name, category, create, prefab }) {
    if (prefab) {
        if (!(prefab instanceof Prefab)) throw new Error(`Spawn "${name}": prefab must be a Prefab.`);
        return { name, category: category ?? categoryOf(prefab), create: center => instantiateCentered(prefab, center) };
    }
    if (typeof create !== "function") throw new Error(`Spawn "${name}" needs a create function or a prefab.`);
    return { name, category: category ?? SpawnCategory.ITEM, create };
}

function categoryOf(prefab) {
    return prefab.getComponent(EnemyState) ? SpawnCategory.ENEMY : SpawnCategory.ITEM;
}

// Spawns for Prefabs given straight in chambers, one per Prefab.
/** @type {WeakMap<Prefab, SpawnDefinition>} */
const prefabSpawns = new WeakMap();

function normalizeName(name) {
    return String(name).trim().toLowerCase();
}

/**
 * The spawn a chamber's `type` stands for: a registered name ("enemy", case doesn't
 * matter), a SpawnId, or any Prefab. null if there's no such spawn.
 * @param {string | SpawnId | Prefab} type
 * @returns {SpawnDefinition | null}
 */
export function findSpawn(type) {
    if (type instanceof Prefab) {
        if (!prefabSpawns.has(type)) prefabSpawns.set(type, { ...definitionFrom({ name: type.name, prefab: type }), id: null });
        return prefabSpawns.get(type);
    }
    if (typeof type === "number") return Spawn[type] ?? null;
    if (typeof type !== "string") return null;
    return Spawn[byName.get(normalizeName(type))] ?? null;
}

/** Every spawn name, for error messages and docs. */
export function spawnNames() {
    return Object.values(Spawn).map(s => s.name);
}

// ---- Helpers ------------------------------------------------------------------------

// Instantiates the prefab so the middle of its rect lands on `center`.
function instantiateCentered(prefab, center) {
    const { scale } = prefab.transform;
    return GameObject.instantiate(prefab, new Vector2(center.x - scale.x / 2, center.y - scale.y / 2), 0);
}

function placeCentered(gameObject, center, width, height = width) {
    gameObject.transform.scale.set(width, height);
    gameObject.transform.position.set(center.x - width / 2, center.y - height / 2);
    return gameObject;
}

// Same sheet and slicing as the HUD (gui/Hearts.js), so both share the sprite ids.
let heartSprites = null;
function loadHeartSprites() {
    heartSprites ??= (async () => {
        const sprites = Sprites.getInstance();
        const sheet = await sprites.loadSpriteSheet("assets/sprites/hearts.png");
        return sprites.sliceSpriteSheet(sheet, 4, 7);
    })();
    return heartSprites;
}

const HEART_SIZE = 24;
const HEART_SPRITE = { [HeartPrefab.FULL]: 0, [HeartPrefab.HALF]: 1 };
const heartPrefabs = new Map();

function spawnHeart(type, center) {
    if (!heartPrefabs.has(type)) heartPrefabs.set(type, new HeartPrefab(type));

    const position = new Vector2(center.x - HEART_SIZE / 2, center.y - HEART_SIZE / 2);
    const heart = GameObject.instantiate(heartPrefabs.get(type), position, 0);
    heart.transform.scale.set(HEART_SIZE, HEART_SIZE);

    const renderer = heart.getComponent(SpriteRenderer);
    renderer.imageSmoothing = false;
    loadHeartSprites().then(sprites => {
        if (!heart.isDestroyed) renderer.setSprite(sprites[HEART_SPRITE[type]]);
    });
    return heart;
}

function makeEnemyPrefab() {
    const prefab = new Prefab("Enemy", SolidRenderer, Collider, Enemy);
    prefab.transform.scale.set(50, 50);
    return prefab;
}

// ---- Registry -----------------------------------------------------------------------

export const SpawnIds = Object.freeze({
    ENEMY: addSpawn({ name: "enemy", prefab: makeEnemyPrefab() }),

    HEART_HALF: addSpawn({
        name: "half heart",
        category: SpawnCategory.ITEM,
        create: center => spawnHeart(HeartPrefab.HALF, center),
    }),

    HEART: addSpawn({
        name: "heart",
        category: SpawnCategory.ITEM,
        create: center => spawnHeart(HeartPrefab.FULL, center),
    }),

    CHEST: addSpawn({
        name: "chest",
        category: SpawnCategory.ITEM,
        create: center => {
            const chest = placeCentered(new GameObject("Chest", SolidRenderer, Interactable), center, 20);
            chest.getComponent(SolidRenderer).color = "#8B5A2B";

            const interactable = chest.getComponent(Interactable);
            interactable.displayName = "Baú";
            interactable.onInteract = (it) => {
                console.log(`Interagiu com ${it.label}`);
                it.gameObject.destroy();
            };
            return chest;
        },
    }),
});
