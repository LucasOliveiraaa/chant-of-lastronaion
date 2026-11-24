export default class Spawner extends Component {
    spawnInterval = 0;
    _spawnTimer = 0;

    prefab = null;

    update() {
        if (this._spawnTimer > 0) {
            this._spawnTimer -= Time.deltaTime;
        } else {
            this._spawnTimer = this.spawnInterval;
            const go = GameObject.instantiate(this.prefab);
            go.transform.position.set(this.gameObject.transform.position);
        }
    }
}