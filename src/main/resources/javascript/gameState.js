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
        return itemCount++;
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

    //turn to array input at some stage, for sake of 'deck'
    function push(item) {
        switch(item.type) {
            case "Leader":
            case "Monster":
            case "Card":
                gameState.items.cards.push(item);
                break;
            case "playMat":
            case "gameMat":
                gameState.items.playMats.push(item);
                break;
            case "deck":
                gameState.items.decks.push(item);
                break;
            case "player":
                gameState.items.players.push(item);
                break;
            default:
                return null; //TODO handle error somehow
        }
    }

    return {
        getID,
        idToRGB,
        rgbToID,
        items,
        push
    }

})();

export default gameState;