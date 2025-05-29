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

const assets = (function() {
    const tapIcon = new Image();
    tapIcon.src = `./images/Tokens/hand-tap-svgrepo-com.svg`;
    const deckIcon = new Image();
    deckIcon.src = `./images/Tokens/stack-push-svgrepo-com.svg`;
    const moveTo = new Image();
    moveTo.src = `./images/Tokens/send-svgrepo-com.svg`;
    const no = new Image();
    no.src = `./images/Tokens/no-svgrepo-com.svg`;
    const view = new Image();
    view.src = `./images/Tokens/magnifier-glass-svgrepo-com.svg`;
    const backImg = 0;
    const frontImg = 1;

    let buffer = 100;       //padding between each play/gameMat
    let allowance = 100;    //extra whitespace on edges of entire board

    //Calculations based on 0,0 being top corner of gameMat
    const dimensions = {
        leftBorder: -(sizes.large.width + buffer + allowance),
        rightBorder: sizes.large.width * 2 + buffer + allowance,
        topBorder: -(buffer + sizes.large2.height + sizes.large2.width/2 - sizes.large2.height/2 + allowance),
        bottomBorder: sizes.large.height + sizes.large2.height + buffer +
        (sizes.large2.width/2 - sizes.large2.height/2) + allowance,

        //for purposes of being centered on the board
        center: {
            x: sizes.large.width/2,
            y: sizes.large.height/2,
        },

        //calculated value, based on clientWidth, clientHeight and approximation to borders
        minZoomoutTransform: null,
    }


    function adjustMin(windowWidth, windowHeight) {
        let tableWidth = dimensions.rightBorder - dimensions.leftBorder;
        let tableHeight = dimensions.bottomBorder - dimensions.topBorder;

        let widthMin = windowWidth / tableWidth;
        let heightMin = windowHeight / tableHeight;

        dimensions.minZoomoutTransform = Math.min(widthMin, heightMin);
        return dimensions.minZoomoutTransform;
    }

    return { tapIcon, deckIcon, moveTo, no, view, backImg, frontImg, dimensions, adjustMin };
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
    "Blind Box Exclusive": {
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
    "KickStarter Exclusive": {
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

//console.log(Object.keys(refExpansionCards));

//store in hashmap - key is the image file directory, value is prefix to use on the images
const expansionProperties = new Map();

//TODO: add a per-type count on each value, incl: startIndex,endIndex
//Placed in method to encapsulate function:
function populateProperties() {
    //Include the expansion name (key), and file prefix and duplicates (value)
    expansionProperties.set("Base Deck",
        { prefix: "HtS-PnP-Base-",
            duplicates: new Map(),
            uniqueCount: 95,
            perType: [[1, 74], [101, 106], [201,215]],
            names: []
        });
    expansionProperties.set("Warrior and Druid Expansion",
        { prefix: "HtS-WarDruid-",
            duplicates: new Map(),
            uniqueCount: 35,
            perType: [[1, 31], [101, 102], [201,202]],
            names: []
        });
    expansionProperties.set("Monster Expansion",
        { prefix: "HtS-PnP-Mon-",
            duplicates: new Map(),
            uniqueCount: 13,
            perType: [[201,213]],
            names: []
        });
    expansionProperties.set("Berserkers and Necromancers Expansion",
        { prefix: "HtS-BersNecr-",
            duplicates: new Map(),
            uniqueCount: 33,
            perType: [[1, 29], [101, 102], [201,202]],
            names: []
        });
    expansionProperties.set("Dragon Sorcerer Expansion",
        { prefix: "HtS-PnP-Drag-",
            duplicates: new Map(),
            uniqueCount: 16,
            perType: [[1, 14], [101, 101], [201,201]],
            names: []
        });
    expansionProperties.set("Exclusive",
        { prefix: "HtS-ConCard-",
            duplicates: new Map(),
            uniqueCount: 3,
            perType: [[101, 103]],
            names: []
        });
    expansionProperties.set("Blind Box Exclusive",
        { prefix: "HtS-NecBers-",
            duplicates: new Map(),
            uniqueCount: 2,
            perType: [[1, 2]],
            names: []
        });
    expansionProperties.set("KickStarter Exclusive",
        { prefix: "HtS-PnP-KSE-",
            duplicates: new Map(),
            uniqueCount: 25,
            perType: [[1, 21], [101, 104]],
            names: []
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

    //names:
    let names = new Map();
    names.set("Base Deck", [       //Base Game
        "Sealing Key",                          //001
        "Curse of the Snake's Eyes",
        "Suspiciously Shiny Coin",
        "Bard Mask",
        "Ranger Mask",
        "Wizard Mask",
        "Fighter Mask",
        "Guardian Mask",
        "Thief Mask",
        "Really Big Ring",                      //010
        "Particularly Rusty Coin",
        "Decoy Doll",
        "Enchanted Spell",
        "Forceful Winds",
        "Entangling Trap",
        "Winds of Change",
        "Critical Boost",
        "Destructive Spell",
        "Call to the Fallen",
        "Forced Exchange",                      //020
        "MODIFIER +2/-2",
        "MODIFIER -4",
        "MODIFIER +4",
        "MODIFIER +1/-3",
        "MODIFIER +3/-1",
        "CHALLENGE",
        "Pan Chucks 8+",
        "Heavy Bear 5+",
        "Qi Bear 10+",
        "Beary Wise 7+",                           //030
        "Tough Teddy 4+",
        "Fury Knuckle 5+",
        "Bear Claw 7+",
        "Bad Axe 8+",
        "Peanut 7+",
        "Napping Nibbles, Devourer of Worlds 2+",
        "Mellow Dee 7+",
        "Greedy Cheeks 8+",
        "Fuzzy Cheeks 8+",
        "Tipsy Tootie 6+",                      //040
        "Dodgy Dealer 9+",
        "Lucky Bucky 7+",
        "Calming Voice 9+",
        "Wise Shield 6+",
        "Mighty Blade 8+",
        "Radiant Horn 6+",
        "Iron Resolve 8+",
        "Holy Curselifter 5+",
        "Vibrant Glow 9+",
        "Guiding Light 7+",                     //050
        "Sharp Fox 5+",
        "Wildshot 8+",
        "Wily Red 10+",
        "Lookie Rookie 5+",
        "Bullseye 7+",
        "Quick Draw 8+",
        "Hook 6+",
        "Serious Grey 9+",
        "Smooth Mimimeow 7+",
        "Plundering Puma 6+",                   //060
        "Shuriktty 9+",
        "Meowzio 10+",
        "Slippery Paws 6+",
        "Sly Pickings 6+",
        "Kit Napper 9+",
        "Silent Shadow 8+",
        "Snowball 6+",
        "Bun Bun 5+",
        "Wiggles 10+",
        "Spooky 10+",                           //070
        "Fluffy 10+",
        "Buttons 6+",
        "Whiskers 11+",
        "Hopper 7+",
        "The Protecting Horn",
        "The Shadow Claw",
        "The Fist of Reason",
        "The Cloaked Sage",
        "The Divine Arrow",
        "The Charismatic Song",
        "Dracos 5-",
        "Orthus 8+",
        "Dark Dragon King 8+",
        "Terratuga 11+",
        "Crowned Serpent 10+",
        "Titan Wyvern 8+",
        "Corrupted Sabretooth 9+",
        "Mega Slime 8+",
        "Warworn Owlbear 8+",
        "Arctic Aries 10+",
        "Anuran Cauldron 7+",
        "Bloodwing 9+",
        "Abyss Queen 8+",
        "Malamammoth 8+",
        "Rex Major 8+"
    ]);
    names.set("Berserkers and Necromancers Expansion", [
        "Grim Pupper 8+",
        "Boston Terror 7+",
        "Bark Hexer 7+",
        "Perfect Vessel 4+",
        "Bone Collector 7+",
        "Hollow Husk 6+",
        "Shadow Saint 5+",
        "Beholden Retriever 5+",
        "Roaryal Guard 9+",
        "Brawling Spirit 9+",                   //010
        "Unbridled Fury 8+",
        "Annihilator 6+",
        "Meowntain 6+",
        "Vicious Wildcat 12+",
        "Rabid Beast 6+",
        "Gruesome Gladiator 10+",
        "NECROMANCER CHALLENGE",
        "BERSERKER CHALLENGE",
        "MODIFIER +2/-2 SPECIAL",
        "MODIFIER +7 SPECIAL",                  //020
        "Lightning Labrys",
        "Mass Sacrifice",
        "Necromancer Mask",
        "Berserker Mask",
        "Goblet of Caffeination",
        "Biggest Ring Ever",
        "Silver Lining",
        "Dragon's Bile",
        "Soulbound Grimoire",                   //...029
        "The Gnawng Dread",
        "The Raging Manticore",
        "Reptilian Ripper 7+",
        "Doombringer 8+"
    ]);
    names.set("Blind Box Exclusive", [
        "Howl of the Dead 7+",
        "Reigning King 11+"
    ]);
    names.set("Dragon Sorcerer Expansion", [
        "Egg of Fortune",
        "Sorcerer Mask",
        "MODIFIER -6 SPECIAL",
        "MODIFIER +6 SPECIAL",
        "SORCERER CHALLENGE",
        "Extraga 7+",
        "Smok 8+",
        "Dystortivern 10+",
        "Renovern 8+",
        "Dragalter 7+",
        "Luut 7+",
        "Mirroryu 7+",
        "Oracon 7+",
        "Shamanaga 7+",
        "The Fearless Flame",
        "Calamity Mongrel 8+"
    ]);
    names.set("Exclusive", [
        "The Fierce Panguardian",
        "The Illusive Trickster",
        "The Rhythmic Archer"
    ]);
    names.set("KickStarter Exclusive", [
        "Mask of Misfortune",
        "Mysterious Feather",
        "Captivating Spell",
        "MODIFIER +3/-2",
        "MODIFIER +1/-4",
        "MODIFIER +2/-3",
        "MODIFIER +4/-1",
        "GUARDIAN CHALLENGE",
        "THIEF CHALLENGE",
        "FIGHTER CHALLENGE",                    //010
        "RANGER CHALLENGE",
        "WIZARD CHALLENGE",
        "BARD CHALLENGE",
        "Purring Bandit 7+",
        "Hamlet 7+",
        "Mimi 4+",
        "Complex Illusion 8+",
        "Hoodwink 8+",
        "Bearserker 6+",
        "Nimble Gray 9+",                       //020
        "Enchantler 7-",
        "The Mystical Maestro",
        "The Brutal Bow",
        "The Veiled Raider",
        "The Unstable Unicorn"
    ]);
    names.set("Monster Expansion", [
        "Goretelodont 9+",
        "Voltclaw Lion 7+",
        "Lumbering Demon 8+",
        "Reef Ripper 6-",
        "Ancient Megashark 9+",
        "Dragon Wasp 7+",
        "Scavenger Griffin 9+",
        "Wandering Behemoth 10+",
        "Venomous Gemini 7+",
        "Wicked Sea Serpent 7+",                //210
        "Clawed Nightmare 9+",
        "Possessed Plush 7+",
        "Saffyre Phoenix 13+",
    ]);
    names.set("Warrior and Druid Expansion", [
        "Rapid Refresh",
        "Beast Call",
        "Even Bigger Ring",
        "Temporal Hourglass",
        "Warror Mask",
        "Druid Mask",
        "Bottomless Bag",
        "Soul Tether",
        "Cursed Glove",
        "MODIFIER +4 SPECIAL",              //010
        "MODIFIER -4 SPECIAL",
        "MODIFIER +1/-1 SPECIAL",
        "MODIFIER +2/-1 SPECIAL",
        "WARRIOR CHALLENGE",
        "DRUID CHALLENGE",
        "Magus Moose 5-",
        "Doe Fallow 7-",
        "Buck Omens 6-",
        "Glowing Antler 7-",
        "Big Buckley 8-",                   //020
        "Stagguard 8-",
        "Majestelk 7-",
        "Maegisty 7-",
        "Looting Lupo 5+",
        "Hardened Warrior 9+",
        "Blinding Blade 8+",
        "Wolfgang Pack 5+",
        "Agile Dagger 7+",
        "Critical Fang 6+",
        "Tenacious Timber 8+",              //030
        "Silent Shield 6+",
        "The Piercing Howl",
        "The Noble Shaman",
        "Muscipula Rex 10+",
        "Feral Dragon 9+"
    ])
;

    names.forEach((value, key, map) => {
        if(value.length) expansionProperties.get(key).names = value;
    });
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
    ["gameMat", []]
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

let baseAddress = "./images";
const loadAll = true; //testing variable: if true, loads all expansions

//TODO- expansionCardsExpected, tested for ALL and ONE(base) line up along
//TODO cont.- with #loaded expansionCards; same with expansionsLeft;
//TODO cont.- use expansionsLeft as means to trigger board to create objects
//"This won't take long.."

//TODO future feature: broadcast progress to server/gameState
//Purpose: references of javascript objects to show users asset loading progress
const updateInterface = {
    frontPage: null,
    loading: null,
    verbose: null,
    assetCount: null
}

let count = {
    expansionCards: 0,  //to track how many items have loaded in
    expansionCardsExpected: 0, //purpose: to calculate asset loading %ge
    expansionsLeft: 0,   //purpose: tracking %ge of all cards loaded (absolute number)
    miscCards: 0,
    miscCardsExpected: 39
}

//TODO - have this update an html view to update the user
//TODO: only call array of chosen expansion names, for sake of fast load (temporary)? TBD
//purpose: load all assets
function loadAssets(chosenExpansions) {

    expansionProperties.forEach( (value, key, map) => {
        if(loadAll) {} else
        if(!chosenExpansions.includes(key)) return;
        updateInterface.assetCount.expansionCardsExpected += value.uniqueCount;
    });

    updateInterface.assetCount.expansionsLeft =
    loadAll ? expansionProperties.size : chosenExpansions.length;

    let x = "Base Deck";
    let y = "leaders";
//    console.log(refExpansionCards[x]);
    expansionProperties.forEach( (value, key, map) => {
        if(loadAll) {
        } else if(!chosenExpansions.includes(key)) {
            return;
        }

        console.log(`Unpacking ${key}...`);

        //TODO - instead of chain, bulk-call; -- additional parameter: per-type numbers
//        loadExpansionCards(1, key, value.prefix);
//        if(value.names.length != 0) {
//            console.log(`Expansion ${key} has names!:`);
//            console.log(value.names);
//        }
        loadExpansionCards(key, value);
    });
}

//Purpose: load first, and separately from 'loadAssets'
//track count of playmats (gameMat, playerMat) for purpose of tracking
function loadMisc() {

    //load miscellaneous, hardcoded: tokens, image backs
    let image = new Image(sizes.small.width, sizes.small.height);
    image.src = `${baseAddress}/Misc/backCard.jpg`;
    image.source = `${baseAddress}/Misc/backCard.jpg`;
    miscRef.get("back")["backCard"] = image;

    image = new Image(sizes.medium.width, sizes.medium.height);
    image.src = `${baseAddress}/Misc/backLeader.jpg`;
    image.source = `${baseAddress}/Misc/backLeader.jpg`;

    miscRef.get("back")["backLeader"] = image;

    image = new Image(sizes.medium.width, sizes.medium.height);
    image.src = `${baseAddress}/Misc/backMonster.jpg`;
    image.source = `${baseAddress}/Misc/backMonster.jpg`;

    miscRef.get("back")["backMonster"] = image;

    console.log(`Unpacking PlayMats...`);
//    loadGameMats(1, "PlayMats");
    loadGameMats();
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

//test code for counting
let itemCount = {
    "Base Deck": 0,
    "Berserkers and Necromancers Expansion": 0,
    "Blind Box Exclusive": 0,
    "Dragon Sorcerer Expansion": 0,
    "Exclusive": 0,
    "KickStarter Exclusive": 0,
    "Monster Expansion": 0,
    "Warrior and Druid Expansion": 0,
    "PlayMats": 0
}
//let countsToGo = 9 - 1; //expansion count -1

const countVerbose = false;

//function loadExpansionCards(number, folderName, prefix) {
//    //'magicId' required as reference for recursion
//    const card = new Image();
//    card.magicId = number;
//
//    //propagage recursion along 'bucket'
//    card.onload = () => {
//        loadExpansionCards(card.magicId + 1, folderName, prefix);
//        itemCount[folderName]++;
//
//        processRefCard(card, folderName);
//
//        //TODO- push an incremented count, and/or filename
////        console.log(`${prefix}${padHundred(number)}.png: received`);
//        if(updateInterface.loading) updateInterface.loading.increment();
//    };
//
//    card.onerror = () => {
//        //transition to next bucket, X01
//        //0XX is 'cards', 1XX is 'leaders', 2XX is 'monsters'
//        switch(Math.floor(card.magicId / 100)) {
//            case 0:
//                loadExpansionCards(101, folderName, prefix);
//                break;
//            case 1:
//                loadExpansionCards(201, folderName, prefix);
//                break;
//            default:
//                if(--count.expansionsLeft == 0) {
//                    console.log("Finished loading all expansions");
////                    console.log(count.expansionCards);
//                }
//                if (countVerbose) {
//                    console.log(itemCount);
//                }
//                return;
//        }
//    };
//
//    card.src = `${baseAddress}/Game/${folderName}/${prefix}${padHundred(number)}.png`;
//}

function loadExpansionCards(folderName, properties) {
    //where startEnd = [integerStart, integerEnd]
    let cardNameIndex = 0;
    properties.perType.forEach((startEnd) => {
        for(let i = startEnd[0]; i <= startEnd[1]; i++) {
            const card = new Image();
            //assign image filename identifier
            card.magicId = i;

            //assign name
            if(properties.names && properties.names.length) { //size=0, falsy
                card.name = properties.names[cardNameIndex];
//                console.log(`Name found! ${card.name}`);
            }
            cardNameIndex++;

            preProcessRefCard(card, folderName, properties.prefix);
        }
    });
}

function preProcessRefCard(card, expansion, prefix) {
    card.onload = () => {
        itemCount[expansion]++; //"PlayMats" folderName
        processRefCard(card,expansion);

        if(updateInterface.frontPage) updateInterface.loading.increment();
    };

    card.onerror = () => {
        console.log(`Something went wrong: ${card.magicId} ${expansion}`);
    }

    card.src = `${baseAddress}/Game/${expansion}/${prefix}${padHundred(card.magicId)}.png`;
    card.source = `${baseAddress}/Game/${expansion}/${prefix}${padHundred(card.magicId)}.png`;
}

//Note: assumes there can only be x01 -> x99 of a type
//needs the card; (card's id),
function processRefCard(card, expansion) {
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

////some duplicate code, but modularized for clarity
//function loadGameMats(number, folderName) {
//    //'magicId' required as reference for recursion
//    const card = new Image();
//    card.magicId = number;
//
//    //propagate recursion along 'bucket'
//    card.onload = () => {
//        loadGameMats(card.magicId + 1, folderName);
//        itemCount[folderName]++; //"PlayMats" folderName
//        processPlayMat(card);
//
//        if(updateInterface.frontPage) updateInterface.frontPage.increment();
////        count.miscCards++;
//    };
//
//    card.onerror = () => {
//        //transition to next bucket, X01
//        //0XX is gameMat, 1XX is playmat
//        if(card.magicId < 100) {
//            loadGameMats(101, folderName);
//            return;
//        }
//
//        //terminate
//        //TODO: ping loading that miscs have been done
////        console.log(count.miscCards);
//
//
//        //TBD if needed- this already sorts itself;
//        miscRef.get("playMat").sort();
//        miscRef.get("gameMat").sort();
//    };
//
//    card.src = `${baseAddress}/${folderName}/${padHundred(number)}.png`;
//}

//hard coded 'folderName' (=PlayMats) and start/end indexes
function loadGameMats() {

    //gameMats 001->005
    for(let i = 1; i <= 5; i++) {
        const card = new Image();
        card.magicId = i;
        preProcessPlaymat(card, "PlayMats");
    }

    //playMats 101->134
    for(let i = 101; i <= 134; i++) {
        const card = new Image();
        card.magicId = i;
        preProcessPlaymat(card, "PlayMats");
    }
}

//purpose: assign all related .onload, push to UI, assigning SRC
function preProcessPlaymat(card, folderName) {
    card.onload = () => {
        itemCount[folderName]++; //"PlayMats" folderName
        processPlayMat(card);

        //TODO? track when misc is finished, maybe unimportant
        if(updateInterface.frontPage) updateInterface.frontPage.increment();
    };

    card.onerror = () => {
        console.log(`Something went wrong: ${card.magicId} ${folderName}`);
    }

    card.src = `${baseAddress}/${folderName}/${padHundred(card.magicId)}.png`;
    card.source = `${baseAddress}/${folderName}/${padHundred(card.magicId)}.png`;

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

            //NOTE: preItems[arrayName].length is cumulative
//            console.log(`${expansion} has ${preItems[arrayName].length}
//            cards in deck ${type}`);
        }
    });

    return preItems;
}

//TODO- purpose: references to loadscreen, interface is passed
//to also pass to the objects 'ref numbers', like expected counts
//TODO- we have a dynamic expectedCount for variable expansion choice at loadAssets()
function initialize(frontObj, loadObj, verbose, assetCount) {
    updateInterface.frontPage = frontObj; //show Misc updates
    updateInterface.loading = loadObj; //show overall expansion updates
    updateInterface.assetCount = assetCount;

    if(verbose) {
        updateInterface.verbose = verbose; //potential 'detailed' progress
    }

//    Object.entries(count).forEach((key, value) => {
//
//    });
    for(const [key, value] of Object.entries(count)) {
        assetCount[`${key}`] = value;
    }
//    console.log(assetCount);

    //Immediately load misc
    loadMisc();
}

export {assets, loadAssets, getMiscImages, prepareImages, sizes, initialize};


//TODO- add a way have assets "misc" load during frontPage,
//TODO- add a way to calculate "%ge" progress for load page,
//taking into account misc + chosen expansions