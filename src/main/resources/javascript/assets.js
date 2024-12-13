// Loads all assets, and referred to when rendering tokens, symbols, creating new decks/cards
// Uses a call from server to populate deck specifics and groupings,
// example: card21.png has 2 copies in deckCards of expansion BaseDeck

//store here: sizes of images too

const sizes = {
    small: { //card
        width: 308,
        height: 432
    },
    medium: { //monster, leader
        width: 338,
        height: 583
    },
    large: { //gamemat
        width: 2475,
        height: 975
    },
    large2: { //playmat
        width: 2475,
        height: 1500
    }
};

//Purpose: to return object dimensions and images
const assets = (function() {
    const tapIcon = new Image();
    tapIcon.src = `../Images/Tokens/hand-tap-svgrepo-com.svg`;
    const deckIcon = new Image();
    deckIcon.src = `../Images/Tokens/down-line-svgrepo-com.svg`;

//    const baseUrl = `https://picsum.photos/`;
//
//    //public, for
//    let i = 0; //testing variety
//    let seed = `seed/`;
//    function getImagesAndDimensions(type) {
//        let image = new Image();
//        let images = [];
//        let height, width;
//        switch(type) {
//            case "Leader":
//                ({height, width} = sizes.medium);
//                image.src = `${baseUrl}${width}/${height}`;
//                images.push(miscRef.get("back")["backLeader"]);
//                images.push(image);
//                break;
//            case "Monster":
//                ({height, width} = sizes.medium);
//                image.src = `${baseUrl}${seed}${i++}/${width}/${height}`;
//                images.push(miscRef.get("back")["backMonster"]);
//                images.push(image);
//                break;
//            case "Card":
//                ({height, width} = sizes.small);
//                image.src = `${baseUrl}${seed}${i++}/${width}/${height}`;
//                images.push(miscRef.get("back")["backCard"]);
//                images.push(image);
//                break;
//            case "playMat":
//                ({height, width} = sizes.large2);
//                miscRef.get("playMat").forEach(x=>images.push(x));
//                break;
//            case "gameMat":
//                ({height, width} = sizes.large);
//                miscRef.get("gameMat").forEach(x=>images.push(x));
//                break;
//            default:
//                console.log("error in the assets department!");
//                return null; //TODO handle error somehow
//        }
//        return { images, height, width };
//    };

    return { tapIcon, deckIcon };
})();

function getMiscImages(type) {
    return miscRef.get(type);
}

//todo ?? see if i trash this
function getRefImages(expansion) {

}

//is a hashmap better?
let refExpansionCards = {
    "Base Deck": {
        cards: [],
        leaders: [],
        monsters: []
    },
    "Berserkers and Necromancers Expansion": {
        cards: [],
        leaders: [],
        monsters: []
    },
    "Dragon Sorcerer Expansion": {
        cards: [],
        leaders: [],
        monsters: []
    },
    "Exclusive": {
        cards: [],
        leaders: [],
        monsters: []
    },
    "Monster Expansion": {
        cards: [],
        leaders: [],
        monsters: []
    },
    "Warrior and Druid Expansion": {
        cards: [],
        leaders: [],
        monsters: []
    }
}

//store in hashmap - key is the image file directory, value is prefix to use on the images
const expansionProperties = new Map();

