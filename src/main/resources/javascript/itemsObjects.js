import gameState from "./gameState.js";

//mock factory js, temporarily hard coded for testing
const makeCard = function(type) {
    let img = new Image;
    let backImg = new Image;

    //properties
    let id = gameState.getID();
    let touchStyle = gameState.idToRGB(id);
    //TODO: temporary measure for demonstration
    let coord = {x: Math.random(1) * 2000, y: Math.random(1) * 2000};
    let width;
    let height;

    //states
    //only draws 'touchStyle' if reads true, else disabled. examples: card is in a deck, hand, midDrag
    let enabled = true;
    let flipped = false; //determines if backImg,img is rendered
    let rotation = false; //set to radians
    let selected = false;

    //Set image
    let query;
    switch(type) {
        case "Leader":
        case "Monster":
            query = "338/583";
            width = 338;
            height = 583;
            break;
        case "playMat":
            query = "2475/975";
            width = 2475;
            height = 975;
            break;
        case "gameMat":
            query = "2475/1500";
            width = 2475;
            height = 1500;
            break;
        case "Card":
            query = "308/432";
            width = 308;
            height = 432;
            break;
        default:
            return null; //TODO handle error somehow
    }
    img.src = `https://picsum.photos/${query}`;
    backImg.src = `https://picsum.photos/${query}`;

    function getX() {
        return coord.x;
    }
    function getY() {
        return coord.y;
    }

    return {type, id, img, touchStyle, enabled, coord, flipped, rotation, getX, getY, width, height, selected};
}

//hardcoded for testing item summon
export default function main() {
    let array = [
        makeCard("playMat"),
        makeCard("gameMat"),
        makeCard("Leader"),
        makeCard("Monster"),
        makeCard("Card")
    ];

    array.forEach((card)=>{
        console.log(card);
        gameState.push(card);
    });
}
