import {Hand} from "./itemClasses.js";

//purpose: to set up HTML counterparts; such as: managing relevant context buttons,
//initializing 'hand', and other tools [drop hand, UI], managing playerBubbles,
//managing chat, managing new previews (otherHands, decks)

//the parent class; core functionality: scrolling, style tags,
//TODO- so i can make viewBox(parent), handBox (child, own), inspectBox (child, decks/others)
class PreviewBox {
    //note: [cardModel] is the reference 'deck' object that represents the hand or deck stored
    //note: hands are *SPECIAL* decks
    constructor(cardModel){
        const container = document.createElement("div");
        container.classList.add("previewBoxContainer");
        const cardHolder = document.createElement("div");
        cardHolder.classList.add("previewBox");

        container.setAttribute("draggable", "false");
        cardHolder.setAttribute("draggable", "false");

        container.append(cardHolder);

        cardHolder.addEventListener("wheel", this, {passive: false});

        this.cardHolder = cardHolder; //element
        this.container = container; //element

        //ViewDeck subclass has no starting card model
        if(!cardModel) return;

        this.cardModel = cardModel; //object
        //hard-coded property reference; purposes of drag-to-Preview
        cardHolder.deck = cardModel;
        container.deck = cardModel;
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

    purgeVisualCards() {
        const parent = this.cardHolder;
        while(parent.firstChild) {
            parent.firstChild.remove();
        }
    }

    update() {
        //purge children
        const parent = this.cardHolder;
        while(parent.firstChild) {
            delete parent.firstChild.card.ref;
            parent.firstChild.remove();
        }

        if(!this.cardModel || !this.cardModel.images) return;

        //populate children
        this.cardModel.images.forEach((card) => {
           //create img element + ref Card for selection+hoverInspect
            //+ ref cardModel 'deck' for deck-interactions
            const childImg = new Image();
            childImg.src = card.getImage().src;
            childImg.card = card;
            card.ref = childImg;
            childImg.deck = this.cardModel;

            childImg.setAttribute("draggable", "false");
            childImg.select = function() {
                this.classList.add("selectedImg");
            }
            childImg.deselect = function() {
                this.classList.remove("selectedImg");
            }

            //visual facedown, faceup
//            if(!this.cardModel.isHand) {
//                childImg.facedown = function() {
//                    this.classList.add("facedownImg");
//                }
//                childImg.faceup = function() {
//                    this.classList.remove("facedownImg");
//                }
//                //TODO note warning: hard coded value
//                if(card.index == 0) childImg.facedown();
//            }

            if(card.selected) childImg.select();

            //append to container
            parent.append(childImg);
        });
    }

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
        this.cardHolder.setAttribute("empty-hand-text", this.#emptyHandText);
        this.cardHolder.classList.add("myHand");

        this.container.addEventListener("mousedown", this, {passive: false});
        this.container.addEventListener("mouseover", this, {passive: false});
        //TODO: additional special property when client is locked out their own hand
    }

    #emptyHandText = "Drag and drop here to add to your hand. Right-click to minimize.";
    #hideText = "Your hand has been minimized. Hover to show.";

    //TODO: additional methods that enforce being locked out; and being returned access

    #minimizeSize = "10%";
    #hideHand() {
        this.container.style.height = this.#minimizeSize;
        this.purgeVisualCards();
        console.log(this.cardHolder.children);
        this.cardHolder.setAttribute("empty-hand-text", this.#hideText);
    }

    #showHand() {
        this.container.style.height = `100%`;
        this.cardHolder.style.removeProperty("visibility");
        this.update();
        this.cardHolder.setAttribute("empty-hand-text", this.#emptyHandText);
    }

    handleEvent(event) {
        switch(event.type) {
            case "mousedown":
                //Strict: mouse is not child img 'card'
                if(event.buttons == 2 && !(event.target instanceof HTMLImageElement)) {
                    this.#hideHand();
                }
                break;
            case "mouseover":
                if(this.container.style.height == this.#minimizeSize) {
                    this.#showHand();
                }
                break;
            default:
                super.handleEvent(event);
                break;
        }
    }
}

//client's view of OTHER hands or decks
class ViewDeck extends PreviewBox {
    constructor(source) {
        super();
        //TODO- process: is the source a User/Player or Deck
        this.container.classList.add("previewBoxContainer2");
        this.update();
    }

    //functionality to eject, accept new source [switching/returning views]
    //notably, cardModel property from super() assigned to this.cardModel,
    //as well as cardHolder.deck, container.deck
    //TODO- see if leaving it unchecked for now will break the code launch

    //override update()-
    update() {
        if(this.cardModel == null || this.cardModel == undefined) {
            this.#hideBody();
        } else {
            this.#showBody();
        }
        super.update();
    }

    #hideBody() {
        //note: visibility takes care of mouse/pointer
        this.cardHolder.style.visibility = `hidden`;
        this.container.style.visibility = `hidden`;
    }

    #showBody() {
        //note: visibility takes care of mouse/pointer
        this.cardHolder.style.visibility = ``;
        this.container.style.visibility = ``;
    }

    setView(cardModel) {
        if(!cardModel) {
            delete this.cardModel.ref;
        } else {
            //TODO- exception for Hand objects
            cardModel.ref = this;
        }
        this.cardModel = cardModel;
        this.update();

        this.cardHolder.deck = cardModel;
        this.container.deck = cardModel;
    }

    getView() {
        return this.cardModel;
    }
}

//object ref to gameState (client-side updates UI)
//likely
//TODO: hand stored in user; store previewObj in visuals; buttons in visuals;
//TODO cont: chatBox in visuals
export let userInterface = { preview: null };

function createBottomRow(user) {
    //TODO- temporary; to move to board html-- OR; a 'hand.js' static method!
    //and instance methods can contain: 'takeRandom()' etc
    const bottomBarWrap = document.createElement("div");
    bottomBarWrap.id = "bottomBar";
    document.body.append(bottomBarWrap);

    user.hand = new Hand(user);

    const leftWrap = document.createElement("div");
    const previewContainer = new MyHand(user);
    const rightWrap = document.createElement("div");

    leftWrap.classList.add("bottomRowPads");
    rightWrap.classList.add("bottomRowPads");

//    bottomBarWrap.append(leftWrap, handWrap, rightWrap);
    bottomBarWrap.append(leftWrap, previewContainer.container, rightWrap);
}

function createTopView() {
    const topViewContainer = new ViewDeck();

    document.body.append(topViewContainer.container);

    userInterface.preview = topViewContainer;
}

//TODO- wip, see comments
export function initializeBoard(clientUser) {
    createBottomRow(clientUser);

    createTopView();

    //create buttons

    //create chat

    //create player heads
    //>>require initialization to accept gameState
    //>>use gameState to then store copy (address) of players{}
}