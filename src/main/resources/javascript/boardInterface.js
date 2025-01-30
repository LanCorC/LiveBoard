//purpose: to set up HTML counterparts; such as: managing relevant context buttons,
//initializing 'hand', and other tools [drop hand, UI], managing playerBubbles,
//managing chat, managing new previews (otherHands, decks)

//the parent class; core functionality: scrolling, style tags,
//TODO- investigate how i can 'extend' from this;
//TODO- so i can make viewBox(parent), handBox (child, own), inspectBox (child, decks/others)
class previewBox {
    constructor(element){
        element.addEventListener("wheel", this, {passive: false});
        element.classList.add("previewBox");
        this.element = element;
    }

    handleEvent(event) {
        const scrollIncrement = 200;
        switch(event.type) {
            case "wheel":
                this.element.scrollLeft += event.deltaY;
                break;
            default:
                break;
        }
    }
}

//client's view of own hand
//TODO- see if this stops of from dragging deck/otherHand preview
class MyHand extends previewBox {
    constructor(element, user) {
        super(element);
        this.user = user;
    }
}

function createBottomRow() {
    //TODO- temporary; to move to board html-- OR; a 'hand.js' static method!
    //and instance methods can contain: 'takeRandom()' etc
    const bottomBarWrap = document.createElement("div");
    bottomBarWrap.id = "bottomBar";
    document.body.append(bottomBarWrap);

    //TODO-temp, testing
    const previewContainer = document.createElement("div");
    previewContainer.classList.add("previewBoxContainer");

    const leftWrap = document.createElement("div");
    const handWrap = document.createElement("div");
    const rightWrap = document.createElement("div");

    //TODO-temp, testing
    previewContainer.append(handWrap);

    leftWrap.classList.add("bottomRowPads");
    rightWrap.classList.add("bottomRowPads");

    handWrap.id = "handWrap";
//    bottomBarWrap.append(leftWrap, handWrap, rightWrap);
    bottomBarWrap.append(leftWrap, previewContainer, rightWrap);


    //TODO- temporary, preliminary testing; to be pushed to gameState
    new previewBox(handWrap);
}

//TODO- wip, see comments
export function initializeBoard() {
    createBottomRow();

    //create buttons

    //create chat

    //create player heads
    //>>require initialization to accept gameState
    //>>use gameState to then store copy (address) of players{}
}