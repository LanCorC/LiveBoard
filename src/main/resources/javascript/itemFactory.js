//TODO - ship all item creation to 'assets', e.g. gameState.getID() and .idToRGB()
import gameState from "./gameState.js";
import {assets, getMiscImages, prepareImages} from "./assets.js";

//TODO: TEMPORARY - replaced with pre-determined coordinates e.g. playmats side by side,
//starting decks inside the mats, etc
function random() {
    let num = Math.random(1) * 2000;
    return num;
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
    dice.index = Math.floor(Math.random() *dice.images.length);
    console.log(`rolled: ${dice.index}`);
}

//shuffle deck [in-place]
//accept list of 'cards'
function shuffleDeck(units) {
    //pick number from 0 -> m, where m<=n and shrinking each iter
    for(let i = units.length -1; i >= 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        let temp = units[i];
        units[i] = units[j];
        units[j] = temp;
    }
}

//reverse deck order [in-place]
function reverseDeck() {
    let deck = this;
    for(let i = 0, j = deck.images.length - 1; i < j; i++, j--) {
        let temp = deck.images[i];
        deck.images[i] = deck.images[j];
        deck.images[j] = temp;
    }
}
//flip deck (flip all cards and reverse order) TODO-test
//effect of "turning an entire pile over" physically
function flipDeck() {
    let deck = this;
    deck.images.forEach((card) => card.cycleImage());
    reverseDeck.call(deck);
}

//TODO- see if this is all that takes
function rearrangeDeck(newDeck) {
    let deck = this;
    deck.images = newDeck;
}

//Empty images - misc generic object: dice, playmats;
//Specific images - specific object: card, leader, monster
//Specific images cont.d - 'images'[] full of card objects for creating decks
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
//        coord = {x: random(), y: random()};
        coord = {x: 1500, y: 1500};

    }

    //TODO - same for merging cards/decks
    //TODO - this causes snap-backing?
    if(type=="deck") {
        images.forEach((image) => {
//            image.coord.x = coord.x;
//            image.coord.y = coord.y;
            image.coord.x = 100;
            image.coord.y = 100;
            image.disabled = false;
        });
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

    //true on 'deck'
    let isDeck = false;

    //TODO - implement 'disabled',
    //to render touch/visual or not in canvas - false when in hand or deck
    let disabled = false;
    //dual purpose: mock-ReentrantLock using userId AND visual marker
    let selected = false;

    let getImage = function() {
        return images[item.index];
    }

    switch(type) {
        case "Card":
        case "Leader":
        case "Monster":
            return {type, id, touchStyle, index, images, height, width, coord,
                dragStart, getX, getY, getImage, disabled, cycleImage: cycleCardImage,
                selected, isDeck};
        case "playMat":
        case "gameMat":
            //TODO - implement 'anchored', equivalent of non-draggable
            //if itemFocus is 'anchored: true', drag board
            //else not itemFocus, does not change coord at any stag
            return {type, id, touchStyle, index, images, height, width, coord,
                dragStart, getX, getY, getImage, disabled,cycleImage: cycleCardImage,
                anchored: false, selected, isDeck};
        case "dice":
            return {type, id, touchStyle, index, images, height, width, coord,
                dragStart, getX, getY, getImage, disabled, cycleImage: cycleDiceImage,
                selected, isDeck};
        case "deck":
            return {type: images[0].type, id, touchStyle, index, images, height, width, coord,
                dragStart, getX, getY, disabled, selected,
                browsing: false, //TODO set to userID when being browsed, false when finish
                //if(browsing), overrides 'selected' visual cue, instead renders an eye
                isDeck: true,
                getImage: function() {
                    let item = images[0];
                    return item.images[item.index];
                },
                shuffle: () => shuffleDeck(images),
                flipDeck: () => flipDeck(),
                rearrange: (newArray) => reverseDeck(newArray),
                //              //TODO: likely send 'meta' functions to gameState
                //example: adding, removing, 'cancelling' a deck
                //                takeTop: () => {return images.splice(0, 1)}, //returns array containing removed
                //                takeRandom: () => console.log(),
                cycleImage: cycleDeckImage,
                specialHover: false}; //for indicating 'validDeckCreate' on hover
        default:
            console.log(`type not found for this card! ${type}`);
    }
}


//TODO
const loadMisc = function() {
    //Hard-code x,y positioning here

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
    let preItems = prepareImages(expansions);

    //TODO-TODO: send all these into their respective decks
    return createCards(preItems);
}

//accepts 'preImages' (array basis for the cards) of all three types: cards, leaders, monsters
function createCards(preImages) {
    let items = {
        cards: [],
        leaders: [],
        monsters: []
    }

    //TODO- clean up redundancy to allow recycling,e.g. Card cards
    //pass to item maker
    for(const [key, value] of Object.entries(preImages)) {
        let arrayName;
        let type;
//        let coord = null; //will set where the cards, as piled, will show
        switch(key) {
            case "preCards":
                arrayName = "cards";
                type = "Card";
//                coord = {x: 0, y: 0};
                break;
            case "preLeaders":
                arrayName = "leaders";
                type = "Leader";
//                coord = {x: 50, y: 50};
                break;
            case "preMonsters":
                arrayName = "monsters";
                type = "Monster";
//                coord = {x: 100, y: 100};
                break;
            default:
                console.log(`${key} not found!`);
        }

        value.forEach((preItem) => {
//            let coords = coord;
            items[arrayName].push(genericFactory(type, preItem));
        })

        console.log(`${arrayName} has ${items[arrayName].length}
            cards in deck ${type}`);
    }

    console.log(items);
    return items;
}

//hardcoded for testing item summon
function main() {

}

export {main as default, loadCards, loadMisc};
