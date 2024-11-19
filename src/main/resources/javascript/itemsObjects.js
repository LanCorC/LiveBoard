import gameState from "./gameState.js";

const makeDrawFunction = function(type) {
    //hard coded methods here
    //cardDraw (flip, and or tap)
    function cardDraw(visual, touch) {

    }
    //deck (from bottom of list)

    //gameMat, playMat cycling

    //selection here
    let draw;
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

    return { draw };
}

function random() {
    let num = Math.random(1) * 2000;
    return num;
}

//TODO extra note - the 'types' rely on "deck" restrictions
//...or, i allow it, and keep 'types' as means of separation when summoning in objects :shrug:
//mock factory js, temporarily hard coded for testing
const makeCard = function(type) {
    let img = new Image;
    let backImg = new Image;

    //properties
    let id = gameState.getID();
    let touchStyle = gameState.idToRGB(id);
    //TODO: temporary measure for demonstration
    let coord = {x: random(), y: random()};
    let width;
    let height;

    let dragStart = {
        x: 0,
        y: 0
    };

    //states
    //'enabled' only draws 'touchStyle' if reads true, else disabled. examples: card is in a deck, hand, midDrag
    let enabled = true;
    let flipped = false; //determines if backImg,img is rendered
    let rotation = false; //set to radians
    let selected = false; //likely placeholder for "lock";
    //client will check if in selected[], else call server for 'permission'

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
    //"id" query added for sake of loose ensuranec that front and back image is different
    backImg.src = `https://picsum.photos/id/${id}/${query}`;

    function getX() {
        return coord.x;
    }
    function getY() {
        return coord.y;
    }

    return {type, id, img, backImg, touchStyle, enabled, coord, flipped, rotation,
        getX, getY, width, height, selected, dragStart};
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

