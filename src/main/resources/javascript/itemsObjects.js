//TODO - ship all item creation to 'assets', e.g. gameState.getID() and .idToRGB()
import gameState from "./gameState.js";
import assets from "./assets.js";

//TODO: TEMPORARY
function random() {
    let num = Math.random(1) * 2000;
    return num;
}

//TODO extra note - the 'types' rely on "deck" restrictions
//...or, i allow it, and keep 'types' as means of separation when summoning in objects :shrug:
//mock factory js, temporarily hard coded for testing
const makeCard = function(type) {
    let index = 0; //0 is frontImage, 1 is 'back' image, else cycle
    let { width, height, images } = assets.getImagesAndDimensions(type);

    //properties
    let id = gameState.getID();
    let touchStyle = gameState.idToRGB(id);
    //TODO: temporary measure for demonstration
    let coord = {x: random(), y: random()};

    let dragStart = {
        x: 0,
        y: 0
    };

    //states
    //'enabled' only draws 'touchStyle' if reads true, else disabled. examples: card is in a deck, hand, midDrag
    let enabled = true;
    //TODO replace - 0*,90* binary; play around with image rotation in canvas (try rotate within center of card)
    let flipped = false; //determines if backImg,img is rendered
    let rotation = false; //set to radians, unused
    let selected = false; //likely placeholder for "lock";
    //client will check if in selected[], else call server for 'permission'

    function getX() {
        return coord.x;
    }
    function getY() {
        return coord.y;
    }

    return {type, id, index, images, touchStyle, enabled, coord, flipped, rotation,
        getX, getY, width, height, selected, dragStart};
}

//hardcoded for testing item summon
export default function main() {

    let array = [
        makeCard("playMat"),
        makeCard("gameMat"),
        makeCard("Leader"),
        makeCard("Leader"),
        makeCard("Leader"),
        makeCard("Monster"),
        makeCard("Monster"),
        makeCard("Monster"),
        makeCard("Card"),
        makeCard("Card"),
        makeCard("Card"),
        makeCard("Card"),
        makeCard("Card"),
        makeCard("Card"),
        makeCard("Card"),
        makeCard("Card")
    ];

    array.forEach((card)=>{
        gameState.push(card);
        console.log(card);
    });

}

