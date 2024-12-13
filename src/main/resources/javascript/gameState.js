import {assets, directoryTest} from "./assets.js";
import {loadCards, loadMisc} from "./itemFactory.js";

const gameState = (function() {
    //in order to render
    const items = {
        playMats: [],
        decks: [], //decks and cards could be merged;
        cards: [],
        tokens: [], //dice, etc
        players: [] //mouse, etc
    };

    const players = new Map();
    let clientUser = {
        id: "0",
        color: "black",
        name: "default"
    };

    let itemCount = 0;

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
        clientUser = user;
    }

    //on disconnect, 'deactivate' player? - set all 'selected' on player to null
    function removePlayer(user) {
//        players.push(user);
        //TODO
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
//                    item.deck = deck; //for onDrag decoupling
//                    console.log("top of deck spotted");
                }
                return item;
            };
        }
        return null;
    }


    //turn to array input at some stage, for sake of 'deck'
    function push(item) {
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
                    gameState.items.cards = original;
                    break;
                case "playMat":
                case "gameMat":
                    gameState.items.playMats = original;
                    break;
                case "deck":
                    gameState.items.decks = original;
                    break;
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
        items.forEach((item) => {
            //TODO: ask server for permission; if denied, do not add to 'selected'
            item.selected = user.id;

            //TODO - try make this work
            //additional: if 'topcard' was selected,
            //the deck will visually be selected
//            if(item.deck) item.deck.selected = user.id;
//            if(item.deck) console.log(item.deck);



            //            setEnableItems(item, user.id);
        });
    }

    function deselect(items) {
        if(!Array.isArray(items)) items = new Array(items);
        if(items[0] == undefined) return;
        items.forEach((item) => {
            //TODO: notify server release of 'lock';
            item.selected = false;
            console.log(item.selected);
//            setEnableItems(item, true);

            //additional: if 'topcard' was selected,
            //the deck will visually be selected
//            if(item.deck) {
//                item.deck.selected = false;
//                console.log(item.deck.selected);
//            }
        });
    }

    //TODO: replace to 'tap' binary 0* rotation or 90*
    function flip(items) {
        if(!Array.isArray(items)) items = new Array(items);
        items.forEach((item) => item.flipped = !item.flipped);
        return items[0].flipped;
    }

    //private function - track relative start, for item dragging tracking
    function setStart(items) {
        items.forEach((item) => {
            item.dragStart.x = item.getX();
            item.dragStart.y = item.getY();
        });
    }

    //relies on querying server for permission to lock the card, property: "enabled"
    function setEnableItems(items, boolean) {
        if(!Array.isArray(items)) items = new Array(items);
        //'true' allows 'touch' to be drawn
        //'false' disallows this
        items.forEach((item) => {
            item.enabled = boolean;
        });

        //Uses: onDragStart, onDragEnd
        //application - items being dragged are
    }

    //purpose: tracking if we changed objects
    let hoverItem = null;
    //track if type is compatible, between drag + draw methods
    let hoverCompatible = false;

    function purgeHoverItem() {
        if(hoverItem == null) return;
        console.log(hoverItem + ` oh my god`);

        //set default
        if(hoverItem.isDeck) {
            deck.specialHover = false;
        }

        hoverItem.selected = false;
        hoverItem = null;
        hoverCompatible = false;
    }

    function dragItems(dx, dy, dragItem, correct, hoverObject, itemFocus) {
        if(!Array.isArray(dragItem)) dragItem = new Array(dragItem);

        //is often null
        console.log(hoverObject);

        //onDragStart, each item's relative start point must be recorded
        if(!correct) {
            //as well as, for cards on top of deck to 'detach'
//            items.forEach((item) => {
//                if(item.deck) {
                    //TODO- will have to base coordinates based off mouse
                    //example: dragging from deck(viewDiv)/viewHand
//                    takeFromTop(item.deck);
//                    deselect(item.deck);
//                    delete item.deck; //fully decouple
//                }
//            });

            //TODO - temporary attempt - free the card from the deck
//            dragItems.forEach((card) => card.enabled = true); // set all drag
//            //currently placeholder for 'in a deck'
//            items.decks.forEach((deck) => {
//                deck.images.forEach((card) => {
//                    if(card.enabled) {
////                        takeFromTop(deck);
//                        //temporary, set coords off deck
//                        card.coord = deck.coord;
//                    }
//                });
//            });//if set, take top off;

            setStart(dragItem);
            forward(dragItem);
            //we want other users still able to hover for "tooltip" on an item someone is
            //actidragItems dragging - no additional
        }

        //TODO - get 'selected' from server if valid
        //TODO - purge 'selected'
        //no longer the same, default, then reassign
        if(hoverObject != null && hoverItem != hoverObject) {

            purgeHoverItem();
//            hoverItem.

            console.log(hoverItem);

            hoverItem = hoverObject;

            //validate - if deck + correct types, set visual

            //Keep it simple - if itemFocus is same type, then trigger
            if(itemFocus.type == hoverItem.type) {
                if(hoverItem.isDeck) {
                    hoverItem.specialHover = true;
                }
                hoverCompatible = true;
                hoverItem.selected = clientUser.id;
            }
        }

        dragItem.forEach((item) => {
            item.coord.x = dx + item.dragStart.x;
            item.coord.y = dy + item.dragStart.y;
        });
    }

    function getImage(item) {
        if(item == undefined) console.log("undefined?");
        if(item.isDeck) {
            return item.getImage();
        }

        return item.images[item.index];

        //TODO: to become item.getImage() under 'genericFactory'
    }

    //to replace 'flip' function
    function cycleImage(items, modifier) {
        if(!Array.isArray(items)) items = new Array(items);

        items.forEach((item) => {
            //TODO - to be made item.cycleImage(mod);
            //default increments +1
            if(!modifier) {
                item.index++;
                item.index %= item.images.length;
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

    }

    //'selected' for clarity, (game-wide)
    //'focus' and 'dragging' (client-side) for drag-to-deck functionality
//    function drawItems(focus, dragging, visual, interactive) {
    //TODO - special draw for 'deck' (dongle) and 'topOfDeck'
    function drawItems(dragging, visual, interactive) {

        for (const [type, list] of Object.entries(items)) {

            list.forEach((item) => {
                if(!item.enabled) return;

                let x = item.coord.x;
                let y = item.coord.y;
                let width = item.width;
                let height = item.height;

                //fill the visual
                //**decks will require additional
                if(item.selected) {
                    //server-wide clarity

                    //Note: currently disabled due to 'clip()'
                    visual.shadowColor = "white";
                    visual.shadowBlur = 25;
                } else {
                    visual.shadowBlur = 0;
                }

                //TODO: extra deck 'dongle'
                if(item.isDeck) {
                    visual.fillStyle = "grey";
                    visual.beginPath();
                    visual.arc(x, y, 40, 0, 2 * Math.PI);
                    visual.fill();
                    visual.fillStyle = "black"; //set to default

//                    console.log(item.fillStyle);
                    interactive.fillStyle = item.touchStyle;
                    interactive.beginPath();
                    interactive.arc(x, y, 40, 0, 2 * Math.PI);
                    interactive.fill();
                    interactive.fillStyle = "black"; //set to default
                }

                //purpose: allow client to see hover 'below' whilst mid-drag
                if(item.selected && dragging) {
                    //do not render touch
                } else {
                    interactive.save();

                    interactive.roundedImage(x, y, width, height);

                    //purpose: to detect 'TopOfCard'
                    if(item.isDeck) {
                        interactive.fillStyle = idToRGB(item.id, true);
                    } else {
                        interactive.fillStyle = item.touchStyle;
                    }

                    interactive.fillRect(x , y, width, height);
                    interactive.fill();

                    interactive.restore();
                }

                let itemImg = getImage(item);
                if(itemImg instanceof HTMLImageElement) {
//                    if(item.type == "deck") {
//                        console.log(`ohhh mama ${x} ${y} ${itemImg}
//                        ${width} ${height}`);
//                    }

                    //Make rounded
                    visual.save();

                    visual.roundedImage(x, y, width, height);
                    visual.clip();

                    visual.drawImage(itemImg, x, y, itemImg.width, itemImg.height);

                    visual.restore();
                } else {
                    console.log("error!");
                }

            });
        }

        //for now is load 'tapIcon'- separate from 'float' the visual tokens to the front
        //TODO - in the future, use this to load.. other visual tokens as well?
        for (const [type, list] of Object.entries(items)) {

            list.forEach((item) => {
                if(!item.selected || !item.enabled) return;

                //TODO - include path for when 'hoverCompatible = true'
                //+special route for hoverItem
                let { x, y } = item.coord;
                let width = item.width;
                let height = item.height;

                let img;
//                if(hoverItem != null && item.type == hoverItem.type) {
//                    img = assets.deckIcon;
//                } else {
                    img = assets.tapIcon;
//                }

                visual.save();

                visual.filter = "blur(10px)";
                visual.fillStyle = players.get(item.selected)["color"];
                visual.beginPath();
                visual.arc(x + width/2, y + height/2, img.height/2,//radius
                    0, 2* Math.PI);
                visual.fill();

                visual.restore();

                visual.drawImage(img, x + width/2 - img.width/2,
                    y + height/2 - img.height/2);
            });
        }
    }

    //TODO - checks 'persist' storage if gameState 'items' already exists to load from
    function loadBoard(expansions) {
        //todo - from objectFactory, in conjunction with assets - hard coded set of objects - mats, dice
        console.log(loadMisc());
        loadMisc().forEach((misc)=> push(misc));


        //todo - from objectFactory, in conjunction with assets
        let freshCards = loadCards(expansions);

        //TODO take all items and 'push' to gameState
        for(const value of Object.values(freshCards)) {
            value.forEach((item) => push(item));
        }

        //then, finally load in cards?
    }

    //TODO - create decks dynamically
    //TODO - merge decks (incl non decks)-
    //restrict to all card types, and segragate
    function addToDeck(donor, recipient) {
        //if two decks merge, 'purge' one of them from gameState
        //check hoverObject (recipient) - turn into deck if necessary
        //check selected (donor) - turn into deck if necessary
    }

    //TODO see how this feels
    //to only trigger where, onDragStart, a card.enabled = false was  found
    //**only possible where itemFromRGB returns images[0] of a deck
    //TODO -- specific touch render + rework 'itemFromRGB', R G B, B = topOfCard boolean
    function takeFromTop(deck) {
//        let card = deck.images.splice(0, 1);
//        if (card.length == 0) console.log("error!");
//        setEnableItems(card, true);

        //TODO pending... more to do here? - if deck remaining only 1 card,
        //enable last card, card.coords=deck.coords, remove deck from gameState


        //temporary for now:
        let card = deck.images.splice(0,1);
        return card;
    }

    return {
        getID,
        idToRGB,
        itemFromRGB,
        items,
        addPlayer,
        removePlayer,
        push,
        select,
        deselect,
        flip,
        cycleImage,
        dragItems,
        drawItems,
        getImage,
        loadBoard
    };
})();

export default gameState;