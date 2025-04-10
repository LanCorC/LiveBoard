import {Hand} from "./itemClasses.js";

const verbose = false;

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

        //user-page responsiveness
        this.container.addEventListener("mouseup", this, {passive: false});
        this.container.addEventListener("mouseover", this, {passive: false});

        //ViewDeck subclass has no starting card model
        if(!cardModel) return;

        this.cardModel = cardModel; //object
        //hard-coded property reference; purposes of drag-to-Preview
        cardHolder.deck = cardModel;
        container.deck = cardModel;
    }

    enlargeBody() {
        this.container.style.height = this.enlargeSize;

        if(verbose) console.log("enlargeBody()");
    };
    minimizeBody() {
        this.container.style.height = this.minimizeSize;
        this.purgeVisualCards();

        if(verbose) console.log("minimizeBody()");
    };

    handleEvent(event) {
        const scrollIncrement = 200;
        switch(event.type) {
            case "wheel":
                this.cardHolder.scrollLeft += event.deltaY;
                break;
            case "mouseup":
                if(event.button == 2) {
                    this.minimizeBody();
                }
                break;
            case "mouseover":
                if(this.container.style.height == this.minimizeSize) {
                    this.enlargeBody();
                    this.update();
                }
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

    //TODO- turn childImgContainer into childContainerDiv - test for visual inaccuracies
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
//            childImg.src = card.getImage().src;
            childImg.src = card.images[1].src
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
//                childImgContainer.facedown = function() {
//                    this.classList.add("facedownImg");
//                }
//                childImgContainer.faceup = function() {
//                    this.classList.remove("facedownImg");
//                }
//                //TODO note warning: hard coded value
//                if(card.index == 0) childImgContainer.facedown();
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
        this.cardHolder.setAttribute("empty-hand-text", this.emptyHandText);
        this.cardHolder.classList.add("myHand");

        //TODO: additional special property when client is locked out their own hand
    }

    emptyHandText = "Drag and drop here to add to your hand. Right-click to minimize.";
    hideText = "Your hand has been minimized. Hover to view.";

    minimizeSize = "10%";
    enlargeSize = `100%`;
    minimizeBody() {
        super.minimizeBody();
        this.cardHolder.setAttribute("empty-hand-text", this.hideText);
    }

    enlargeBody() {
        super.enlargeBody();
        this.cardHolder.setAttribute("empty-hand-text", this.emptyHandText);
    }

    //Purpose: on full server update of hand
    newSrc(cardModel) {
        cardModel.ref = this;
        this.cardModel = cardModel;
        this.update();

        this.cardHolder.deck = cardModel;
        this.container.deck = cardModel;
    }

    //TODO: additional methods that enforce being locked out; and being returned access
}

//client's view of OTHER hands or decks
class ViewDeck extends PreviewBox {
    constructor(source) {
        super();
        //TODO- process: is the source a User/Player or Deck
        this.container.classList.add("previewBoxContainer2");
        this.update();

    }

    hideText = "This deck/hand preview has been minimized. Hover to view";
    noDeckSelectedText = "This preview is empty. Right-click to preview a deck.";

    //functionality to eject, accept new source [switching/returning views]
    //notably, cardModel property from super() assigned to this.cardModel,
    //as well as cardHolder.deck, container.deck
    //TODO- see if leaving it unchecked for now will break the code launch

    //override update()-
    update() {
        if(this.cardModel == null || this.cardModel == undefined) {
            this.cardHolder.setAttribute("empty-hand-text", this.noDeckSelectedText);
            this.minimizeBody();
        } else {
            this.cardHolder.setAttribute("empty-hand-text", this.hideText);
        }
        super.update();
    }

    hideBody() {
        //note: visibility takes care of mouse/pointer
        this.cardHolder.style.visibility = `hidden`;
        this.container.style.visibility = `hidden`;
    }

    showBody() {
        //note: visibility takes care of mouse/pointer
        this.cardHolder.style.visibility = ``;
        this.container.style.visibility = ``;
    }

