# Dungeon

How a dungeon goes from chamber drawings to objects in the scene.

```
chambers/Chambers.js        authored templates (tile-id grid + spawn list)
        │  ChamberLibrary.add()
        ▼
ChamberBlueprint            one per door variant: footprint, doors, tiles Layer, spawns Layer
        │  compiled to one Dung room per cell (ChamberLibrary.rooms)
        ▼
        │  roomsForFloor(floor): chambers allowed on the floor, its own ones first
        ▼
generation/Dung.js          places the rooms on a grid → PlacedRoom per cell, grouped by instance
        │  DungeonManager (on start, and on every door)
        ▼
chambers/ChamberManager     the live chamber the player is in
        ├─ tiles layer  → one TileManager per tile   (tiles/Tiles.js says what each tile is)
        └─ spawns layer → one object per spawn point (spawns/Spawns.js says how to build it)
```

## Folders

| Path | Role |
| --- | --- |
| `Dungeon.js` | Prefab: a `DungeonManager` wired to the `CHAMBERS` catalog. |
| `DungeonManager.js` | Generates each floor with Dung, keeps only the current chamber alive, moves the player through doors, remembers used-up spawns. |
| `Directions.js` | The four sides of a cell, shared by everything above. |
| `generation/Dung.js` | The layout algorithm (modified wave-function collapse). Knows nothing about tiles or spawns. |
| `chambers/Chambers.js` | **The catalog. Add or edit chambers here.** |
| `chambers/ChamberBlueprint.js` | `Footprint` (cells worked out from the drawing) and the chamber representation, plus `DoorSets`. |
| `chambers/ChamberLibrary.js` | Expands templates into blueprints and compiles Dung's room dictionary. |
| `chambers/Layer.js` | The 2D grid both layers use. |
| `chambers/ChamberManager.js` | Builds a blueprint into the scene. |
| `tiles/Tiles.js` | Tile registry: fixed numeric id, sprite, obstacle, door, interaction (stair). |
| `tiles/TileManager.js` | Component on every tile: sprite, collider, door trigger. |
| `spawns/Spawns.js` | Spawn registry: name, category, `create(center)` or `prefab`. |

## Adding a chamber

The full guide for chamber authors is at the top of `chambers/Chambers.js`. In short:

```js
CHAMBERS.add({
    name: "crossfire",
    weight: 0.2,                       // optional, how often it shows up
    tiles: [                           // 0 floor, 1 wall, null void; any size
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        // ...
    ],
    spawns: [                          // optional
        { type: "enemy", x: 4, y: 1 },
    ],
});
```

- **Size and cells.** The number of cells is worked out from the drawing: `ceil(width / 17) x ceil(height / 11)`. A cell only counts if something non-null is drawn in it, so a block of `null` makes an L shape. Partial cells are filled with floor (with a console warning), and the cells must touch side to side.
- **Walls and doors.** Outer walls and doors are stamped for each door variant. Doors only go on edges whose door tile isn't `null`. Don't draw doors (tile `2`).
- **Default doors.** If `doors` is left out, exit chambers get `"dead ends"`, other one-cell chambers get every door combination (`"variants"`), and bigger ones (and the start chamber) get a door on every side (`"all"`). `"two doors"` gives one variant per pair of sides (bosses). Programmers can also pass a function (see `DoorSets`).
- **Spawns.** `type` is a spawn's name from `spawns/Spawns.js` (case doesn't matter) or any Prefab. `x`/`y` may be decimals: `(5, 3)` is the middle of tile (5, 3) and `5.5` sits between columns 5 and 6. The tile under the spawn's middle must be floor.
- **Floors.** `floors: [2, 3]` limits a chamber to those floors (1 to `FLOOR_COUNT` in `Config.js`); without it the chamber can appear on any floor. In Dung, a floor's own chambers get `priority` 1 and generic ones 0. Per kind, the higher priority wins wherever it fits, and generic chambers fill in where none fit. The one exception: when the dungeon is over its target size, a generic chamber that opens fewer doors is still allowed, so the preference never breaks size control. Every floor needs a start and a boss chamber (checked on start).
- **Errors.** Mistakes throw at load time with a plain-language message naming the chamber, and the column and row where relevant.

## Floors, the exit room and stairs

`DungeonManager` starts on floor 1. On every floor but the top one, `DUNGEON_CONFIG.boss.exit` (`"exit"`) makes Dung place an **exit room** right behind the boss:

- The boss is placed with exactly two doors: the way in, and one into an empty cell. Only boss variants that leave room for an exit there are considered, so the boss needs `doors: "two doors"`.
- That cell is filled straight away with a room of kind `"exit"`. It must be a dead end, so its only door faces the boss.
- Exit chambers default to `doors: "dead ends"`. The library rejects one that has more than one door or no stair (tile `3`).

The stair has an `interaction`, so `TileManager` gives it an `Interactable`. Pressing interact calls `DungeonManager.requestNextFloor()`, and on the next `fixedUpdate` the manager generates a brand-new dungeon for the next floor and resets exploration (the minimap). The top floor gets no exit (`DungeonManager.configFor`), so its boss (`"final boss"`, `floors: [FLOOR_COUNT]`) is a plain dead end, and `requestNextFloor()` returns false there.

## Layout shape

These settings live in `DUNGEON_CONFIG` (`Config.js`):

- **`layout.spread`**: penalises crowded placements with weight × `exp(-spread × crowding)`. Crowding counts taken cells around a candidate, new doors whose slot already touches rooms, and new doors that don't lead farther from the start. The result is long branches that open outward instead of a ball of rooms around the start.
- **`layout.loopBias`** < 1: fewer extra connections between rooms.
- **The boss is never boosted before its `distance`.** It used to be grabbed at the first cell within tolerance (distance 3 in about 92% of dungeons), which ended all growth early. Also, the last open way can only be closed as a last resort while the boss is still missing.
- **`size.aim`**: where size control steers the projected size, as a fraction of the target. It sits below 1 because every open door still needs a room.

Measured on floor 1, 300 seeds each:

| | before | now |
| --- | --- | --- |
| rooms | 12.3 | 15.1 (incl. exit) |
| bounding-box fill | 0.66 | 0.58 |
| loops | 1.16 | 0.06 |
| deepest chamber | 3.1 | 5 (boss 4, exit 5) |
| attempts per dungeon | 3.0 | 1.3 |

The start chamber's 6 doors still put about 6 rooms right around it. That is the main remaining source of packing; fewer doors on the start (or `doors: "variants"` with several start chambers) would open things up more.

## Adding a tile or spawn type

- **Tiles:** add an `addTile` entry in `tiles/Tiles.js` with the next free `id`. Never renumber an existing tile, because chambers are drawn with these numbers. Give it an `interaction: { label, onInteract({ dungeon, player, tile }) }` to make it interactable.
- **Spawns:** add an `addSpawn` entry in `spawns/Spawns.js` with a unique `name` and either a `prefab` or a `create(center)` function. That name is what chambers write as `type`. A prefab with an `EnemyState` counts as an enemy.

A spawn's `create(center)` returns a GameObject. When that object is destroyed (enemy killed, item picked up), the spawn point counts as used up and won't spawn again when the player comes back.