//Placed in method to encapsulate function:
function populateProperties() {
    //Include the expansion name (key), and file prefix and duplicates (value)
    expansionProperties.set("Base Deck",
        { prefix: "HtS-PnP-Base-",
            duplicates: new Map()
        });
    expansionProperties.set("Warrior and Druid Expansion",
        { prefix: "HtS-WarDruid-",
            duplicates: new Map()
        });
    expansionProperties.set("Monster Expansion",
        { prefix: "HtS-PnP-Mon-",
            duplicates: new Map()
        });
    expansionProperties.set("Berserkers and Necromancers Expansion",
        { prefix: "HtS-BersNecr-",
            duplicates: new Map()
        });
    expansionProperties.set("Dragon Sorcerer Expansion",
        { prefix: "HtS-PnP-Drag-",
            duplicates: new Map()
        });
    expansionProperties.set("Exclusive",
        { prefix: "HtS-ConCard-",
            duplicates: new Map()
        });

    //Expansions without duplicates: WarDruids, Monsters, Exclusive, Dragon
    //Expansions with duplicates: Base Deck, BersNecr
    //key: number 'identifier', value: amount of cards in deck; default to 1 if not found
    expansionProperties.get("Base Deck").duplicates
        .set("002", 2) //Curse of the Snake's Eyes (item)
        .set("010", 2) //Really Big Ring (item)
        .set("011", 2) //Particularly Rusty Coin (item)
        .set("013", 2) //Enchanted Spell (magic)
        .set("015", 2) //Entangling Trap (magic)
        .set("016", 2) //Winds of Change (magic)
        .set("017", 2) //Critical Boost (magic)
        .set("018", 2) //Destructive Spell (magic)
        .set("021", 9) //+2/-2 (modifier)
        .set("022", 4) //-4 (modifier)
        .set("023", 4) //+4 (modifier)
        .set("024", 4) //+1/-3 (modifier)
        .set("025", 4) //+3/-1 (modifier)
        .set("026", 14) //CHALLENGE (challenge)
    ;
    expansionProperties.get("Berserkers and Necromancers Expansion").duplicates
        .set("021", 2) //Lightning Labrys (magic)
        .set("022", 2) //Mass Sacrifice (magic)
    ;
}
populateProperties();
//console.log(expansionProperties);

//load miscAssets - rules, cardBack, playmats,
const miscRef = new Map([
    ["rules", {
        "general": null,
        "full": null
    }], //key, value
    ["back", {
        "backCard": null,
        "backLeader": null,
        "backMonster": null
    }],
    ["playMat", []],
    ["gameMat", []],
    ["", ] //TODO: tapicon? tokens?
]);

let padHundred = function(number) {
    if(!number instanceof Number) {
        console.log("Not a number! - 141 assets.js");
    }

    let result = "";
    if(number < 100) {
        result += "0";
    }

    if(number < 10) {
        result += "0";
    }

    return result + number.toString();
}

let baseAddress = "../Images";
//TODO - have this update an html view to update the user
//purpose: load all assets
function directoryTest() {
    let x = "Base Deck";
    let y = "leaders";
//    console.log(refExpansionCards[x]);
    expansionProperties.forEach( (value, key, map) => {
        console.log(`Unpacking ${key}...`);

        loadExpansionCards(1, key, value.prefix);
    });

    console.log(`Unpacking PlayMats...`);
    loadGameMats(1, "PlayMats");

    console.log("Expect a few 'GET 404's (necessary) while we set this up...");

    //load miscellaneous, hardcoded: tokens, image backs
    let image = new Image(sizes.small.width, sizes.small.height);
    image.src = `${baseAddress}/Misc/backCard.jpg`;
    miscRef.get("back")["backCard"] = image;

    image = new Image(sizes.medium.width, sizes.medium.height);
    image.src = `${baseAddress}/Misc/backLeader.jpg`;
    miscRef.get("back")["backLeader"] = image;

    image = new Image(sizes.medium.width, sizes.medium.height);
    image.src = `${baseAddress}/Misc/backMonster.jpg`;
    miscRef.get("back")["backMonster"] = image;
}

function getBack(type) {
    let img;
    switch(type) {
        case "cards":
        case "Card":
            img = miscRef.get("back")["backCard"];
            break;
        case "leaders":
        case "Leader":
            img = miscRef.get("back")["backLeader"];
            break;
        case "monsters":
        case "Monster":
            img = miscRef.get("back")["backMonster"];
            break;
        default:
            console.log(`backImage for type not found! ${type}`);
    }

    return img;
}

let itemCount = {
    "Base Deck": 0,
    "Berserkers and Necromancers Expansion": 0,
    "Dragon Sorcerer Expansion": 0,
    "Exclusive": 0,
    "Monster Expansion": 0,
    "Warrior and Druid Expansion": 0,
    "PlayMats": 0
}
let countsToGo = 6;

function loadExpansionCards(number, folderName, prefix) {
    //'magicId' required as reference for recursion
    const card = new Image();
    card.magicId = number;

    //propagage recursion along 'bucket'
    card.onload = () => {
        loadExpansionCards(card.magicId + 1, folderName, prefix);
        itemCount[folderName]++;

        processRefCard(card, folderName);
    };

    card.onerror = () => {
        //transition to next bucket, X01
        //0XX is 'cards', 1XX is 'leaders', 2XX is 'monsters'
        switch(Math.floor(card.magicId / 100)) {
            case 0:
                loadExpansionCards(101, folderName, prefix);
                break;
            case 1:
                loadExpansionCards(201, folderName, prefix);
                break;
            default:
                if(--countsToGo == 0) {
                    console.log("Finished loading all expansions");
                    console.log(Object.entries(refExpansionCards));
                }
                return;
        }
    };

    card.src = `${baseAddress}/Game/${folderName}/${prefix}${padHundred(number)}.png`;
}

