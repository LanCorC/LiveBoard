import {Hand} from "./itemClasses.js";

//purpose: to set up HTML counterparts; such as: managing relevant context buttons,
//initializing 'hand', and other tools [drop hand, UI], managing playerBubbles,
//managing chat, managing new previews (otherHands, decks)

//the parent class; core functionality: scrolling, style tags,
//TODO- investigate how i can 'extend' from this;
//TODO- so i can make viewBox(parent), handBox (child, own), inspectBox (child, decks/others)
class PreviewBox {
    //TODO- [cardModel] is the reference 'deck' object that represents the hand or deck stored
    //note: hands are *SPECIAL* decks
    constructor(cardModel){
        const container = document.createElement("div");
        container.classList.add("previewBoxContainer");
        const cardHolder = document.createElement("div");
        cardHolder.classList.add("previewBox");

        container.append(cardHolder);

        cardHolder.addEventListener("wheel", this, {passive: false});

        //hard-coded property reference; purposes of drag-to-Preview
        cardHolder.deck = cardModel;
        container.deck = cardModel;
        //TODO - do the same for img child, even if imgChild.card.deck is equal

        this.cardHolder = cardHolder; //element
        this.cardModel = cardModel; //object
        this.container = container; //element
    }

    handleEvent(event) {
        const scrollIncrement = 200;
        switch(event.type) {
            case "wheel":
                this.cardHolder.scrollLeft += event.deltaY;
                break;
            default:
                break;
        }
    }
    //TODO major: core deck preview interactions; public, make gameState manipulate it via
    //these methods

    //TODO: 'update' method, via images based on model; make public
    //purpose: simple 'delete all, then remake' approach;
    //Note: quite fast for 150+
    update() {
        //purge children
        const parent = this.cardHolder;
        while(parent.firstChild) {
            parent.firstChild.remove();
        }

        //populate children
        this.cardModel.images.forEach((card) => {
           //create img element + ref Card for selection+hoverInspect
            //+ ref cardModel 'deck' for deck-interactions
            const childImg = new Image();
            childImg.src = card.getImage().src;
            childImg.card = card;
            childImg.deck = this.cardModel;

            //append to container
            parent.append(childImg);
        });
    }

    //TODO: 'append/add' method, to what index; find a way to iterate through node.childList

    //TODO: 'remove' method, to purge from cardHolder div

    //TODO **when do i want redraw to trigger? ideally, if called here.
    //however, manipulation code is in gameState.js
    //try: Hand class in itemClasses.js a special property reporting back to...this?
}

//client's view of own hand
//TODO: while player's hand is being VIEWED, their client view 'greys out'
//>>pointer-events: none; or not greyed out but washed over with 50%alpha
//>>color of inspecting player
//>>when special property is reset/handedOver, undo above code
//>>TODO- the above is a CLASS ADDITION; try make it work, else we'll have to hardcode
class MyHand extends PreviewBox {
    constructor(user) {
        //TODO - create implementation of how 'hand' is created, and referenced
        super(user.hand);
        //Purpose for .ref?? likely excessive. unless methods used in Hand class
        user.hand.ref = this;
        this.user = user;
        this.cardHolder.setAttribute("empty-hand-text",
            "This is your hand. Drag here to view card, drop to add to your hand.");
        this.cardHolder.classList.add("myHand");

        //TODO: additional special property when client is locked out their own hand
    }

    //TODO: additional methods that enforce being locked out; and being returned access
}

//client's view of OTHER hands or decks
class ViewDeck extends PreviewBox {
    constructor(source) {
        //TODO - does this work? let it choose the valid one?
        super(source.hand || source);
        //TODO- process: is the source a User/Player or Deck
    }
}

function createBottomRow(user) {
    //TODO- temporary; to move to board html-- OR; a 'hand.js' static method!
    //and instance methods can contain: 'takeRandom()' etc
    const bottomBarWrap = document.createElement("div");
    bottomBarWrap.id = "bottomBar";
    document.body.append(bottomBarWrap);

    user.hand = new Hand();

    const leftWrap = document.createElement("div");
    const previewContainer = new MyHand(user);
    const rightWrap = document.createElement("div");

    leftWrap.classList.add("bottomRowPads");
    rightWrap.classList.add("bottomRowPads");

//    bottomBarWrap.append(leftWrap, handWrap, rightWrap);
    bottomBarWrap.append(leftWrap, previewContainer.container, rightWrap);
}

//TODO- wip, see comments
export function initializeBoard(clientUser) {
    createBottomRow(clientUser);

    //create buttons

    //create chat

    //create player heads
    //>>require initialization to accept gameState
    //>>use gameState to then store copy (address) of players{}
}