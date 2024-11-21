import assets from "./assets.js";

const gameState = (function() {
    //in order to render
    const items = {
        playMats: [],
        decks: [], //decks and cards could be merged;
        cards: [],
        tokens: [], //dice, etc
        players: [] //mouse, etc
    };

    let itemCount = 0;

    function getID() {
        return ++itemCount;
    }

    //may be best for controller to hold
    function idToRGB(id) {
        let r = id % 255;
        id /= 255;
        let g = Math.floor(id%255);
        id /= 255;
        let b = Math.floor(id%255);
        return `rgb(${r} ${g} ${b} / 100%)`;
    }

    //may be best for controller to hold
    function rgbToID(r, g, b) {
        return r + g*255 + b*255*255;
    }

    //private, internal function
    function findItem(number, list) {
        //for each item, take its 'id' property, then compare with our value 'number'
        let item;
        if(item = list.find(({id}) => id === number)) {
            return item;
        }
    }

    //private, internal function
    function findList(type) {
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
                return null; //TODO handle error somehow
        }
    }

    //test works
    function findByRGB(r, g, b) {
        let id = r + g*255 + b*255*255;
        let item;
//        console.log("i'm beggin youUoUou");
        for(const [key, list] of Object.entries(items)) {
            if(item = findItem(id, list)) return item;
        }
    }

    //turn to array input at some stage, for sake of 'deck'
    function push(item) {
        return findList(item.type).push(item);
    }

    //to the end of list - accept an array
    function forward(items) {
        if(!Array.isArray(items)) items = new Array(items);
        let set = new Set(items); //faster .has()
        let checks = new Set();

        //check which lists we need to go over, prevent redundancy
        set.forEach((item) => checks.add(findList(item.type)));

        //for each list to be sifted
        checks.forEach((list) => {
            let original = []; //copy of original state
            let pop = []; //array to bring "forward"
//            console.log(list);

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

    function select(items) {
        if(!Array.isArray(items)) items = new Array(items);
        if(items[0] == undefined) return;
        items.forEach((item) => {
            item.selected = true;
            //TODO: ask server for permission; if denied, do not add to 'selected'
            setEnableItems(item, false);
        });
    }

    function deselect(items) {
        if(!Array.isArray(items)) items = new Array(items);
        if(items[0] == undefined) return;
        items.forEach((item) => {
            item.selected = false;
            //TODO: notify server release of 'lock';
            setEnableItems(item, true);
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
            item.dragStart.x = item.coord.x;
            item.dragStart.y = item.coord.y;
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

    function dragItems(dx, dy, items, correct) {
        if(!Array.isArray(items)) items = new Array(items);

        //onDragStart, each item's relative start point must be recorded
        if(!correct) {
            setStart(items);
            forward(items);
            //TODO: on drag start, prevent 'touch' from being rendered
            //actually... likely cancel. we want other users still able to hover for "tooltip"
//            setEnableItems(items, false);
        }

        items.forEach((item) => {
            item.coord.x = dx + item.dragStart.x;
            item.coord.y = dy + item.dragStart.y;
        });
    }

    function getImage(item) {
        if(item.type == "Deck") {
            item = item.cards.at(-1);
        }

        return item.images[item.index];
    }

    //to replace 'flip' function
    function cycleImage(items, modifier) {
        //negative sends the index back one, falsey/null increments+1, else index = modifier
        if(!Array.isArray(items)) items = new Array(items);

        items.forEach((item) => {
            if(!modifier) {
                item.index++;
                item.index %= item.images.length;
                return;
            }

            //catch all for greater negatives defaults to -1
            if(modifier <= -1) {
                if(--item.index < 0) item.index = item.images.length-1;
            } else {
                item.index = modifier;
                //error checking
                item.index %= item.images.length;
            }
        });

    }

    //'selected' for clarity, (game-wide)
    //'focus' and 'dragging' (client-side) for drag-to-deck functionality
    function drawItems(focus, dragging, visual, interactive) {
        for (const [type, list] of Object.entries(items)) {

            list.forEach((item) => {
//                if(!item) return;
                let x = item.coord.x;
                let y = item.coord.y;
                let width = item.width;
                let height = item.height;

                //fill the visual
                //**decks will require additional
                if(item.selected) {
                    //server-wide clarity
                    //TODO: choose a color for each character, store characterID in obj,
                    //TODO: each character has a color in gameState = way to differentiate
                    //TODO: color likely stores a modified svg for each character, where
                    //TODO the fill of svg pointer = color;
                    visual.shadowColor = "white";
                    visual.shadowBlur = 100;

                    //fill the interactive
                    //**decks will require additional
                    if(!dragging) {
                        interactive.fillStyle = item.touchStyle;
                        interactive.fillRect(x , y, width, height);
                        interactive.fill();
                    }
                } else {
                    //fill the interactive
                    //**decks will require additional
                    interactive.fillStyle = item.touchStyle;
                    interactive.fillRect(x , y, width, height);
                    interactive.fill();
//                    console.log(`so it's over ${interactive.fillStyle} ${x} ${y} ${width} ${height}`);
                }

                let itemImg = getImage(item);
                if(itemImg instanceof HTMLImageElement) {
                    visual.drawImage(itemImg, x, y);
                } else {
                    console.log("error!");
                }

                if(item.selected) {
                    let img = assets.tapIcon;
//                    let img = tapIcon;

                    //client-side clarity TODO: likely better applied globally
                    visual.drawImage(img, x + width/2 - img.width/2,
                        y + height/2 - img.height/2);
                    visual.shadowBlur = 0;
                }

            });
        }
    }

    return {
        getID,
        idToRGB,
        rgbToID,
        items,
        push,
        findByRGB,
        select,
        deselect,
        flip,
        cycleImage,
        dragItems,
        drawItems
    };
})();

export default gameState;