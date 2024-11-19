import tapIcon from "./assets.js";

const gameState = (function() {
    //in order to render
    const items = {
        playMats: [],
        decks: [], //decks and cards could be merged;
        cards: [],
        tokens: [], //dice, etc
        players: [] //mouse, etc
    }

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
        return;
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
            console.log(list);

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
        });
    }
    function deselect(items) {
        if(!Array.isArray(items)) items = new Array(items);
        if(items[0] == undefined) return;
        items.forEach((item) => {
            item.selected = false;
        });
    }

    //to accept array
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
        })
    }

    function dragItems(dx, dy, items, correct) {
        if(!Array.isArray(items)) items = new Array(items);

        //each item's relative start point must be recorded
        if(!correct) {
            setStart(items)
            forward(items);
        }

        items.forEach((item) => {
            item.coord.x = dx + item.dragStart.x;
            item.coord.y = dy + item.dragStart.y;
        });
    }

    //'selected' for clarity, (game-wide)
    //'focus' and 'dragging' (client-side) for drag-to-deck functionality
    function drawItems(focus, dragging, visual, interactive) {
        for (const [type, list] of Object.entries(items)) {

            list.forEach((item) => {
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
                }

                //TODO: item specific, e.g. card flips, mats cycle,
                visual.drawImage(!item.flipped? item.img : item.backImg, x, y);

                if(item.selected) {
                    //client-side clarity TODO: likely better applied globally
                    visual.drawImage(tapIcon, x + width/2 - tapIcon.width/2,
                        y + height/2 - tapIcon.height/2);
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
        dragItems,
        drawItems
    }
})();

export default gameState;