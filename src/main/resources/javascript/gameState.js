import {assets, sizes} from "./assets.js";
import {loadCards, loadMisc, deckify} from "./itemFactory.js";
import {userInterface} from "./boardInterface.js";

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
            if(item.deck && item.deck.browsing && hoverIsCanvas()) {
                //reject if onCanvas, taking from deck being browsed
                console.log(`select() rejected: object is being browsed`);
                return;
            }
            //TODO: ask server for permission; if denied, do not add to 'selected'
            item.selected = user.id;

            if(item.deck) {
                item.deck.selected = user.id;
            }

            if(item.deck && !hoverIsCanvas()) {
                if(Object.hasOwn(item, "ref")) item.ref.select();
            }
        });
    }

    function deselect(items) {
        if(!Array.isArray(items)) items = new Array(items);
        if(items[0] == undefined) return;

        let cardHolders = [];

        items.forEach((item) => {
            if(item.isDeck && item.browsing) return;

            //TODO: notify server release of 'lock';
            item.selected = false;

            if(!item.deck) return;

            //additional: if 'topcard' was selected,
            //the deck will visually be selected
            if(!item.deck.browsing) {
                item.deck.selected = false;
            }

            if(!hoverIsCanvas() && Object.hasOwn(item, "ref")) {
                item.ref.deselect();
            }

            if(item.deck.ref) {
                cardHolders.push(item.deck.ref);
            }

        });

        //fixes visual: selected previewItem remains selected when moving back to canvas
        cardHolders.forEach((ref) => ref.update());
    }

    //TODO: replace to 'tap' binary 0* rotation or 90*
    function flip(items) {
        if(!Array.isArray(items)) items = new Array(items);
        items.forEach((item) => item.flipped = !item.flipped);
        return items[0].flipped;
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
                && Object.hasOwn(item.deck, "getX")) {
                    item.dragStart.x = item.deck.getX();
                    item.dragStart.y = item.deck.getY();
                } else {
                    //Purpose: dragging from Hand or Preview (nonCanvas)
                    fromDeckCards.push(item);
                    item.flipMe = clientUser.position;

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

            hoverItem = hoverObject;

            if(hoverItem == null || !validHover.has(hoverObject.type) || !selectedTypes.has(hoverItem.type)) {
                hoverCompatible = false;
//                console.log("incompatible!");
            } else {
                hoverCompatible = true;
//                console.log("compatible!");
            }
        }

        dragItem.forEach((item) => {
            if(!item.selected) return;
            item.coord.x = dx + item.dragStart.x;
            item.coord.y = dy + item.dragStart.y;
        });
    }

    function getImage(item) {
        if(!item || (!item.index && item.index != 0)) return;
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
            if(!item.id) return;

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
                    color = players.get(item.selected).color || 'white';
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
                color = players.get(deck.selected).color || 'white';
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
                visual.fillStyle = players.get(item.selected || item.browsing)["color"];
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
//
//        console.log(items);
//        console.log(items.cards);
    }

    //TODO - checks 'persist' storage if gameState 'items' already exists to load from
    function loadBoard(expansions) {
        //todo - from objectFactory, in conjunction with assets - hard coded set of objects - mats, dice
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
        const typeWhiteList = ["Card", "Leader", "Monster"];
        if(!typeWhiteList.includes(type)) return false;

        let donorCards = [];

        donor.forEach((item) => {
            //filter
            if(item.type != type || item.browsing) return;

            if(item.isDeck) {
                item.images.forEach((card) => donorCards.push(card));
                dissolveDeck(item, true);
            //checks if item is already in; prevents duplicates
            } else if (!recipient.images.includes(item)){
                donorCards.push(item);
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

        recipient.images.splice(index, 0, ...donorCards)

        if(recipient.ref) recipient.ref.update();

        return true;
    }

    //to only trigger where, onDragStart, a card.disabled = true was  found
    //TODO future - have 'takeFromHand' (random) take a 'hand' object,
    //TODO future cont. - generate random index 1-n, then pass said
    //TODO future cont. cont. - card object into takeFromDeck (here)
    //actually, [random] likely just self inserts into calling person
    //'s hand
    function takeFromDeck(card) {
//        console.log("took from deck");
        let {id, deck} = card;
        if(!id) console.log("no id found! takeFromDeck()");
        if(!deck) console.log("no deck found! takeFromDeck()");

        //deliberate use of 'id', in case other properties may differ
        let i = -1;
        while(deck.images[++i].id != card.id);
        if(i == deck.images.length) console.log("takeFromDeck: card was not found in deck!");

        //remove sole item
        deck.images.splice(i, 1);

        //set 'leavingDeck' defaults
        setCardDefaults(card);
        //TODO: deck view terminates as soon as we takeFrom
        if(!deck.browsing) deck.selected = false;

        if(deck.images.length == 1) dissolveDeck(deck, false);

        //ref = visual interface (preview)
        if(deck.ref) {
            deck.ref.update();
        }
    }

    //used in takeFromDec, isMerging (optional param) from addToDeck
    function dissolveDeck(deck, isMerging) {
        if(deck.isHand) return; //exception
        if(!isMerging) {
            let card = deck.images[0];
            setCardDefaults(card);
        }
        items.decks.splice(items.decks.findIndex((entry) => entry == deck), 1);

        if(userInterface.preview.getView() == deck) selectView();
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
        delete card.deck;
    }

    function selectView(deck) {

        //Validate: purge view if null, invalid type, in-use, or same object
        const current = userInterface.preview.getView();
        if(current) {
            deselectView();
        }

        //TODO- TBD: if, as currently implemented, will prevent me from selecting a deck someone has .selected
        //null item, not a deck, is the same (deselect, above)
        if(!deck || current == deck || current == deck.deck || (deck.selected && deck.selected != clientUser.id)){
            //Note: if not selected, selected == false
            return;
        };

        //item is in fact, a CARD representing a deck on HTMLCanvasElement
        if(Object.hasOwn(deck, "deck") && deck.deck.isDeck) {
            deck = deck.deck;
        } else if(!deck.isDeck){
            return;
        }

        deck.browsing = clientUser.id;

        select(deck, clientUser);
        userInterface.preview.setView(deck);
    }

    function deselectView() {

        //revert properties
        const preview = userInterface.preview;
        const cardModel = preview.cardModel;

        //deselect() requires .browsing to be false to work
        cardModel.browsing = false;
        deselect(cardModel);

        //decouple
        preview.setView();
    }

    //purpose: at end of dragging, on mouseup, to keep cards within boundaries
    function correctCoords(items, itemFocus) {
        if(itemFocus && Object.hasOwn(itemFocus, "anchored")) itemFocus = null;

        //consolidate itemFocus if applicable
        if(itemFocus && !items.includes(itemFocus)) items.push(itemFocus);

        let { leftBorder: minX, rightBorder: maxX, topBorder: minY, bottomBorder: maxY} = assets.dimensions;

        items.forEach((item) => {
            item.coord.x = Math.max(Math.min(maxX - item.width, item.coord.x), minX);
            item.coord.y = Math.max(Math.min(maxY - item.height, item.coord.y), minY);
        });
    }

    //'tap' to rotate by 90*, or 0.5*pi-radians
    //NOTE: as rendered from player hand, 3and1 share the other's render
    function tapItem(items) {
        if(!items) return;
        if(!Array.isArray(items)) items = new Array(items);

        items.forEach((item) => {
            if(Object.hasOwn(item, "flipMe")) {
                if(item.flipMe == 0) {
                    item.flipMe = 3;
                } else {
                    item.flipMe--;
                }
            }
        });
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
        addToDeck,
        selectView,
        translateDimensions,
        correctCoords,
        tapItem
    };
})();

export default gameState;