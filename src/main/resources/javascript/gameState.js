import {assets, sizes} from "./assets.js";
import {loadCards, loadMisc, deckify} from "./itemFactory.js";
import {userInterface, initializeBoardInterface} from "./boardInterface.js";
import server from "./serverConnection.js";
import presets from "./presets.js";

const gameState = (function() {
    //in order to render
    let items = {
        playMats: [],
        decks: [], //decks and cards could be merged;
        cards: [],
        tokens: [], //dice, etc
        players: [] //mouse, etc
    };

    let selected = new Array();


    //Purpose: faster recall for serverUpdates or rebuilding gameState via server
    let quickRef = {};

    let frontPage = null;

    let players = new Map();

    //Note re: rebuilding, this contains HAND OBJ with .ref
    //on rebuild, check THIS and players (Map obj) for hand with matching id,
    //then transfer cards
    let clientUser = {
        id: "0",
        color: "#FFFFFF",
        name: "Default"
    };

    let defaultNames = ["Bear","Squirrel","Unicorn","Fox","Cat","Bunny","Wolf","Deer","Dog","Dragon","BigCat","Chicken"];
    let defaultColors = [
        "#eba820", //paladin
        "#0b4b87", //assassin
        "#96262c", //fighter
        "#742f8d", //mage
        "#1f5d38", //ranger
        "#c2512e", //bard
        "#d41b69", //necromancer
        "#e18333", //berserker
        "#5d6cb3", //warrior
        "#14aa90", //druid
        "#0f1921" //sorcerer
    ];
    function rerollUser() {
        clientUser.name = defaultNames[Math.floor(Math.random() * defaultNames.length)];
        clientUser.color = defaultColors[Math.floor(Math.random() * defaultColors.length)];
    }
    rerollUser();

    let itemCount = 0;

    //purpose: all in one, send to Server
    const payload = [items, players, itemCount];

    function getID() {
        return ++itemCount;
    }

    //may be best for controller to hold
    function idToRGB(id, special) {
        let r = id % 255;
        id /= 255;
        let g = Math.floor(id%255);

        //special not provided, 'Blue' value is 0
        //special provided, 'Blue' value is 1
        //special indicates: "topOfCard" boolean
        let b = special ? 255 : 0; //255 is for testing visuals
        return `rgb(${r} ${g} ${b} / 100%)`;
    }

    //may be best for controller to hold
    function rgbToID(r, g, b) {
        return (b == 0 ? 1 : -1) * (r + g*255);
    }

    //private, internal function
    function findItem(number, list) {
        //for each item, take its 'id' property, then compare with our value 'number'
        let item;
        if(item = list.find(({id}) => id === number)) {
            return item;
        }
    }

    function addPlayer(user) {
        players.set(user.id, user);

        console.log("adding player, here is the updated player map:")
        console.log(players);
    }

    //on disconnect, 'deactivate' player? - set all 'selected' on player to null
    function removePlayer(user) {
//        players.push(user);
        //TODO
    }

    function getPlayers() {
        return players;
    }

    function getPlayer(id) {
        let match = null;
        players.forEach((value, key, map) => {
            if(value.id == id) {
                match = value;
                return;
            }
        });
        return match;
    }

    //Purpose: strictly for clientUser
    function changeUserName(stringName) {
        clientUser.name = stringName;
        server.clientUpdate("customize");
    }
    //Purpose: strictly for clientUser
    function changeUserColor(hexString) {
        clientUser.color = hexString;
        server.clientUpdate("customize");

        redraw.triggerRedraw();
    }
    //Purpose: changes regarding OTHER players
    function updatePlayer(newCopy) {
        let ourCopy = players.get(newCopy.id);
        if(!ourCopy) return;

        //Apply
        ourCopy.name = newCopy.name;
        ourCopy.color = newCopy.color;

        redraw.triggerRedraw();
    }


    //private, internal function
    function findList(item) {
        let type = item.isDeck ? "deck" : item.type;
        switch(type) {
            case "Leader":
            case "Monster":
            case "Card":
                return gameState.items.cards;
            case "playMat":
            case "gameMat":
                return gameState.items.playMats;
            case "deck":
                return gameState.items.decks;
            case "player":
                return gameState.items.players;
            default:
                console.log(type);
                console.log("error?");
                return null; //TODO handle error somehow
        }
    }

    function itemFromRGB(touch, mouse) {
        let data = touch.getImageData(mouse.x, mouse.y, 1, 1).data;
        let { 0: r, 1: g, 2: b, 3: t }  = data;
        let trueId = rgbToID(r, g, b);
        let id = Math.max(trueId, trueId * -1); // |absoluteValue|
        let item;
        for(const [key, list] of Object.entries(items)) {
            if(item = findItem(id, list)) {
                //Purpose: detecting 'topOfCard' of a deck
                if(trueId != id) {
                    let deck = item;
                    item = item.images[0]; //top of deck
                }

                return item;
            };
        }
        return null;
    }

    //turn to array input at some stage, for sake of 'deck'
    function push(item) {
        //add to quickRef
        quickRef[item.id] = item;
        return findList(item).push(item);
    }

    //to the end of list - accept an array
    function forward(items) {
        if(!Array.isArray(items)) items = new Array(items);
        let set = new Set(items); //faster .has()
        let checks = new Set();

        //check which lists we need to go over, prevent redundancy
        set.forEach((item) => checks.add(findList(item)));

        //for each list to be sifted
        checks.forEach((list) => {
            let original = []; //copy of original state
            let pop = []; //array to bring "forward"

            //sort each item in each list into buckets: original, currentSelected
            list.forEach((item) => {
                if(set.has(item)) {
                    pop.push(item);
                } else {
                    original.push(item);
                }
            });

            //reconstruct
            pop.forEach((item) => original.push(item));

            //apply
            switch(list[0].type) {
                case "Leader":
                case "Monster":
                case "Card":
                    if(list[0].isDeck) {
                        gameState.items.decks = original;
                    } else {
                        gameState.items.cards = original;
                    }
                    break;
                case "playMat":
                case "gameMat":
                    gameState.items.playMats = original;
                    break;
//                case "deck":
//                    gameState.items.decks = original;
//                    break;
                case "player":
                    gameState.items.players = original;
                    break;
                default:
                    console.log("Invalid type!");
            }
        });
    }

    function select(items, user) {
        if(!Array.isArray(items)) items = new Array(items);
        if(items[0] == undefined) return;

        let changes = new Set();
        let initialState = new Set();
        items.forEach(item => {
            initialState.add(JSON.parse(JSON.stringify(item, server.replacer())));
            //TODO- test to see how objects compare
//            console.log(item);
//            console.log(item instanceof HTMLElement);
//            console.log(initialState);
            if(item.deck)
            initialState.add(JSON.parse(JSON.stringify(item.deck, server.replacer())));
        });

        items.forEach((item) => {
            if(item.deck && item.deck.browsing && hoverIsCanvas()) {
                //reject if onCanvas, taking from deck being browsed
                console.log(`select() rejected: object is being browsed`);
                let toDelete = null;
                initialState.values()
                    .filter((initItem) => initItem.id == item.id)
                    .forEach((initItem) => toDelete = initItem); //expecting one match
                initialState.delete(toDelete);
                return;
            }
            //TODO: ask server for permission; if denied, do not add to 'selected'
            item.selected = user.id;
            changes.add(item);

            if(item.deck) {
                item.deck.selected = user.id;
                changes.add(item.deck);
            }

            if(item.deck && !hoverIsCanvas()) {
                if(Object.hasOwn(item, "ref")) item.ref.select();
            }
        });

        server.pushGameAction("select", new Array(...changes), new Array(...initialState));
    }

    function deselect(items) {
        if(!Array.isArray(items)) items = new Array(items);
        if(items[0] == undefined) return;

        let changes = [];

        items.forEach((item) => {
            if(item.isDeck && item.browsing) return;

            //TODO: notify server release of 'lock';
            changes.push(item);
            item.selected = 0;

            if(!item.deck) return;

            //additional: if 'topcard' was selected,
            //the deck will visually be selected
            if(!item.deck.browsing) {
                changes.push(item.deck)
                item.deck.selected = 0;
            }

            if(Object.hasOwn(item, "ref")) {
                item.ref.deselect();
            }
        });

        server.pushGameAction("deselect", changes);
    }

    //for performing accurate to mouse-position drags
    //in and out of hands/decks/non-canvas-elements
    const interfaceVariables = {
        hoverIsCanvas: true,
        startPoint: null,
        offset: null
//        ,
//        imageScale: null
    }

    //getter and setter
    function hoverIsCanvas(boolean) {
        //if blank, return value
        if(boolean == undefined) {
            return interfaceVariables.hoverIsCanvas;
        }
        //if not blank, adjust value
        else {
            interfaceVariables.hoverIsCanvas = boolean;
        }
    }

    function startPoint(boolean) {
        //if blank, return value
        if(boolean == undefined) {
            return interfaceVariables.startPoint;
        }
        //if not blank, adjust value
        else {
            interfaceVariables.startPoint = boolean;
        }
    }

    function offset(boolean) {
        //if blank, return value
        if(boolean == undefined) {
            return interfaceVariables.offset;
        }
        //if not blank, adjust value
        else {
            interfaceVariables.offset = boolean;
        }
    }

//    function imageScale(boolean) {
//        //if blank, return value
//        if(boolean == undefined) {
//            return interfaceVariables.imageScale;
//        }
//        //if not blank, adjust value
//        else {
//            interfaceVariables.imageScale = boolean;
//        }
//    }

    let offsetMultipliers = {
        Cards: null,
        Monsters: null,
        Leaders: null
    }

    //Purpose: translating mouseOffset when dragging a card from nonCanvasElement
    //calculate on game start, on resize (WIP)
    function translateOffset() {
        //get ref via user.hand.ref
        //note: not precise, due to scrollbar space occupied, and img padding
        let visualHeight = clientUser.hand.ref.cardHolder.clientHeight;

        offsetMultipliers.Card = sizes.small.height/visualHeight;
        offsetMultipliers.Monster = sizes.medium.height/visualHeight;
        offsetMultipliers.Leader = offsetMultipliers.Monsters;
    }

    function translateDimensions(width, height) {
        translateOffset();
        assets.adjustMin(width, height);
    }

    //Purpose: reference point of an item being dragged
    function setStart(items) {

        //purpose of offsetting multiple cards taken from hand
        let xBonus = 0;
        let yBonus = 0;

        let fromDeckCards = [];

        items.forEach((item) => {
            if(!item.selected) return;
            if(item.deck) {

                if(hoverIsCanvas()
                //to filter 'Hand' type, prevents error
                && !Object.hasOwn(item.deck, "isHand")) {
                    item.dragStart.x = item.deck.coord.x;
                    item.dragStart.y = item.deck.coord.y;
                } else {
                    //Purpose: dragging from Hand or Preview (nonCanvas)
                    fromDeckCards.push(item);

                    tapItem(item, clientUser.position);

                    let multiplier = offsetMultipliers[item.type] || 1;
                    item.dragStart.x = startPoint().x - offset().x * multiplier + xBonus;
                    item.dragStart.y = startPoint().y - offset().y * multiplier + yBonus;

                    xBonus += item.height*0.20;
                    yBonus -= item.height*0.20;
                }

                //then remove from deck
                //TODO- edgecase. last item of a deck reads as not having a deck, due to dissolve
                //how to repeat: drag all items (multiple) from a deck preview to canvas
                //*hands are fine, because it's never deleted
                takeFromDeck(item);

            } else {
                //TODO-refactor? .getX() on a deck-removed item
                //refers to original, primitive coord
                //drag from deck- works fine. when using .getX/Y(),

                item.dragStart.x = item.coord.x;
                item.dragStart.y = item.coord.y;
            }

        });

        forward(fromDeckCards);
    }

    //relies on querying server for permission to lock the card, property: "disabled"
    //TODO - unused
    function setEnableItems(items, boolean) {
        if(!Array.isArray(items)) items = new Array(items);
        //'true' allows 'touch' to be drawn
        //'false' disallows this
        items.forEach((item) => {
            item.disabled = boolean;
        });

        //Uses: onDragStart, onDragEnd
        //application - items being dragged are
    }

    //purpose: tracking if we changed objects
    let hoverItem = null;
    //track if type is compatible, between drag + draw methods
    let hoverCompatible = false;
    const validHover = new Set(["Card", "Monster", "Leader"]);

    //Likely no longer required
    function purgeHoverItem() {
        hoverItem = null;
        hoverCompatible = false;
        selectedTypes = new Set();
    }

    //NOTE: hoverObject is hoverElement in index.js
    let selectedTypes = new Set();
    function dragItems(dx, dy, dragItem, correct, hoverObject, itemFocus) {
        if(!Array.isArray(dragItem)) dragItem = new Array(dragItem);

        //is often null
//        console.log(hoverObject);

        //onDragStart, each item's relative start point must be recorded
        if(!correct) {

            dragItem.forEach((item) => selectedTypes.add(item.type));

            setStart(dragItem);
            forward(dragItem);
            //we want other users still able to hover for "tooltip" on an item someone is
            //actidragItems dragging - no additional
        }

        //TODO - get 'selected' from server if valid
        //TODO - purge 'selected'
//        no longer the same, default, then reassign
//        console.log(hoverCompatible);
        if(hoverItem != hoverObject) {

            hoverItem = hoverObject;

            if(hoverItem == null || !validHover.has(hoverObject.type) || !selectedTypes.has(hoverItem.type)) {
                hoverCompatible = false;
//                console.log("incompatible!");
            } else {
                hoverCompatible = true;
//                console.log("compatible!");
            }
        }

        let relevant = new Set();
        dragItem.forEach((item) => {
//            if(!item.selected) return;
            if(item.selected != clientUser.id) return;
            relevant.add(item);
            item.coord.x = dx + item.dragStart.x;
            item.coord.y = dy + item.dragStart.y;
        });

        server.pushGameAction("drag", new Array(...relevant));
    }

    //typeof force "boolean", true->frontImg
    function getImage(item, force) {
        if(!item || (!item.index && item.index != 0)) return;
        if(item.isDeck) {
            item = item.images[0];
        }

        return force ? item.images[assets.frontImg] : item.images[item.index];
    }

    //to replace 'flip' function
    function cycleImage(items, modifier) {
        if(!Array.isArray(items)) items = new Array(items);

        let relevant = new Set();
        items.forEach((item) => {
            //TODO - to be made item.cycleImage(mod);
            //default increments +1
            if(!item.id) return;

            relevant.add(item);

            if(!modifier) {
                item.index++;
                item.index %= item.images.length;

                //visual facedown, faceup
//                if(item.deck && item.ref) {
//                    console.log("hallo");
//                    if(item.deck.isHand) return;
//                    if(item.index == assets.backImg) {
//                        item.ref.facedown();
//                    } else {
//                        item.ref.faceup();
//                    }
//                }

                return;
            }

            //catch all for greater negatives defaults to -1
            if(modifier <= -1) {
                if(--item.index < 0) item.index = item.images.length-1;
            } else {
                //anything else applies
                item.index = modifier;
                item.index %= item.images.length;
            }

        });

        server.pushGameAction("cycleImage", new Array(...relevant));
    }

    //'selected' for clarity, (game-wide)
    //'focus' and 'dragging' (client-side) for drag-to-deck functionality
    function drawItems(dragging, visual, interactive) {

        for (const [type, list] of Object.entries(items)) {

            list.forEach((item) => {
                if(item.disabled || !item.coord) return;

                let x = item.coord.x;
                let y = item.coord.y;
                let width = item.width;
                let height = item.height;

                let useX;
                let useY;

                let itemImg = getImage(item);
                if(!(itemImg instanceof HTMLImageElement)) {
                    console.log("error!");
                    return;
                }
                if(item.flipMe) {
                    visual.save();
                    //TODO: fix for positions 1,3 they are swapped around
                    visual.rotate((item.flipMe * -90) * Math.PI / 180);
                }
                switch(item.flipMe % 4) {
                        case 1: //90*
                            useX = -y - (itemImg.width/2 + itemImg.height/2);
                            useY = +x - (itemImg.height/2 - itemImg.width/2);
                            break;
                        case 2: //180*
                            useX = -x - itemImg.width;
                            useY = -y - itemImg.height;
                            break;
                        case 3: //270*
                            useX = y - (itemImg.width/2 - itemImg.height/2);
                            useY = -x - (itemImg.height/2 + itemImg.width/2);
                            break;
                        default:
                            break;
                }

                let color = 'white';

                if(item.selected) {
                    //server-wide clarity
                    //TODO- filter for user with id match, use user's .color
                    color = players.get(item.selected) ? players.get(item.selected).color : 'white';
                    visual.shadowColor = `${color}`;
                    visual.shadowBlur = 25;
                } else {
                    if(visual == undefined) console.log("what");
                    visual.shadowBlur = 0;
                }

                //purpose: allow client to see hover 'below' whilst mid-drag
                if(item.selected && dragging) {
                    //do not render touch
                } else {
                    interactive.save();

                    interactive.roundedImage(useX || x, useY || y, width, height);

                    //purpose: to detect 'TopOfCard'
                    if(item.isDeck) {
                        interactive.fillStyle = idToRGB(item.id, true);
                    } else {
                        interactive.fillStyle = item.touchStyle;
                    }

                    interactive.fillRect(useX || x , useY || y, width, height);
                    interactive.fill();

                    interactive.restore();
                }

                //Make rounded
                visual.save();

                visual.roundedImage(useX || x, useY || y, width, height);
                visual.clip();
                visual.drawImage(itemImg, useX || x, useY || y, itemImg.width, itemImg.height);

                visual.restore();

                //...finally
                if(item.flipMe) {
                    visual.restore();
                }
            });
        }

        items.decks.forEach((deck) => {
            //.disabled, coord==null/undefined expected under prototypal 'hand' class
            if(deck.disabled || !deck.coord) return;
            let {x, y} = deck.coord;
            let color = 'white';

            if(deck.selected) {
                color = players.get(deck.selected) ? players.get(deck.selected).color : 'white';
                visual.shadowColor = `${color}`;
                visual.shadowBlur = 25;
            } else {
                visual.shadowBlur = 0;
            }

            visual.fillStyle = "grey";
            visual.beginPath();
            visual.arc(x, y, 40, 0, 2 * Math.PI);
            visual.fill();

            visual.font = "50px Arial";
            visual.fillStyle = "white";
            visual.fillText(`${deck.images.length}`,(x-40),(y+10));

            visual.fillStyle = "black"; //set to default

            if(deck.selected && dragging) {
            } else {
                interactive.fillStyle = deck.touchStyle;
                interactive.beginPath();
                interactive.arc(x, y, 40, 0, 2 * Math.PI);
                interactive.fill();
                interactive.fillStyle = "black"; //set to default
            }
        });

        //So far: Visual tokens on Cards
        //TODO - in the future, use this to load.. other visual tokens as well?
        for (const [type, list] of Object.entries(items)) {

            list.forEach((item) => {
                if(item.browsing) {} else
                if(!item.selected || item.disabled || !item.coord) return;

                //TODO - include path for when 'hoverCompatible = true'
                //+special route for hoverItem
                let { x, y } = item.coord;
                let { width, height } = item;

                let img;
                if(item.browsing) {
                    img = assets.view;
                } else if(!hoverCompatible || item == hoverItem
                || item.selected != clientUser.id) {
                    img = assets.tapIcon;
                } else if(item.browsing) {
                    img = assets.view;
                } else if (item.type == hoverItem.type) {
                    img = assets.moveTo;
                } else {
                    img = assets.no;
                }

                visual.save();

                visual.filter = "blur(10px)";
                visual.fillStyle = players.get(item.selected || item.browsing) ?
                players.get(item.selected || item.browsing)["color"] : "white";
                visual.beginPath();
                visual.arc(x + width/2, y + height/2, img.height/2,//radius
                    0, 2* Math.PI);
                visual.fill();

                visual.restore();

                visual.drawImage(img, x + width/2 - img.width/2,
                    y + height/2 - img.height/2);
            });
        }

        if(hoverCompatible && !hoverItem.selected && !hoverItem.disabled) {
            let img = assets.deckIcon;
            let { x, y } = hoverItem.coord;
            let { height, width } = hoverItem;

            visual.save();

            visual.filter = "blur(10px)";
            visual.fillStyle = clientUser.color;
            visual.beginPath();
            visual.arc(x + width/2, y + height/2, 50,//radius
                0, 2* Math.PI);
            visual.fill();

            visual.restore();

            visual.drawImage(img, x + width/2 - img.width/2,
                y + height/2 - img.height/2);
        }

        //TODO note: code for testing boundaries (visual) code; not for demo or 'official release'
//        visual.save();
//        visual.fillStyle = `RGB(0, 255, 0, 0.3)`;
//        visual.fillRect(assets.dimensions.leftBorder, assets.dimensions.topBorder,
//            assets.dimensions.rightBorder - assets.dimensions.leftBorder, //width
//            assets.dimensions.bottomBorder - assets.dimensions.topBorder); //height
//        visual.restore();
    }

    //TODO - checks 'persist' storage if gameState 'items' already exists to load from
    const loadAll = true; //testing code; 'false' for live
    const allExpansions = [ //testing code, in conjunction with loadAll
        'Base Deck',
        'Berserkers and Necromancers Expansion',
        'Blind Box Exclusive',
        'Dragon Sorcerer Expansion',
        'Exclusive',
        'KickStarter Exclusive',
        'Monster Expansion',
        'Warrior and Druid Expansion',
    ];

    //TODO- only call if server not connected OR server connected + no game existing OR loading solo OR loading demo
    function loadBoard(expansions) {
        cleanSlate();
        console.log("Loading board...");
        //todo - from objectFactory, in conjunction with assets - hard coded set of objects - mats, dice

        let timeStamp = Date.now();

        loadMisc().forEach((misc) => {
            push(misc);
            misc.timeStamp = timeStamp;
        });

        //if loadAll, load all expansions- NOTE: make sure all assets are loaded
        let freshCards = loadCards(loadAll ? allExpansions: expansions);

        //push cards into gamestate
        for(const value of Object.values(freshCards)) {
            value.forEach((item) => {
                push(item);
                item.timeStamp = timeStamp;
            });
        }

        //decks- Card, Leader, Monster -- not hard coded
        let decks = new Map();

        //add card to corresponding 'pre'-deck
        Object.values(freshCards).forEach(
            deck => deck.forEach(
                card => {
                let { type } = card;

                if(!decks.has(type)) {
                    decks.set(type, []);
                }

                decks.get(type).push(card);
        }));

        //create decks -
        console.log(decks);
        for(const [key, value] of decks) {
            let deck = deckify(value);
            push(deck);
            deck.timeStamp = timeStamp;
        }

        items.decks.forEach(deck => deck.shuffle());

        //TODO- push to server; -- likely do processing at server
        //TODO- likely keep all non-server module interactions abstracted
        server.pushGame([items, players, itemCount]);
    }

    //private; coupled with 'rebuildBoard' and 'loadBoard' as means of clean slate
    function cleanSlate() {
        //Objects
        Object.keys(items).forEach((key) => {
            items[key].length = 0; //empty
        });
        itemCount = 0;
        //Refs
        selected.length = 0;
        quickRef = {};
        players.forEach((value, key, map) => {
            if(key != clientUser.id) map.delete(key);
        });
    }

    //if connecting from a game in session OR fetching server's copy of gameState
    //demo-boolean, "true" => load from presets
    //TODO- implement numCount
    function rebuildBoard(gameObjects, playerObjects, numCount, demo) {
        cleanSlate();

        console.log("Rebuilding board..");

        let data;
        if(demo) { //
            data = presets.demo3;
            data = JSON.parse(data);
            gameObjects = data[0];
            playerObjects = data[1];
        } else if(!gameObjects && !playerObjects) { //When refreshing from OWN client gameState
            data = JSON.stringify(payload, server.replacer());
            data = JSON.parse(data);
            gameObjects = data[0];
            playerObjects = data[1];

//            console.log(playerObjects);
        } //else, called from being retrieved from Server

//        console.log(gameObjects);
//        console.log(items);

        //Purpose: new client joining existing game, proceed as if quickRef empty, items empty
        let oldRef = quickRef; //Note important: strictly for testing comparisons
        quickRef = {}; //empty everything

        //Populate items object (renders list)
        let reconstructionItems = {}; //equivalent of "items" obj
        let largestId = 0; //purpose: correcting gameState id; TODO: refer to server for gameId

        console.log("Printing new gameState ref:")
        for(const [key, value] of Object.entries(gameObjects)) {
            reconstructionItems[key] = [];
            console.log(value);
            value.forEach((item)=>{
                //temp code for testing- narrowing down on issue of multiplayer bug
                if(!item) {
                    console.log(`Failure of item: "${item}" in value ${key}.`);
                    return;
                }
                if(!item.id) {
                    console.log(`Failure of item.id: "${item.id}" in value ${key}.`);
                    console.log(item);
                    return;
                }

                reconstructionItems[key].push(item);
                quickRef[item.id] = item;
                largestId = Math.max(largestId, item.id);
            });
        }

        console.log("Reconstruction Items:");
        console.log(reconstructionItems);

        //Populate players map (list)
        let reconstructionPlayers = new Map();
        playerObjects.forEach((player) => reconstructionPlayers.set(player.id, player));

        console.log("Reconstruction Players:");
//        console.log(...reconstructionPlayers.entries());
        console.log(reconstructionPlayers);

        //Reconnect circular references, and JSON restructured properties
        for(const [key, value] of Object.entries(reconstructionItems)) {
            value.forEach((item) => {
                //TODO- .deck can be a large number, as when in user.hand (user.id);
                if(!item.isDeck && typeof item.deck === "number") {
                    //NOTE: arbitrary, large, fit most cases
                    if(item.deck > 10000) {
                        item.deck = reconstructionPlayers.get(item.deck).hand; //check players IDs
                    } else {
                        item.deck = quickRef[item.deck];
                    }
                }
                if(item.isDeck && item.images[0]) { //assumes (isDeck) ? any images=int
                    let newImages = [];
                    item.images.forEach((id) => newImages.push(quickRef[id]));
                    item.images = newImages;
                } else { //assumes if NOT deck.. then images need re-organizing
                    let newImages = [];
//                    console.log(`Attempting ${item.id}`);
//                    console.log(item);
                    item.images.forEach((src) => {
                        const image = new Image();
                        image.src = src;
                        image.height = item.height;
                        image.width = item.width;
                        image.source = src;
                        newImages.push(image);

                        image.onerror = () => {
                            console.log(image.src);
                        }
                    });

                    item.images = newImages;
                }
            })
        }

        //If any decks are being viewed by clientUser, update UI
        reconstructionItems["decks"]
            .filter((deck) => deck.browsing == clientUser.id)
            .forEach((deck) => userInterface.preview.setView(deck)); //expecting one match at most

        //reconstruct "hand" (separate from renders list) circular references and JSON omitted
        reconstructionPlayers.forEach((v,k,m) =>{
            if(!v.hand.images) v.hand.images = []; //if was empty, JSON omitted, so initialize
            if(v.hand.images.length != 0) { //assumes hand.images[] are all ids (int, number)
                let newImages = [];
                v.hand.images.forEach((id) => newImages.push(quickRef[id]));
                v.hand.images = newImages;
            }
        });

        //Apply all: renders
        console.log(items);

        Object.assign(items, reconstructionItems);

        //TODO- also fix hand.images[], still stuck integers
        //TODO- ensure hand.images[] and refs of cards are all OK
        reconstructionPlayers.forEach((v,k,m) => {
            //Apply to user interface 'MyHand'
            if(k == clientUser.id) {
                //pre-repair
                let ref = clientUser.hand.ref;

                //total overwrite
                Object.assign(clientUser, v);

                //repair
                clientUser.hand.ref = ref;
                ref.newSrc(clientUser.hand);
            } else {
                players.set(k, v);
            }
        });

//        Object.assign(players, reconstructionPlayers);
        //TODO ensure players are added; if same user, preserve reference
//        console.log(clientUser);
//        reconstructionPlayers.entries().forEach((entry) => {
////            if(!players.has(userId)) addPlayer(user);
////            if(player.has(userId)) Object.assign(clientUser.hand, user.hand); //is the player
//            //[key, value] aka [userId, user]
//            if(entry[0] == clientUser.id) {
//                clientUser.hand.newSrc(entry[1].hand);
//            } else {
//                players.set(entry[0], entry[1]);
//            }
//        });



        console.log(items);

//        //iter2.2: check user hands for .images to re-pointer
        //NOTE: .ref is ommited; if .id == clientUser.id, transfer other properties;
        //NOTE: never delete clientUser- this is the current client's identity

        //TODO-attempt at isolating preview; if left for last, will this fix issues?
//        quickRef.forEach((newItem) => {
//            if(newItem.isDeck && newItem.browsing && newItem.browsing == clientUser.id) {
//                console.log(newItem.images[0]);

//            }
//        })

        //TODO- rely or link to server, if (server.connection)
        //as it returns "Yes", take current itemCount on server, set to clientGamestate itemcount,
        //then process callback function => callback function will send new obj to at the new id;
        //on new nonHand, nonDeck item, if id > itemCount, server.itemCount = id
        //Early attempt at self correcting itemCount
        itemCount = largestId;

        //Recover 'selected' interface state
        //First: store all selected cards; and corresponding .deck if any
        //Second: if .deck is selected and NOT stored in 'First', also add to select
        let decksOfSelected = [];
        items.cards
            .filter((card) => card.selected == clientUser.id)
            .forEach((card) => {
                selected.push(card);
                if(card.deck != 0) decksOfSelected.push(card.deck);
            });
        items.decks.filter((deck) =>
                deck.selected == clientUser.id && !decksOfSelected.includes(deck) && !deck.browsing)
            .forEach((deck) => {
                selected.push(deck);
            });
        items.playMats
            .filter((playMat) => playMat.selected == clientUser.id)
            .forEach((playMat) => {
            selected.push(playMat);
        });

        console.log("Selected:")
        console.log(selected);

        console.log("quickref:")
        console.log(quickRef);

        console.log("Players, supposedly:");
        console.log(players);
    }

    //Purpose: take updates from server and apply to gameState, then ensure redraw()
    function updateItems(data) { //as parsed from JSON
        if(!data) {
            console.log("no data found!");
            return;
        }

//        console.log(`Updating items... ${data.explicit}`);

        //Apply timestamps, data.timeStamp
            //cards, decks, playmats, hands,
        //first, consolidate all, then forEach()
            //note, impossible to not be 'found' if sender == this same client; would already be added/processed
        let newStateObjects = [];
        Object.values(data) //Collect all non empty arrays
            .filter((value) => Array.isArray(value) && value.length != 0)
            .forEach((array) => newStateObjects = newStateObjects.concat(array));
        //second, apply to quickref the timestamp

        //but first, fill in any 'holes'- if sender != clientUser.id,
        //chances are there might be a new object;

        if(data.senderId != clientUser.id) {
            //if new object, also have to repair some properties;
            //example:
                    //image.src = src;              => repair image ref
                    //image.height = item.height;   => reinitialize properties
                    //image.width = item.width;     => reinitialize properties
                    //image.source = src;           => reinitialize properties

            //Find missing items, add, then repair
            let missingItems = {};
            newStateObjects
                .filter((item) => quickRef[item.id] == undefined && players.get(item.id) == undefined)
                .forEach((item) => missingItems[item.id] = item);

            //if missing item, repair images, repair ref IDs (deck/hand .images) or "card".deck != 0
            Object.values(missingItems).forEach((item) => {
                //Early attempt to self correct itemCount
                if(!item.isHand) itemCount = Math.max(itemCount, item.id);
                //LARGELY COPY PASTED:
                if(!item.isDeck && typeof item.deck === "number") {
                    //NOTE: arbitrary, large, fit most cases
                    if(item.deck > 10000) {
                        item.deck = players.get(item.deck).hand; //check players IDs
                    } else {
                        if(quickRef[item.deck] == undefined) {
                            //test code, just in case:
                            if(missingItems[item.deck] == undefined)
                                console.log("Error! Deck not found in updateItems!");
                            item.deck = missingItems[item.deck];
                        } else {
                            item.deck = quickRef[item.deck];
                        }
                    }
                }
                if(item.isDeck && item.images[0]) { //assumes (isDeck) ? any images=int
                    let newImages = [];
                    item.images.forEach((id) => newImages.push(quickRef[id]));
                    item.images = newImages;
                } else { //assumes if NOT deck.. then images need re-organizing
                    console.log("Strange: we found a previously unregistered gameItem");
                    console.log(item);
                    let newImages = [];
                    item.images.forEach((src) => {
                        const image = new Image();
                        image.src = src;
                        image.height = item.height;
                        image.width = item.width;
                        image.source = src;
                        newImages.push(image);

                        image.onerror = () => {
                            console.log(image.src);
                        }
                    });

                    item.images = newImages;
                }
            });

            //after fixing objects, finally inject into client gameState
            Object.values(missingItems).forEach((item) => {
                if(item.isHand) {
                    console.log(`New hand found, id: ${item.id}`);
                    players.get(item.id).hand = item;
                    return;
                }
                //anything further is a card, deck, or playmat *visual tokens not taken into account yet
                //TODO add filter: if deck, do not add if empty; TBD: if need to also purge here
                if(item.isDeck && item.images.length < 2) return;
                push(item);
                quickRef[item.id] = item;
            });

//            console.log("All missing items inserted:");
//            console.log(Object.values(missingItems));
        }

        //finally apply changes, rest assured there are no missing objects
        //if false, only apply timestamp; if true,
            //done this way to minimize repeated 'searching' code
        let fullChange = data.senderId != clientUser.id;

        //TODO future- if own player's hand, update visual? in the event of future 'viewHand' 'takeRandomFromHand'
                //will likely take a different path;
        let skip = false;
        newStateObjects.forEach((item) => {
//            console.log("Attempting changes in itemUpdate...");
            if(skip) return;

            let realItem = null;
            if(quickRef[item.id]){
                realItem = quickRef[item.id];
            } else {
                //to handle... temporary edge case: player tries to receive deck ALREADY destroyed
                if(!players.get(item.id)) {
                    realItem = null;
                    console.log("not found in players!");
//                    console.log(players.keys());
//                    console.log(players);
//                    console.log(getPlayers());
                } else {
                    realItem = players.get(item.id).hand;
                    console.log("found in players!");
                }
            }
            if(realItem == null) { //Error log
                console.log("Real item not found!");
                console.log(item);
                skip = true;
                return;
            }
            if(realItem == item) {
                console.log("New item added successfully");
                console.log(item);
                return;
            }

            //timeStamp
            realItem.timeStamp = data.timeStamp;

            //TODO note Important: enable !fullChange code when not testing
            if(!fullChange) return;
//            console.log("Continuing with fullChange in itemUpdate...");

            //how about we refine it per action? what could go wrong?
            switch(data.explicit) {
                case 'addToDeck': //only focus deck.images[], cards.coord, cards.deck, deck purge
                case 'takeFromDeck': //cont: disabled, card.index;
                    if(item.isDeck && !item.isHand && item.images.length < 2) {         //filter decks to purge
//                        console.log("uhoh");
//                        console.log(item);
//                        console.log(quickRef[item.id]);
                        //Purge
                        //Note: should come accompanied with 'otherCard', and it should have correct .deck = 0
                        let findObj = (entry) => entry == realItem;
                        items.decks.splice(items.decks.findIndex(findObj), 1);
                        delete quickRef[item.id];
                        break;
                    }

                    if(!item.isDeck) {                                                  //process nonDecks
                        realItem.coord = item.coord;
                        if(typeof item.deck == "number") {
                        //uses arbitrary number, should fit most use cases
                            item.deck = item.deck > 10000 ? players.get(item.deck).hand : quickRef[item.deck];
                        }
                        realItem.deck = item.deck;
                        realItem.disabled = item.disabled;
                        realItem.index = item.index; //in the event of sent/taken from player hand
                    } else {                                                            //process decks
                        //mimicing takeFromDeck()
                        if(!item.browsing) realItem.selected = item.selected; //expect 0

                        //is a deck or hand;
                        if(item.images.length == 0) {
                            realItem.images = [];
                            break;
                        }
                        //else expect integers
                        let newImages = [];
                        item.images.forEach((number) => newImages.push(quickRef[number]));
                        realItem.images = newImages;

                        //TODO- if own hand, or own view, update
                        //TODO- to be tested on voluntary 'giveRandom()'- another clientUser sends card to this client
                        if(item.id == clientUser.id) {
                            clientUser.hand.ref.update();
                        }
                    }
                    break;
                case 'drag': //only focus coord; also forward!
                    realItem.coord = item.coord;
                    //note: order not 1:1 between sender/receiver, 'Set' used in processing
                    //see if 'forward' is expensive, if ==true, add additional 'onetime' forward identifier
                    //like the boolean
                    forward(realItem);
                    correctCoords(realItem);
                    break;
                case 'deselect': //only on .selected
                case 'select': //only on .selected
                    realItem.selected = item.selected;
                    break;
                case 'cycleImage': //only item.index
                    realItem.index = item.index;
                    break;
                case 'selectView': //only deck.browsing, deck.selected; if == this client, update
                case 'deselectView': //as in selectView
                    if(realItem.isDeck) {
                        let originalBrowsing = realItem.browsing;
                        realItem.browsing = item.browsing;
                        realItem.selected = item.selected;

                        //UI:
                        if(realItem.browsing == clientUser.id) {
                            userInterface.preview.setView(realItem); //opponent's hand
                        } else if(originalBrowsing == clientUser.id) {
                            userInterface.preview.setView(); //deselect, this client's vieww overridden
                        }
                    } else {
                        console.log("This is not a deck, how did it get here? Real, Update");
                        console.log(realItem);
                        console.log(item);
                    }
                    break;
                case 'tapItem': //item.flipMe property
                    realItem.flipMe = item.flipMe;
                    correctCoords(realItem);
                    break;
                case 'anchorItem': //item.anchored property
                    realItem.anchored = item.anchored;
                    break;
                default:
                    console.log(`itemUpdate command '${data.explicit}' unaccounted for!`);
                    console.log("Items affected:");
                    console.log(newStateObjects);
                    skip = true;
                    break;
            }
        });

        redraw.triggerRedraw();
    }

    //returns true: method was successful, proceed to purge selected (index.js)
    //returns false: "" unsuccessful after 'mouseUp' + 'isDragging'; do not purge
    //"index" - is nullable, provided when dragged into specific deck/hand preview index;
    const typeWhiteList = ["Card", "Leader", "Monster"];
    function addToDeck(donor, recipient) {
        //TODO- 'hoverElement' is recipient, else find a way to set hoverElement to 'hand'; likely in index.js
        //TODO- find out if 'lock' is important for race conditions

        if(!Array.isArray(donor)) donor = new Array(donor);
        if(donor.includes(recipient) || recipient == null) {
//            console.log(`addToDeck error: '${recipient}' null or included in donors`);
            return false;
        }

        let index;

        //where recipient isHand, keep recipient same
        if(recipient.deck || recipient.isHand) {
            if(!recipient.isDeck) index = recipient.deck.images.indexOf(recipient.card);
            if(index == -1) index = 0;
            recipient = recipient.deck || recipient;
        } else if (recipient.disabled) {
//            console.log(`addToDeck error: '${recipient}' is touch/vis disabled`);
            return false;
        }

        //Collate all 'images' of correct type
        const type = recipient.type;
        if(!typeWhiteList.includes(type)) return false;

        let donorCards = [];

        //Purpose: server updates
        let relevant = new Set();
        relevant.add(recipient);

        donor.forEach((item) => {
            //filter
            if(item.type != type || item.browsing) return;

            if(item.isDeck) {
                item.images.forEach((card) => donorCards.push(card));
                item.images.forEach((cardInDeck) => relevant.add(cardInDeck));
                dissolveDeck(item, true);
                relevant.add(item);
                //checks if item is already in; prevents duplicates
            } else if (!recipient.images.includes(item)){
                donorCards.push(item);
                relevant.add(item);
            }
        });

        //no type matches
        if(donorCards.length == 0) {
            console.log(`addToDeck error: no valid donors, or donors included are in recipient`);
            return false;
        }

        //!isDeck only happens in Canvas interaction, no index
        if(!recipient.isDeck) {
            push(deckify(donorCards, recipient));

            relevant.add(donorCards[0].deck);
            server.pushGameAction("addToDeck", new Array(...relevant));
            return true;
        }

        donorCards.forEach((card) => {
            card.deck = recipient;
            card.coord = recipient.coord;
            card.disabled = true;

            if(recipient.isHand) {
                card.index = assets.frontImg;
            }
        });

        //Inject at specific index (reordering)
        recipient.images.splice(index, 0, ...donorCards)

        if(recipient.ref) recipient.ref.update();

        server.pushGameAction("addToDeck", new Array(...relevant));
        return true;
    }

    //to only trigger where, onDragStart, a card.disabled = true was  found
    //TODO future - have 'takeFromHand' (random) take a 'hand' object,
    //TODO future cont. - generate random index 1-n, then pass said
    //TODO future cont. cont. - card object into takeFromDeck (here)
    //actually, [random] likely just self inserts into calling person
    //'s hand
    function takeFromDeck(card) {
        let {id, deck} = card;
        if(!id) console.log("no id found! takeFromDeck()");
        if(!deck) console.log("no deck found! takeFromDeck()");

        //Purpose: server update in anticipation of 'dissolve()'
        let otherCard;
        if(!deck.isHand && deck.images.length == 2) {
            //if 'card' is the 0th image, otherCard is [1]th. vice versa
            otherCard = card == deck.images[0] ? deck.images[1] : deck.images[0];
        }

        //deliberate use of 'id', in case other properties may differ
        let i = -1;
        while(deck.images[++i].id != card.id);
        if(i == deck.images.length) console.log("takeFromDeck: card was not found in deck!");

        //remove sole item
        let deleted = deck.images.splice(i, 1)[0];
        if(deleted == undefined){
            console.log("IMPORTANT: failure to remove card from deck!");
            console.log(deck);
            throw new Error("failure to decouple card from deck's collection!")
        };

        //set 'leavingDeck' defaults
        setCardDefaults(card);
        //TODO: deck view terminates as soon as we takeFrom
        if(!deck.browsing) deck.selected = 0;

        if(deck.images.length == 1) dissolveDeck(deck, false);

        //ref = visual interface (preview)
        if(deck.ref) {
            deck.ref.update();
        }

        //TODO- keep a "JSON.stringify, JSON.parse" fallback state for 'otherCard'
        //if parent still pending, add otherCard in fallback state as well
        let relevant = [card, deck];
        if(otherCard) relevant.push(otherCard);
        server.pushGameAction("takeFromDeck", relevant);
    }

    //used in takeFromDec, isMerging (optional param) from addToDeck
    function dissolveDeck(deck, isMerging) {
        if(deck.isHand) return; //exception
        if(!isMerging) {
            let card = deck.images[0];
            setCardDefaults(card);
        }

        //purge: for server/multiplayer deletion filters
        deck.images = [];

        //remove from references
        items.decks.splice(items.decks.findIndex((entry) => entry == deck), 1);
        quickRef[deck.id] = null; //or undefined

        //update UI if linked
        let view = userInterface.preview.getView();
        if(view && view.id == deck.id) selectView();
    }

    //NOTE: deck.coord == undefined/null, set according to offset/mouse is on 'setStart()'
    //expected: prototypal 'hand' has no use for coord property; handled in setStart()
    function setCardDefaults(card) {
        let x, y;
        if(!card.deck.coord) {
            x = 0;
            y = 0;
        } else {
            ({x, y} = card.deck.coord);
        }

        card.coord = {x, y};
        card.disabled = false; //visuals,touch
        if(card.deck.isHand) {
            card.index = assets.backImg;
        }
//        delete card.deck;
        card.deck = 0; //falsy
    }

    function selectView(deck) {

        //Validate: purge view if null, invalid type, in-use, or same object
        const current = userInterface.preview.getView();

        //for interaction with "pingItemToChat"
        let changeMade = false;

        if(current) {
            deselectView();
            changeMade = true;
        }

        if(!deck || !deck.deck) return changeMade;        //null item
        if(!deck.isDeck) deck = deck.deck;  //is a card, retrieve its deck

        //is current OR already in use by someone else
        if(current == deck || (deck.selected && deck.selected != clientUser.id) ) {
            //Note: if not selected, selected == 0 == falsy
            return changeMade;
        };

        //item is in fact, a CARD representing a deck on HTMLCanvasElement
        if(Object.hasOwn(deck, "deck") && deck.deck.isDeck) {
            deck = deck.deck;
        } else if(!deck.isDeck){
            return changeMade;
        }

        deck.browsing = clientUser.id;

        select(deck, clientUser);
        userInterface.preview.setView(deck);

        server.pushGameAction("selectView", deck);

        changeMade = true;

        return changeMade;
    }

    function deselectView() {

        //revert properties
        const preview = userInterface.preview;
        const cardModel = preview.cardModel;

        //deselect() requires .browsing to be false to work
        cardModel.browsing = 0;
        deselect(cardModel);

        //decouple
        preview.setView();

        server.pushGameAction("deselectView", cardModel);
    }

    //purpose: at end of dragging, on mouseup, to keep cards within boundaries
    function correctCoords(items, itemFocus) {

        //consolidate itemFocus if applicable
        if(!Array.isArray(items)) items = new Array(items);
        if(itemFocus && !items.includes(itemFocus)) items.push(itemFocus);

        let { leftBorder: minX, rightBorder: maxX, topBorder: minY, bottomBorder: maxY} = assets.dimensions;

        items.forEach((item) => {
            if(item.disabled) return; //no need to render
            switch(item.flipMe) {
                case 1:
                case 3:
                    item.coord.x = Math.max(Math.min(maxX - (item.height/2 + item.width/2), item.coord.x),
                        minX - (- item.height/2 + item.width/2));
                    item.coord.y = Math.max(Math.min(maxY - (item.height/2 + item.width/2), item.coord.y),
                        minY - (item.height/2 - item.width/2));
                    break;
                default: //case 0,2
                    item.coord.x = Math.max(Math.min(maxX - item.width, item.coord.x), minX);
                    item.coord.y = Math.max(Math.min(maxY - item.height, item.coord.y), minY);
                    break;
            }
        });
    }

    //'tap' to rotate by 90*, or 0.5*pi-radians
    //NOTE: as rendered from player hand, 3and1 share the other's render
    function tapItem(items, value) {
        if(!items) return;
        if(!Array.isArray(items)) items = new Array(items);

        let changes = new Set();

        items.forEach((item) => {
            if(item.anchored) return;
            if(Object.hasOwn(item, "flipMe")) {

                changes.add(item);

                if(value != undefined) {
                    item.flipMe = value;
                    return;
                }

                if(item.flipMe == 0) {
                    item.flipMe = 3;
                } else {
                    item.flipMe--;
                }
            }
        });

        correctCoords(new Array(...changes));

        server.pushGameAction("tapItem", new Array(...changes));
    }

    //Purpose: mousehover + button will anchor/unanchor item, allowing it to be dragged and selected
    //TODO- determine if 'anchored' means cannot me imageCycle()'d; ask clientelle
    function anchorItem(items) {
        if(!items) return;
        if(!Array.isArray(items)) items = new Array(items);

        //Purpose: server update
        let relevant = [];

        items.forEach((item) => {
            //Whitelist: ["Card", "Leader", "Monster"]
            if(!item.id || item.isDeck || item.deck || typeWhiteList.includes(item.type)) return;
            if(item.anchored) {
                item.anchored = false;
            } else {
                item.anchored = true; //the value does not matter
            }
            relevant.push(item);
        });

        if(relevant.length == 0) return;

        //purge selection (index.js) after
        server.pushGameAction("anchorItem", relevant);
    }

    function initializeUser() {
        //check storage for existing unique id, regardless, store this;
        let id = Number(localStorage.getItem("id"));
        if(!id) {
            id = Date.now();
            localStorage.setItem("id", id);
        };

        clientUser.id = id;
        clientUser.position = 0; //purposes of myHand default, card rotation

        addPlayer(clientUser);

        initializeBoardInterface(clientUser);

        //return user
        return clientUser;
    }

    //purpose: store helper functions, like 'pulseRedraw' of index.js
    let redraw = { triggerRedraw: function() {}};

    //Purpose: testing; iterate through all gameObjects and print out via hard-coded filters
    function logBrokenItems() {
        //TODO
        //decks, !isHand, with 1 or less cards DONE
        //cards where !card.deck, but SOME deck.images() contains card aka ghost card copy DONE
        //cards where (disabled) && !card.deck aka sent to the void
        //null items DONE
        //null id

        let allDecks = new Array(...items.decks); //include hands
        players.values().forEach((player) => allDecks.push(player.hand));

        let deckSizes = []; //decks with weird sizes
        let ghostCopiesDecks = []; //entries: [deck, card]; !card.deck but deck has this card in its .images[]
        let decksWithNullEntries = new Set();

        let nullCardCount = 0;
        let nullDeckCount = 0;

        allDecks.forEach((deck) => {
            if(!deck) {
                nullDeckCount++;
                return;
            }
            if(!deck.isHand && deck.images.length <= 1) deckSizes.push(deck);
            deck.images.forEach((entry) => {
                if(!entry) {
                    decksWithNullEntries.add(deck);
                    return;
                }
                if(!entry.deck || entry.deck.id != deck.id) ghostCopiesDecks.push([deck, entry]);
            });
        });

        let cookedCards = new Set();
        items.cards.forEach((card) => {
            if(!card) {
                nullCardCount++;
                return;
            }
            if(!card.coord && (!card.disabled || !card.deck)) cookedCards.add(card);
            if(card.disabled && !card.deck) cookedCards.add(card);
        });

        console.log("Decks with weird sizes:");
        console.log(...deckSizes);
        console.log("Decks/hands holding 'ghost' copies of cards:");
        console.log(...ghostCopiesDecks);
        console.log("Decks with null entries:");
        console.log(...decksWithNullEntries);

        console.log(`We found ${nullDeckCount} 'null' decks, ${nullCardCount} 'null' cards in gameState.`);
    }

    //purpose: print object to chat
    //current use: ping single rightclick to chat, then echo to server
    function pingItemToChat(object) {
        if(!object) return;
        if(object instanceof HTMLImageElement && object.card) object = object.card;
        if(!object.type || !typeWhiteList.includes(object.type)) return;

        //if deck,
        if(object.isDeck) {
            //check: images property, top (first entry) is not falsy, is faceup
            if(!object.browsing && object.images && object.images[0]) {
                object = object.images[0];
            } else {
                return;
            }
        }

        //is facedown in Canvas; (if not canvas, is preview or hand. allowed)
        if(object.index != assets.frontImg && hoverIsCanvas()) {
            return;
        }

        userInterface.chatBox.pingItemToChat(object);
    }

    //purpose: return array if the reference items using quickref
    //current uses: convert JSON card items from server into real ref for chat
    function findItems(fakeItems) {
        let realItems = [];
        fakeItems.forEach((item)=>{
            realItems.push(quickRef[item.id]);
        });

        return realItems;
    }

    //Purpose: handle gameActions that may need 'server permission' to process
    //detail: special game actions can afford to check in with server before processing, to prevent race condition
    //Projected use: selectView(),
    //NOTE: if funcArgs is more than one value, use spread annotation "...funcArgs"
    function permission(func, ...funcArgs) {
        let soleItem = funcArgs[0]; //assuming it's a single item for now- temp
        //unfortunate 'duplicate' validations
        if(!soleItem || !soleItem.id) return func(...funcArgs);
        if(soleItem.deck) soleItem = soleItem.deck;  //is a card, retrieve its deck
        if(!soleItem.isDeck) return func(...funcArgs); //for purposes assuming 'selectView(deck)'

        //TODO future- ensure not incorporated with pending unconfirmed server request 'fallbackState'
        if(soleItem.selected == clientUser.id || soleItem.browsing == clientUser.id) {
            //Immediately process
//            console.log("process immediately!! gameState");
            func(...funcArgs);
            return;
        } else if(!soleItem.selected && !soleItem.browsing) {
            //Send to serverConnection to further process
            server.permission(func, funcArgs, [soleItem]);
        } else {
//            console.log("processing scrapped!");
        }
    }

    //purpose: return string that confirms state of transfer- invalid, no user found, invalid user,
    function giveRandom(usernameString) {
        if(!usernameString) {
            return "/gr <target-user>";
        }

        //validate client hand is not empty
        if(clientUser.hand.images.length == 0) {
            return `You have no cards to give away!`;
        }

        //validate user !!assuming only one user matches
        let user;
        let selfFound = false;
        players.forEach((value, key, map) => {
            if(value.name.toUpperCase() == usernameString.toUpperCase()) {
                if(value == clientUser) {
                    selfFound = true;
                } else {
                    user = value;
                }
            }
        });

        //If self.name and target.name is the same, prioritizes target.name
        if(!user) {
            if(selfFound) return `Target user cannot be yourself.`;
            return `User "${usernameString}" not found.`;
        }

        //call function -- assume it always goes through
        let cards = clientUser.hand.images;
        let randomCard = cards[Math.floor(Math.random() * cards.length)];

        if(!randomCard) return "randomly chosen card is falsy!";

        takeFromDeck(randomCard);
        addToDeck(randomCard, user.hand);
        //return users + card
        return [randomCard, user]; //"Success" state
    }
    //if successful, return card object; else return string
    //processing will take this response and format appropriately + send to server to ping all relevant
    //likely return: boolean success, corresponding recipient id, card at random, chat partial string message

    return {
        getID,
        idToRGB,
        itemFromRGB,
        items,
        addPlayer,
        removePlayer,
        push,
        select,
        selected,
        deselect,
        cycleImage,
        dragItems,
        drawItems,
        getImage,
        loadBoard,
        rebuildBoard,
        updateItems,
        purgeHoverItem,
        startPoint,
        offset,
        hoverIsCanvas,
        addToDeck,
        selectView,
        translateDimensions,
        correctCoords,
        tapItem,
        anchorItem,
        initializeUser,
        clientUser,
        frontPage,
        redraw,
        logBrokenItems,
        pingItemToChat,
        findItems,
        changeUserName,
        changeUserColor,
        updatePlayer,
        permission,
        rerollUser,
        giveRandom,
        getPlayer
    };
})();

export default gameState;