//needs the card; (card's id),
function processRefCard(card, expansion) {
    //TODO - see if image size can be applied 'after' the source. likely; - determined when rendered
        //particularly, notice that the newer expansions have greater image height,width (src)
        //see if they are all drawn 'equally' on canvas
    let size;
    let type;
    switch(Math.floor(card.magicId/100)) {
        case 0: //cards
            size = "small";
            type = "cards";
            break;
        case 1: //leaders
            size = "medium";
            type = "leaders";
            break;
        case 2: //monsters
            size = "medium";
            type = "monsters";
            break;
        default:
            console.log("number too big!");
            break;
    }

    card.width = sizes[size].width;
    card.height = sizes[size].height;

    //retrieve from 'duplicates'
    let quantity = expansionProperties.get(expansion)
        .duplicates.get(padHundred(card.magicId));
    if(!quantity) quantity = 1; //if 'undefined' was returned, set default = 1
    refExpansionCards[expansion][type].push(
        { img: card, count: quantity }
    );
}

//some duplicate code, but modularized for clarity
function loadGameMats(number, folderName) {
    //'magicId' required as reference for recursion
    const card = new Image();
    card.magicId = number;

    //propagate recursion along 'bucket'
    card.onload = () => {
        loadGameMats(card.magicId + 1, folderName);
        itemCount[folderName]++; //"PlayMats" folderName
        processPlayMat(card);
    };

    card.onerror = () => {
        //transition to next bucket, X01
        //0XX is gameMat, 1XX is playmat
        if(card.magicId < 100) {
            loadGameMats(101, folderName);
            return;
        }

        //terminate

        //TBD if needed- this already sorts itself;
        miscRef.get("playMat").sort();
        miscRef.get("gameMat").sort();
    };

    card.src = `${baseAddress}/${folderName}/${padHundred(number)}.png`;
}

//use card's Magic ID to distinguish from gameMat, playMat
function processPlayMat(card) {
    let size;
    let type;
    switch(Math.floor(card.magicId/100)) {
        case 0: //gameMat
            size = "large";
            type = "gameMat";
            break;
        case 1: //playMat
            size = "large2";
            type = "playMat";
            break;
        default:
            console.log("number too big!");
            break;
    }

    card.width = sizes[size].width;
    card.height = sizes[size].height;

    miscRef.get(type).push(card);
}

//takes expansions, spits out 'preCards/Leaders/Monsters', i.e. basis of a card
//*iterating through expansions here, thus also check quantity;
//alternatively, repeat images as per 'quantity' found
function prepareImages(expansions) {
    //prepare lists
    const preItems = {
        preCards: [],
        preLeaders: [],
        preMonsters: []
    }

    //default to all items
    if(!expansions) {
        expansions = Object.keys(refExpansionCards); //returns array
    }

    //iterate through expansions
    //* add a default?
    expansions.forEach((expansion) => { //each expansion

        //*key='type' cards, leaders, monsters
        //*value='items' array of obj { img(HTMLImageElement), count(integer) }
        for (const [type, items] of Object.entries(refExpansionCards[expansion])) {
            //back image for the deck
            let backImg = getBack(type);
            if(!backImg) return;

            let arrayName;
            switch(type) {
                case "cards":
                    arrayName = "preCards";
                    break;
                case "leaders":
                    arrayName = "preLeaders";
                    break;
                case "monsters":
                    arrayName = "preMonsters";
                    break;
                default:
                    console.log(`${type} not found!`);
            }

            items.forEach((card) => {
                //*default all cards, img[0], as 'backImg'-
                //or manipulate 'index' on cardProperty

                for(let i = 0; i < card.count; i++){
                    let images = [];
                    images.push(backImg);
                    images.push(card.img);

                    preItems[arrayName].push(images);
                }
            })

            console.log(`${expansion} has ${preItems[arrayName].length}
            cards in deck ${type}`);
        }
    });

    return preItems;
}

//export default {assets as assets, directoryTest};
export {assets, directoryTest, getMiscImages, prepareImages};
