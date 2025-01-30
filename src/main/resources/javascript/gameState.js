import {assets} from "./assets.js";
import {loadCards, loadMisc, deckify} from "./itemFactory.js";

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
        color: "white",
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
//                    console.log("hovering a deck!");
                    let deck = item;
                    item = item.images[0]; //top of deck
                    //!item.deck here moved to itemFactory, for purposes of deck/hand
//                    item.deck = deck; //for onDrag decoupling
//                    console.log("top of deck spotted");
                }
//                else {
//                    console.log("hovering a card!");
//                }
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

        let size = items.length;
        items.forEach((item) => {
            //TODO: ask server for permission; if denied, do not add to 'selected'
            item.selected = user.id;

            //TODO - try make this work
            //additional: if 'topcard' was selected,
            //the deck will visually be selected
            if(item.deck) {
                item.deck.selected = user.id;

                //purpose: determine if using deck coords for dragStart
                item.useDeckCoords = hoverIsCanvas;
            }

//                        setEnableItems(item, user.id);
        });
    }

    function deselect(items) {
        if(!Array.isArray(items)) items = new Array(items);
        if(items[0] == undefined) return;
        items.forEach((item) => {
            //TODO: notify server release of 'lock';
            item.selected = false;
//            setEnableItems(item, true);

            //additional: if 'topcard' was selected,
            //the deck will visually be selected
            if(item.deck) {
                item.deck.selected = false;
                delete item.useDeckCoords;
            }

        });
    }

    //TODO: replace to 'tap' binary 0* rotation or 90*
    function flip(items) {
        if(!Array.isArray(items)) items = new Array(items);
        items.forEach((item) => item.flipped = !item.flipped);
        return items[0].flipped;
    }

    //for performing accurate to mouse-position drags
    //in and out of hands/decks/non-canvas-elements
    let startPoint;
    let offset;
    let imageScale; //e.g. purposes of translating offset to card size

    //private function - track relative start, for item dragging tracking
    //TODO- if card is inside a deck, read mouse offset

    let hoverIsCanvas = true;

    function setStart(items) {
        items.forEach((item) => {
            if(item.deck) {

                if(item.useDeckCoords) {
                    item.dragStart.x = item.deck.getX();
                    item.dragStart.y = item.deck.getY();
                } else {
                    //TODO- use mouse/screen translated values
                    console.log("oh naur");
                    item.dragStart.x = 0;
                    item.dragStart.y = 0;
                }

                //then remove from deck
                takeFromDeck(item);

            } else {
                //TODO-refactor? .getX() on a deck-removed item refers to original, primitive coord
                //drag from deck- works fine. when using .getX/Y(), future dragStarts zip to primitive

                item.dragStart.x = item.coord.x;
                item.dragStart.y = item.coord.y;
            }

        });
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

    let selectedTypes = new Set();
    function dragItems(dx, dy, dragItem, correct, hoverObject, itemFocus) {
        if(!Array.isArray(dragItem)) dragItem = new Array(dragItem);

        //is often null
        //TODO - important testing
        //TODO NOTE: causes lots of lag
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
//            console.log("aaaaah!");
//            purgeHoverItem();
////            hoverItem.
////
            hoverItem = hoverObject;
//
//            //validate - if deck + correct types, set visual
//
//            //Keep it simple - if itemFocus is same type, then trigger
//            if(itemFocus.type == hoverItem.type) {
//                if(hoverItem.isDeck) {
//                    hoverItem.specialHover = true;
//                }
//                hoverCompatible = true;
//                hoverItem.selected = clientUser.id;
//            }

            if(hoverItem == null || !validHover.has(hoverObject.type) || !selectedTypes.has(hoverItem.type)) {
                hoverCompatible = false;
                console.log("incompatible!");
            } else {
                hoverCompatible = true;
                console.log("compatible!");
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
//            return item.getImage();
            const card = item.images[0];
            return card.images[card.index];
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
    function drawItems(dragging, visual, interactive) {

        for (const [type, list] of Object.entries(items)) {

            list.forEach((item) => {
                if(item.disabled) return;

                let x = item.coord.x;
                let y = item.coord.y;
                let width = item.width;
                let height = item.height;

                if(item.selected) {
                    //server-wide clarity

                    visual.shadowColor = "white";
                    visual.shadowBlur = 25;
                } else {
                    visual.shadowBlur = 0;
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

        items.decks.forEach((deck) => {
            let {x, y} = deck.coord;

            if(deck.selected) {

                visual.shadowColor = "white";
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

        //for now is load 'tapIcon'- separate from 'float' the visual tokens to the front
        //TODO - in the future, use this to load.. other visual tokens as well?
        for (const [type, list] of Object.entries(items)) {

            list.forEach((item) => {
                if(!item.selected || item.disabled) return;

                //TODO - include path for when 'hoverCompatible = true'
                //+special route for hoverItem
                let { x, y } = item.coord;
                let { width, height } = item;

                let img;
                if(!hoverCompatible || item == hoverItem) {
                    img = assets.tapIcon;
                } else if (item.type == hoverItem.type) {
                    img = assets.moveTo;
                } else {
                    img = assets.no;
                }

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

        if(hoverCompatible && !hoverItem.selected) {
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
//
//        console.log(items);
//        console.log(items.cards);
    }

    //TODO - checks 'persist' storage if gameState 'items' already exists to load from
    function loadBoard(expansions) {
        //todo - from objectFactory, in conjunction with assets - hard coded set of objects - mats, dice
        console.log(loadMisc());
        loadMisc().forEach((misc)=> push(misc));

        let freshCards = loadCards(expansions);

        //push cards into gamestate
        for(const value of Object.values(freshCards)) {
            value.forEach((item) => push(item));
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
            push(deckify(value));
        }

        items.decks.forEach(deck => deck.shuffle());

        //TODO: set up player hand (starts empty)

        //then, finally load in cards?
    }

    //returns true: method was successful, proceed to purge selected (index.js)
    //returns false: "" unsuccessful after 'mouseUp' + 'isDragging'; do not purge
    //"index" - is nullable, provided when dragged into specific deck/hand preview index;
    function addToDeck(donor, recipient, index) {
        //TODO- 'hoverElement' is recipient, else find a way to set hoverElement to 'hand'; likely in index.js
        //TODO- find out if 'lock' is important for race conditions

        //TODO- console: reason for failure, for clarity

        if(!Array.isArray(donor)) donor = new Array(donor);
        if(donor.includes(recipient) || recipient == null) {
            console.log(`addToDeck error: '${recipient}' null or included in donors`);
            return false;
        }

        if(recipient.deck) {
            recipient = recipient.deck;
        } else if (recipient.disabled) {
            console.log(`addToDeck error: '${recipient}' is touch/vis disabled`);
            return;
        }

        //Collate all 'images' of correct type
        const type = recipient.type;
        const typeWhiteList = ["Card", "Leader", "Monster"];
        if(!typeWhiteList.includes(type)) return false;

        let donorCards = [];

        donor.forEach((item) => {
            //filter
            if(item.type != type) return;

            if(item.isDeck) {
                item.images.forEach((card) => donorCards.push(card));
                dissolveDeck(item, true);
            } else {
                donorCards.push(item);
            }
        });

        //no type matches
        if(donorCards.length == 0) return false;

        //!isDeck only happens in Canvas interaction, no index
        if(!recipient.isDeck) {
            push(deckify(donorCards, recipient));
            return true;
        }

        donorCards.forEach((card) => {
            card.deck = recipient;
            card.coord = recipient.coord;
            card.disabled = true;
        });

        //canvas interaction, add all to 'top of deck(aka recipient)'
        if(index == undefined) {
            //x.concat(y) adds array 'y' to the bottom
            recipient.images = donorCards.concat(recipient.images);
            return true;
        }

        //TODO - index specific arrangement; low priority?
        //is this what i'll be using when i clickDrag/rearrange from a hand/deck?

        return false;
    }

    //to only trigger where, onDragStart, a card.disabled = true was  found
    //TODO future - have 'takeFromHand' (random) take a 'hand' object,
    //TODO future cont. - generate random index 1-n, then pass said
    //TODO future cont. cont. - card object into takeFromDeck (here)
    //actually, [random] likely just self inserts into calling person
    //'s hand
    function takeFromDeck(card) {
        console.log("took from deck");
        let {id, deck} = card;
        if(!id) console.log("no id found! takeFromDeck()");
        if(!deck) console.log("no deck found! takeFromDeck()");

        //deliberate use of 'id', in case other properties may differ
        let i = -1;
        while(deck.images[++i].id != card.id);
        if(i == deck.images.length) console.log("oops, not found! takeFromDeck()");

        //remove sole item
        deck.images.splice(i, 1);

        //set 'leavingDeck' defaults
        setCardDefaults(card);
        //TODO- special hover (deck VIEW still open) == keep deck selected
        //OR: deck view terminates as soon as we takeFrom
        deck.selected = false;

        if(deck.images.length == 1) dissolveDeck(deck, false);

//        //to test
//        console.log(card);
    }

    //used in takeFromDec, addToDeck (optional param)
    function dissolveDeck(deck, isMerging) {
        console.log("dissolve!");
        if(!isMerging) {
            let card = deck.images[0];
            setCardDefaults(card);
        }
        items.decks.splice(items.decks.findIndex((entry) => entry == deck), 1);
    }

    function setCardDefaults(card) {
        let { x, y } = card.deck.coord; //inherit coords, but as a new, unique object

        card.coord = {x, y};
        card.disabled = false; //visuals,touch
        delete card.useDeckCoords; //ancillary property
        delete card.deck; //ties
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
        loadBoard,
        purgeHoverItem,
        startPoint,
        offset,
        hoverIsCanvas,
        addToDeck
    };
})();

export default gameState;