    //Adjust accordingly: 0.25 == 25% is the parent div container height of MyHand obj
    minimizeSize = `${10 * 0.25}%`;
    enlargeSize = `${100 * 0.25}%`;

    setView(cardModel) {
        this.enlargeBody();
        if(!cardModel) {
            delete this.cardModel.ref;
        } else {
            //TODO- exception for Hand objects, who already have their own .ref
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

class ChatBox {
    constructor() {
        //create box div, class (css to manipulate which corner/edge of board to populate + player)
        //create text input, create scrolling input;
        //[ chatlog       ]
        //[ chatlog cont  ]
        //[ chatlog cont  ]
        //[ Chatinput     ]
        const container = document.createElement("div");
        container.classList.add("chatContainer");
        const chatHistoryContainer = document.createElement("div");
        chatHistoryContainer.classList.add("chatHistoryContainer");
        const chatHistory = document.createElement("div");
        chatHistory.classList.add("chatHistory");
        const chatInput = document.createElement("input");
        chatInput.classList.add("chatInput");
        chatInput.setAttribute("type", "text"); //TODO- [Enter] trigger or event
        chatInput.placeholder = "[Enter] to chat and send!";

        chatHistoryContainer.append(chatHistory);
        container.append(chatHistoryContainer, chatInput);

        this.container = container;
        this.chatHistory = chatHistory;
        this.chatInput = chatInput;

        //events
        this.container.addEventListener("mouseenter", this,{passive: false});
        this.container.addEventListener("mouseleave", this,{passive: false});
//        chatInput.onchange = (event) => {
//            //TODO- trigger to see if mouseclick OR enter used; -- impossible
//            //if mouseclick, do not process
//            console.log(event);
//
//            //TODO- see if this.sendChat() will update,
//
//        };
    }

    //TODO: if not focused, auto scroll on new entry
        //look at a variable onHoverIn onHoverOut
    //TODO
        //look at [enter] event in chat input
    enterTriggerChat() {
        if(this.chatInput.value != "") {
            this.sendChat(this.chatInput.value);
            this.newEntry(this.chatInput.value);
        }
        this.chatInput.value = "";
    }

    //TODO
    //function that accepts new value (server, or thisClient and appends to history
    newEntry(text, timeStamp, sender) {
        //TODO- translate timestamp

        //TODO- append

        let name = "You";
        if(sender) {
            if(sender.name) {
                name = sender.name;
            } else {
                name = sender; //allow for 'String'
            }
        }

        if(!text) return;

        //TODO- if not focused on chatbox, scrollintoview()
        const entry = document.createElement("p");
        entry.innerText = `${name}: ${text}`;

        this.chatHistory.append(entry);
        //if focus, scrollintoview

        if(!this.#isFocused || name == "You") {
            entry.scrollIntoView(false);
        }
    }

    sendChat = function(data) { console.log(`sendChatDefault: ${data}`)};

    //Spaghetti code, enjoy
    connection = null;
    replacer = null;
    JSONreplacer = null;
    game = null;

    //called by server file
    setServer(server) {
        this.#setMethod(server.sendChat);
        this.connection = server.connection;
        this.replacer = server.replacer;
        this.JSONreplacer = server.JSONreplacer;
        this.game = server.game;
    }

    #setMethod(methodSendChat) {
        this.sendChat = methodSendChat;
    }

    #isFocused = false;
    handleEvent(event) {
        switch(event.type) {
            case "mouseenter":
                this.#isFocused = true;
                break;
            case "mouseleave":
                this.#isFocused = false;
                break;
            default:
                break;
        }
    }

    //used in hotkey "ENTER" to select, deselect from chat
    focus() {
        this.chatInput.focus();
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

//TODO- link to server, diceroll, game, etc
export function createChat() {
    const chatBox = new ChatBox();

    document.body.append(chatBox.container);

    userInterface.chatBox = chatBox;

    return chatBox;
}

//TODO- wip, see comments
export function initializeBoardInterface(clientUser) {
    createBottomRow(clientUser);

    createTopView();

    //create buttons

    //create chat

    //create player heads
    //>>require initialization to accept gameState
    //>>use gameState to then store copy (address) of players{}
}