import Component from "../../engine/core/Component.js";
import SolidRenderer from "../../engine/rendering/SolidRenderer.js";
import PlayerState from "./PlayerState.js";
import GameObject from "../../engine/core/GameObject.js";

export default class Trap extends Component{
    start(){
        this.gameObject.transform.scale.set(40, 40);
        

        this.gameObject.getComponent(SolidRenderer).color = " #D3D3D3";


        this.player = GameObject.findWithTag("player");
    }

    onCollisionStay(other) {
        if (other.tag == "player") {
            other.getComponent(PlayerState).takeDamage(0.5);
        }
    }
}