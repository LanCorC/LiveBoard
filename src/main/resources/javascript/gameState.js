const gameState = (function() {
    //in order to render
    const items = {
        playMats: [],
        decks: [], //decks and cards could be merged; making either an extension of the other
        cards: [],
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

    //to the end of list
    function forward(item) {
        let list = findList(item.type);
        let index = list.indexOf(item);
        //moves the item up 'up' the list
        return list.push(list.splice(index, 1)[0]);
    }

    function select(items) {
        if(items[0] == undefined) return;
        items.forEach((item) => {
            item.selected = true;
            if(item.selected) forward(item);
        });
    }
    function deselect(items) {
        if(items[0] == undefined) return;
        items.forEach((item) => {
            item.selected = false;
        });
    }

    //to accept array
    function flip(items) {
        items.forEach((item) => item.flipped = !item.flipped);
        return items[0].flipped;
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
        flip
    }

})();

export default gameState;