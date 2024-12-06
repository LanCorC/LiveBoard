//TODO - ship all item creation to 'assets', e.g. gameState.getID() and .idToRGB()
import gameState from "./gameState.js";
import {assets, getMiscImages} from "./assets.js";

//TODO: TEMPORARY - replaced with pre-determined coordinates e.g. playmats side by side,
//starting decks inside the mats, etc
function random() {
    let num = Math.random(1) * 2000;
    return num;
}

//TODO extra note - the 'types' rely on "deck" restrictions
//...or, i allow it, and keep 'types' as means of separation when summoning in objects :shrug:
//TODO - make generic enough?
//TODO - example: return a different selection of properties depending on type
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
    //true placeholder for "lock"; apply for: adding to 'selected'
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

function cycleCardImage(mod) {
    let item = this;
    //defaults +1 increment
    if(!mod) {
        item.index++;
        item.index %= item.images.length;
        return;
    }

    //all negative capped to -1
    if(mod <= -1) {
        if(--item.index < 0) item.index = item.images.length-1;
    } else {
        //specific index
        item.index = modifier;
        item.index %= item.images.length;
    }
}

function cycleDeckImage(mod) {
    let deck = this;

    //instead of storing images, stores cards
    deck.images[0].cycleCardImage(mod);
}

//dice roll (random)
function cycleDiceImage() {
    let dice = this;
    dice.index = getRandomInt(dice.images.length);
}

//Empty images - misc generic object: dice, playmats;
//Specific images - specific object: card, leader, monster
const genericFactory = function(type, images, coord) {
    let index = 0;
    if(!images) { //empty, call assets
        images = getMiscImages(type);
    }
    //take properties refImages - tied to assets.js
//    console.log(Object.getPrototypeOf([]));
    let { width, height } = images.at(0);
    let id = gameState.getID();
    let touchStyle = gameState.idToRGB(id);

    //TODO temporary - to be hardcoded
    if(!coord) {
        coord = {x: random(), y: random()};
    }

    function getX() {
        return coord.x;
    }

    function getY() {
        return coord.y;
    }

    let dragStart = {
        x: 0,
        y: 0
    };

    //TODO - implement 'enabled',
    //to render touch/visual or not in canvas - false when in hand or deck
    let enabled = true;
    //dual purpose: mock-ReentrantLock using userId AND visual marker
    let selected = false;

    let getImage = function() {
        return images[item.index];
    }

    //TODO - deck shuffle, flip, reverseOrder, 'rearrange',

    switch(type) {
        case "Card":
        case "Leader":
        case "Monster":
            return {type, id, touchStyle, index, images, height, width, coord,
                dragStart, getX, getY, getImage, cycleImage: cycleCardImage};
        case "playMat":
        case "gameMat":
            //TODO - implement 'anchored', equivalent of non-draggable
            //if itemFocus is 'anchored: true', drag board
            //else not itemFocus, does not change coord at any stag
            return {type, id, touchStyle, index, images, height, width, coord,
                dragStart, getX, getY, getImage, cycleImage: cycleCardImage,
                anchored: false};
        case "dice":
            return {type, id, touchStyle, index, images, height, width, coord,
                dragStart, getX, getY, getImage, cycleImage: cycleDiceImage};
        case "deck":
            return {type, id, touchStyle, index, images, height, width, coord,
                dragStart, getX, getY,
                getImage: function() {
                    let item = images[0];
                    return item.images[item.index];
                },
                cycleImage: cycleDeckImage};
        default:
            console.log(`type not found for this card! ${type}`);
    }
}


//TODO
const loadMisc = function() {
    let misc = [];
    //TODO- load 6 playmats [2 for now?], 1x gamemat
    let mats = [
        genericFactory("gameMat", false, {x: 0, y: 0}),
        genericFactory("playMat", false, {x: 1500, y: 1500}),
        genericFactory("playMat", false, {x: 3000, y: 3000}),
        genericFactory("playMat", false, {x: 4500, y: 4500})
    ];

    //TODO load dice
    let dice = [];

    mats.forEach(mat => misc.push(mat));
    dice.forEach(die => misc.push(die));

    return misc;
}

//TODO - loads all cards into their respective decks
const loadCards = function(expansions) {
    //TODO - function in assets.js that iterates through expansions
    let { preCards, preLeaders, preMonsters } = prepareImages(expansions);

    //TODO - intermediary function that sends preCards to genericFactory
    //TODO-TODO: send all these into their respective decks
    return { cards, leaders, monsters } =
    createCards(preCards, preLeaders, preMonsters);
}

//hardcoded for testing item summon
export default function main() {

    let array = [
//        makeCard("playMat"),
//        makeCard("gameMat"),
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
        makeCard("Card"),
        genericFactory("playMat"),
        genericFactory("gameMat")
    ];

    array.forEach((card)=>{
        gameState.push(card);
    });

}

