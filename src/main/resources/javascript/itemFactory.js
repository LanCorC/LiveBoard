import gameState from "./gameState.js";
import {getMiscImages, prepareImages} from "./assets.js";

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

//set all in a deck to back image
function hideAllInDeck(cards) {
    cards.forEach(card => card.index = 0);
}

//Empty images - misc generic object: dice, playmats;
//Specific images - specific object: card, leader, monster
//Specific images cont.d - 'images'[] full of card objects for creating decks
const genericFactory = function(type, images, coord) {
    let index = 0;
    if(!images) { //empty, call assets; reserved for misc: mats, dice
        images = getMiscImages(type);
    }

    let { width, height } = images.at(0);
    let id = gameState.getID();
    let touchStyle = gameState.idToRGB(id);

    //TODO temporary - to be hardcoded
    if(!coord) {
        coord = {x: 0, y: 0};
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
    let disabled = false;
    //dual purpose: mock-ReentrantLock using userId AND visual marker
    let selected = false;
    let flipMe = 0; //purpose: range(0,3), 1=90*, 2=180*, 3=270*, 0=(0*/360*) rotations

    let getImage = function() {
        return images[1];
    }

    switch(type) {
        case "Card":
        case "Leader":
        case "Monster":
            return {type, id, touchStyle, index, images, height, width, coord,
                dragStart, getX, getY, getImage, disabled, cycleImage: cycleCardImage,
                selected, isDeck, flipMe};
        case "playMat":
        case "gameMat":
            return {type, id, touchStyle, index, images, height, width, coord,
                dragStart, getX, getY, getImage, disabled,cycleImage: cycleCardImage,
                anchored: true, selected, isDeck, flipMe};
        case "dice":
            return {type, id, touchStyle, index, images, height, width, coord,
                dragStart, getX, getY, getImage, disabled, cycleImage: cycleDiceImage,
                selected, isDeck, flipMe};
        case "deck":
            return {type: images[0].type, id, touchStyle, index, images, height, width, coord,
                dragStart, getX, getY, disabled, selected,
                browsing: false,
                isDeck: true,
                getImage: function() {
                    //TODO- discontinue? see if required outside of canvas
                    let item = images[0];
                    return item.images[item.index];
                },
                shuffle: () => shuffleDeck(images),
                flipDeck: () => flipDeck(),
                rearrange: (newArray) => reverseDeck(newArray),
                //              //TODO: likely send 'meta' functions to gameState
                //example: adding, removing, 'cancelling' a deck
                //                takeRandom: () => console.log(),
                cycleImage: cycleDeckImage,
                faceDownAll: () => hideAllInDeck(images),
                specialHover: false, //for indicating 'validDeckCreate' on hover
                flipMe};
        default:
            console.log(`type not found for this card! ${type}`);
    }
}


//TODO
const loadMisc = function() {
    //Hard-code x,y positioning here

    const misc = [];
    const buffer = 100;
    const gameMatHeight = 975;
    const matWidth = 2475;
    const playMatHeight = 1500;
    const mats = [
        genericFactory("gameMat", false, {x: 0, y: 0}),
        genericFactory("playMat", false, {x: -(matWidth + buffer), y: -(playMatHeight + buffer)}),
        genericFactory("playMat", false, {x: 0, y: -(playMatHeight + buffer)}),
        genericFactory("playMat", false, {x: (matWidth + buffer), y: -(playMatHeight + buffer)}),
        genericFactory("playMat", false, {x: -(matWidth + buffer), y: (gameMatHeight + buffer)}),
        genericFactory("playMat", false, {x: 0, y: (gameMatHeight + buffer)}),
        genericFactory("playMat", false, {x: (matWidth + buffer), y: (gameMatHeight + buffer)})
    ];

    //TODO load dice
    let dice = [];

    mats.forEach(mat => misc.push(mat));

    //Hard-coded, feel
    let array = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; //includes 5 extra leaders
//    let array = [0, 1, 2, 3, 4, 5]; //original 6 leaders
    mats.forEach(mat => {
        let index = array.splice(Math.ceil(Math.random() * (array.length - 1)), 1)[0] || 1;
        console.log(index);
        if(mat.type == "playMat") mat.index = index;
    })

    dice.forEach(die => misc.push(die));

    return misc;
}

const loadCards = function(expansions) {
    let preItems = prepareImages(expansions);

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
        let coord = null; //will set where the cards, as piled, will show
        switch(key) {
            case "preCards":
                arrayName = "cards";
                type = "Card";
                coord = {x: 0, y: 0};
                break;
            case "preLeaders":
                arrayName = "leaders";
                type = "Leader";
                coord = {x: 100, y: 100};
                break;
            case "preMonsters":
                arrayName = "monsters";
                type = "Monster";
                coord = {x: 200, y: 200};
                break;
            default:
                console.log(`${key} not found!`);
        }

        value.forEach((preItem) => {
            let {x, y} = coord;
//            items[arrayName].push(genericFactory(type, preItem));
            items[arrayName].push(genericFactory(type, preItem, {x, y}));

        })

        console.log(`${arrayName} has ${items[arrayName].length}
            cards in deck ${type}`);
    }

    console.log(items);
    return items;
}

//Purpose: merge cards, base into a coherent deck; return the deck object
//assumes cards, base share the same .type
//if 'base' is defined, i.e. 'itemHover', base is always a single card.
//and 'base' 's coords will be used
//Note: will not use for 'decks'; will use decks functionality
const deckify = function(cards, base) {

    if(!Array.isArray(cards)) {
        cards = [cards];
    }

    let { type } = cards[0];

    //place at 0,0 if default, else let Card,Leader,Monster be pre-set
    let coord;
    if(base == undefined) {
        switch(type) {
            case "Card":
                coord = {x: 2037, y: 37};
                break;
            case "Leader":
                coord = {x: -468, y: 196};
                break;
            case "Monster":
                coord = {x: 130, y: 196};
                break;
            default: coord = { x: 0, y: 0 };
        }
    } else {
        let {x, y} = base.coord;
        coord = {x, y};

        //add base to 'bottom of pile'
        cards.push(base);
    }

    //required, for deck/hand interactions
    let deck = genericFactory("deck", cards, coord);
    deck.images.forEach(card => {
        card.deck = deck;
        card.coord = deck.coord; //decouple at dragStart
        card.disabled = true;
    });

    //only happens when initiating the board state; also the only time decks facedown
    if(base == undefined) deck.faceDownAll();

    return deck;
}

//hardcoded for testing item summon
function main() {

}

export {main as default, loadCards, loadMisc, deckify};
