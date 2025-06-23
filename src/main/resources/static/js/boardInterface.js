import {Hand} from "./itemClasses.js";
import gameState from "./gameState.js";
import {MenuSidebar, MenuOption} from "./sidebar.js";
import { createSmallBody, Element} from "./tinyContentHtml.js";

const verbose = false;
const FrontPage = { tools: undefined };             //frontpage.js imports
const Controls = {
    cycleBackground:    undefined,
    rotateBoard:        undefined,
    roll2d6:            undefined
};    //index.js imports
const tools = [FrontPage, Controls];                //bundling for 'lazy imports'

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
                if(event.button == 2 && !event.ctrlKey) {
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

//Excised from ChatBox functions, to reuse in playerMenu
function formatName(sender) {
    let name = document.createElement("I");
    let nameInner;
    if(sender && sender.id != gameState.clientUser.id) {
        nameInner = sender.name;
    } else {
        sender = gameState.clientUser;
        nameInner =`${gameState.clientUser.name} (You)`;
    }
    name.innerText = nameInner;

    name.style.color = sender.color;

    return name; //italic html element
}

class ChatBox {
    constructor(user) {
        //create box div, class (css to manipulate which corner/edge of board to populate + player)
        //create text input, create scrolling input;
        //[ chatlog       ]
        //[ chatlog cont  ]
        //[ chatlog cont  ]
        //[ Chatinput     ]
        const container = document.createElement("div");
        container.classList.add("chatContainer", "transparentBg");
        const chatHistoryContainer = document.createElement("div");
        chatHistoryContainer.classList.add("chatHistoryContainer");
        const chatHistory = document.createElement("div");
        chatHistory.classList.add("chatHistory");
        const chatInput = document.createElement("input");
        chatInput.classList.add("chatInput");
        chatInput.setAttribute("type", "text");
        chatInput.placeholder = "[Enter] to chat and send!";

        chatHistoryContainer.append(chatHistory);
        container.append(chatHistoryContainer, chatInput);

        this.container = container;
        this.chatHistory = chatHistory;
        this.chatInput = chatInput;

        //events
        this.container.addEventListener("mouseenter", this,{passive: false});
        this.container.addEventListener("mouseleave", this,{passive: false});

        chatInput.onwheel = function(event) {
            chatHistoryContainer.scrollTop += event.deltaY;
        };

        chatInput.addEventListener("focusin", (event) => {
            container.style.pointerEvents = "initial";
        });
        chatInput.addEventListener("focusout", (event) => {
            container.style.pointerEvents = "none";
        });

        this.user = user;
    }

    enterTriggerChat() {
        let value = this.chatInput.value;
        if(!value) return;
        value = value.trim();
        let construct = value.split(" ");
        if(construct[0].at(0) == "/") {
            this.#processCommand(construct);
            return;
        }

        value = ": ".concat(value);
        this.sendChat(value, "ChatUpdate");
        this.newEntry(value);
        this.chatInput.value = "";
    }

    triggerHelp = function() {
        this.#processCommand(["/h"]);
    }

    triggerResetGame = function() {
        this.#processCommand(["/rg"]);
    }

    //TODO- have each case call a method that RETURNS STRING/FORMAT in preparation for entry
    //example: VIP- giveRandom() -> processes (sends to server...), returns cardObj or 'false',
    //example cont.d: processCommand prints "Player (You) gave [card] to [player] at random!"
            //false: "You can't {command}, your hand is empty!"
    //*recipient: "You received [card] from Player at random!"
    //*everyone else: "[Sender] gave [Recipient] a card at random!"
    #processCommand(construct) {
        let command = construct[0].substring(1);    // "/help" -> "help"
        let args = construct.splice(1);             //"/msg player1 hi!" -> ["player1", "hi!"]
        let entry = document.createElement("p");
        switch(command.toUpperCase()) {
            case "":
            case "H":
            case "HELP":
                entry.innerText =
                "Commands: h help, tr takeRandom, gr giveRandom, rh requestHand, sh showHand, c count...";
                let target = document.getElementById("instructionsDialog");
                if(target) target.showModal();
                this.newEntry(entry);
                break;
            case "TR":          //TODO- permission, asks target player [Accept][Deny]
            case "TAKERANDOM":
                entry.innerText = `takeRandom: WIP...`;
                this.newEntry(entry);
                break;
            case "GR":
            case "GIVERANDOM":
                this.newEntry(entry);
                this.#giveRandom(gameState.giveRandom(args[0]));
                break;
            case "RH":          //TODO- permission, asks target player [Accept][Deny]
            case "REQUESTHAND":
                entry.innerText = `requestHand: WIP...`;
                this.newEntry(entry);
                break;
            case "SH":
            case "SHOWHAND":
                this.#showHand(gameState.showHand(args[0]));
                this.newEntry(entry);
                break;
            case "C":           //TODO placeholder OR in addition to a graphical interface
            case "COUNT":       //Prints all players' handcount to chat
                this.#countHands();
                this.newEntry(entry);
                break;
            case "RG":
            case "RESETGAME":
                //TODO- alert, yes / no, confirmation
                //strictly rg / resetgame entries
                    //solved by "are you sure" popup, but placeholder for now
                if(args.length != 0) {
                    this.newEntry(", please use '/rg' or '/resetgame' to reset the game.");
                    break;
                }
                this.#resetGame();
                this.newEntry(entry);
                this.server.resetGame();
                break;
            default:
                entry.innerText = `Command '${command}' not recognized`;
                this.newEntry(entry);
                break;
        }
        this.chatInput.value = "";
    }

    #resetGame() {
        let text = ` is about to reset the board!`;
        this.sendChat(text,"ChatUpdate");
        this.newEntry(text,undefined,"");
    }

    #giveRandom(result) {
        //if string, print to chat (alone)
        if(typeof result == "string") {
            this.newEntry(result);
            return;
        }

        this.giveToChat("", result[1], result[0], true);
        //then send to server to broadcast
    }

    #showHand(result) {
        if(typeof result == "string") {
            this.newEntry(result);
            return;
        }

        this.showHandToChat("", result.recipient, result.items);
    }

    #countHands() {
        let p = document.createElement("p");
        p.append("You look over and count everyone's hands: ")

        let players = gameState.getPlayers();
        players.forEach((player) => {
            p.append("[");
            p.append(formatName(player));
            p.append(`:${player.hand.images.length}`);
            p.append("]");
        })

        this.newEntry(p);
    }

    //giveRandom to chat - as sender, recipient, 3rd party
//    giveRandomToChat(sender, recipient, item) {
    giveToChat(sender, recipient, item, wasRandom) {
        if(Array.isArray(item)) {
            item = item[0];
        }

        //ensure VIP - purpose: only the client modifies own hand, prevent raceCondition
        if(recipient.id == this.user.id) {
            item.selected = 0; //move to gameState?
            gameState.addToDeck(item, this.user.hand);
        }

        //sender, recipient, item
        let p = document.createElement("p");
        p.append(formatName(sender));
        p.append(` gave `);
        p.append(formatName(recipient));
        p.append(" ");

        if(!sender || sender.id == this.user.id || recipient.id == this.user.id) {
            p.append(this.#formatCard(item));
        } else {
            //is neither party, privileged information
            p.append("a card");
        }

        p.append(wasRandom ? ` at random!` : "!");
        this.newEntry(p);

        if(sender) return; //falsy only when this was own client
        this.sendChat("", "GiveCard", item, recipient, wasRandom)
    }

    //strictly array items
    showHandToChat(sender, recipient, items) {

        //Applicable only via: "Show All" GUI
        if(!items) {
            items = gameState.clientUser.hand.images;
        }

        //sender, recipient, item
        //X is showing Y their hand
        let p = document.createElement("p");
        p.append(formatName(sender));
        p.append(` is showing`);
        if(recipient) {
            p.append(` `);
            p.append(formatName(recipient));
        }
        p.append(" their hand");
        //Applicable via: "Show All" GUI
        if(!recipient) p.append(` to everyone`);

        //X is showing Y their hand, but it's empty!
        if(!items || items.length == 0) {
            p.append(", and it's empty!");
        } else {
            if(!sender || !recipient || sender.id == this.user.id || recipient.id == this.user.id) {
                //X is showing Y their hand: [] [] []
                p.append(": ");
                items.forEach((item) => {
                    p.append(this.#formatCard(item));
                });
            } else {
                //is neither party, privileged information
                //X is showing Y their hand!
                p.append("!");
            }
        }

        this.newEntry(p);

        if(sender) return; //falsy only when this was own client
        this.sendChat("", "ShowHand", items, recipient)
    }

//    #formatName(sender) {
//        let name = document.createElement("I");
//        let nameInner;
//        if(sender && sender.id != this.user.id) {
//            nameInner = sender.name;
//        } else {
//            sender = this.user;
//            nameInner =`${this.user.name} (You)`;
//        }
//        name.innerText = nameInner;
//
//        name.style.color = sender.color;
//
//        return name; //italic html element
//    }

    //use real item, else default "[Card]"
    #formatCard(card) {
        let b = document.createElement("b");
        if(!card) {
            b.innerText = "[nullCard]";
            return b;
        }
        b.innerText = `[${card.name || card.type || "Card"}]`;
        b.card = card;

        return b;
    }

    //function that accepts new value (server, or thisClient and appends to history
    newEntry(text, timeStamp, sender) {
        //TODO- translate timestamp

        let entry = document.createElement("p");

        if(!text) return;

        if(typeof text === "string") {
            entry.append(formatName(sender));
            entry.append(`${text}`);
        } else { //pre-formatted innerHTML
            entry = text;
        }

        this.chatHistory.append(entry);

        //if focus, scrollintoview
//        if(!this.#isFocused || name == this.user.name) {
            entry.scrollIntoView(false);
//        }
    }

    sendChat = function(data) { console.log(`sendChatDefault: ${data}`)};

    //called by server file
    setServer(server) {
        this.server = server; //used in 'resetGame'
        this.#setMethod(server.sendChat);
    }

    #setMethod(methodSendChat) {
        this.sendChat = methodSendChat;
    }

    transparent() {
        this.container.classList.add("transparentBg");
    }
    opaque() {
        this.container.classList.remove("transparentBg");
    }

    #isFocused = false;
    handleEvent(event) {
        switch(event.type) {
            case "mouseenter":
                this.#isFocused = true;
                this.opaque();
                break;
            case "mouseleave":
                this.#isFocused = false;
                this.transparent();
                break;
            default:
                break;
        }
    }

    //used in hotkey "ENTER" to select, deselect from chat
    focus() {
        this.chatInput.focus();
    }

    toggleInputFocus() {
        if(document.activeElement == this.chatInput) {
            this.enterTriggerChat();
            this.transparent();
            document.activeElement.blur();
            return;
        }
        this.opaque();
        this.focus();
    }

    //TODO-> "Player shows you their hand: [Card] [Card]..."
    //TODO- specialize for "You are sharing your hand: [] [] []..." + option for showEveryone? showSomeone? (willingly)
    pingItemToChat(items, sender) {
        //send the server the ID
        if(!items) return;
        if(!Array.isArray(items)) items = [items];

        const body = document.createElement("p");

        //if single (length==1), keep 0 (falsy)
        let count = items.length == 1 ? 0 : 1;

        body.append(formatName(sender));
        body.append(` pinged ${items[0].type.toLowerCase() || "item" }`);
        count ? body.append(`s `) : body.append(` `);

        items.forEach((item) => {
//            let part = document.createElement("b");
//            part.card = item;
//            if(count) {
//                part.innerText = `[Card${count++}]`;
//            } else {
//                part.innerText = "[Card]";
//            }
            body.append(this.#formatCard(item));
        });

        this.newEntry(body, "", sender);

        if(!sender) this.sendChat("", "PingItem", items);
    }

    joinChat(isFirst) {
        let p = document.createElement("p");
        if(isFirst) {
            this.newEntry(" are the first to join the live table!");
            return;
        }

        //TODO- do not ping if not in game yet

        //Welcome player (You)! You are joining
        p.append("Welcome ");
        p.append(formatName());
        p.append("! You are joining ");

        //Welcome player (You)! You are joining ...oh, it's just yourself for now.
        if(gameState.getPlayers().size == 1) {
            p.append("...oh, it's just yourself for now.");
            this.newEntry(p);
            return;
        }

        //Welcome player (You)! You are joining [PlayerX][PlayerY][PlayerZ].
        gameState.getPlayers().forEach((player) => {
            if(this.user == player) return;
            p.append("[");
            p.append(formatName(player));
            p.append("]");
        });
        p.append(" at the live table.");
        this.newEntry(p);
    }

    //for SOLO and DEMO; TODO: demo includes other inactive 'NPCs'
    join(mode) {
        let p = document.createElement("p");

        //Welcome player (You)! You are joining
        p.append(`Welcome to ${mode}, `);
        p.append(formatName());
        p.append("!");

        this.newEntry(p);
    }

    disconnected(id) {
        let p = document.createElement("p");
        p.append(formatName(gameState.getPlayer(id)));
        p.append(" has disconnected.");
        this.newEntry(p);
    }

    newPlayer(player) {
        let p = document.createElement("p");
        p.append(formatName(player));
        p.append(" has joined the table!");
        this.newEntry(p);
    }
}

//object ref to gameState (client-side updates UI)
//likely
//TODO: hand stored in user; store previewObj in visuals; buttons in visuals;
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

export function createChat(user) {
    const chatBox = new ChatBox(user);

    document.body.append(chatBox.container);

    userInterface.chatBox = chatBox;

    return chatBox;
}

//testing function - new sidebar menu @ top left of screen
//SELF NOTE: best to import Controls (index) and GameState here to centralize modification of game menu
function createMenu() {
    const tokenRoot = "./images/Tokens";
    let sidebar = new MenuSidebar(MenuSidebar.SETTINGSBAR);
    let settings = new MenuOption();
    settings.setFallback("Settings")
        .setSrc(`${tokenRoot}/settings-ui-svgrepo-com.svg`)
        .addOnClick() //default - will create ContextMenu
        .addBuildSpecification("Switch Seats (a, d)", Controls.rotateBoard,MenuOption.KEEP)
        .addBuildSpecification("Cycle Background (=)",Controls.cycleBackground,MenuOption.KEEP)
        .addBuildSpecification(createSmallBody(Element.SEPARATOR()),undefined,MenuOption.KEEP)
        .addBuildSpecification("\u26A0 Reset Game \u26A0",()=>{
            if(window.confirm("Are you sure you want to RESET GAME?")) {
                userInterface.chatBox.triggerResetGame();
            }
        },MenuOption.DISCARD)
        .addBuildSpecification(createSmallBody(Element.SEPARATOR()),undefined,MenuOption.KEEP)
        .addBuildSpecification("Leave Game",FrontPage.tools.leaveGame,MenuOption.DISCARD)
    ;

    //creates fresh object each time, to evade mix-ups of old/overwritten elements
    let content = [
        () => createSmallBody(
            Element.BOLD("QuickTips 1/4"), Element.BREAK(),
            Element.SEPARATOR(),
            Element.ITALICS("DISCARD"), " removes from your hand.", Element.BREAK(),
            Element.ITALICS("SACRIFICE"), " removes from your party.", Element.BREAK(),
            Element.ITALICS("DESTROY"), " removes from another player's party.", Element.BREAK(),
            Element.ITALICS("EQUIPMENTS"), " follow the hero it is equipped on— stolen, destroyed, or sacrificed.", Element.BREAK()
        ),
        () => createSmallBody(
            Element.BOLD("QuickTips 2/4"), Element.BREAK(),
            Element.SEPARATOR(),
            "All players must be given an opportunity to ", Element.ITALICS("CHALLENGE"), " a Hero, Item, or Magic card played from hand.", Element.BREAK(),
            "Cards can only be ", Element.ITALICS("CHALLENGED"), " once.", Element.BREAK(),
            Element.ITALICS("CHALLENGED"), " player must roll higher than their opponent to resist.", Element.BREAK(),
        ),
         () => createSmallBody(
             Element.BOLD("QuickTips 3/4"), Element.BREAK(),
             Element.SEPARATOR(),
             "One Hero's ", Element.ITALICS("EFFECT"), " can only be rolled once per turn— ", Element.BREAK(),
             "a) as it's played,", Element.BREAK(),
             "b) by spending an action point", Element.BREAK(),
             "—unless otherwise repeated/copied by special effects."
         ),
        () => createSmallBody(
            Element.BOLD("QuickTips 4/4"), Element.BREAK(),
            Element.SEPARATOR(),
            Element.ITALICS("PARTY LEADERS'"), " class count for Party-Win and Monster requirements.", Element.BREAK(),
            Element.ITALICS("PARTY LEADER"), " The Shadow Claw is not recommended for 2-player games.", Element.BREAK(),
        )
    ];
    let tipsIndex = 0;
    let cycleTips = function(index) {
        let html;
        if(index || index == 0) {
            html = content[index]()
        } else {
            html = content[++tipsIndex % content.length]();
        }
        return html;
    }.bind(this);

    let info = new MenuOption();
    info.setFallback("Info")
        .setSrc(`${tokenRoot}/info-svgrepo-com.svg`)
        .addOnClick()
        .addBuildSpecification(cycleTips(0), (content) => {
            content.innerHTML = ''; //purge
            let html = cycleTips();
            content.append(...html.childNodes);
        }, MenuOption.KEEP);

    let help = new MenuOption();
    help.setFallback("Help")
        .setSrc(`${tokenRoot}/faq-svgrepo-com.svg`)
        .addOnClick(()=>userInterface.chatBox.triggerHelp())
    ;

    sidebar.addButton(settings, info, help);
    document.body.append(sidebar.getElement());
}

//TODO create a greater 'playerbar' object, attach to userInterface,
//*gameState will use userInterface.playerBar.update() / etc to process changes
class PlayerBar {

    players = gameState.getPlayers()

    //key:id, val:correspondingUserButton
    //for purpose of
    buttons = new Map();

    constructor() {
        //Initialize: create object, attach this player;

        let menuSideBar = new MenuSidebar(MenuSidebar.PLAYERBAR);

        //Apply variables
        this.menuSideBar = menuSideBar;

        this.addPlayer(gameState.clientUser);

        document.body.append(menuSideBar.getElement());
    }

    addPlayer(user) {   //to use: Name, Color, handSize, liveStatus
        //skip if exists
        if(this.buttons.has(user.id)) {
            this.updateBody(user);
            return;
        }

        let button = new MenuOption();

        this.buttons.set(user.id, button);
        this.updateBody(user);

        button
            .addOnClick()
        ;

        if(user.id == gameState.clientUser.id) {
            button.addBuildSpecification("Roll Dice (r)", Controls.roll2d6,MenuOption.KEEP)
            .addBuildSpecification("Show Hand (all)", ()=>userInterface.chatBox.showHandToChat(),MenuOption.DISCARD)
            .addBuildSpecification(createSmallBody(Element.SEPARATOR()),undefined,MenuOption.KEEP)
            .addBuildSpecification("Reroll Name", ()=>gameState.rerollUser(), MenuOption.KEEP)
            .addBuildSpecification(createSmallBody(Element.SEPARATOR()),undefined,MenuOption.KEEP)
            .addBuildSpecification("\u26A0 Drop Hand (WIP) \u26A0",()=>{
                //Game action
                gameState.dropHand();
                //Chat update
            },MenuOption.DISCARD)
        } else {
            button.addBuildSpecification(createSmallBody(Element.ITALICS("[Drop Here to Give]")),()=>{},MenuOption.KEEP,user)
            .addBuildSpecification("Show Hand",()=>{
                userInterface.chatBox.showHandToChat("", user)
            },MenuOption.DISCARD)
            .addBuildSpecification("Give Random",()=>{
                let result = gameState.giveRandom(user);
                if(typeof result == "string") {
                    userInterface.chatBox.newEntry(result);
                    return;
                }
                userInterface.chatBox.giveToChat("", user, result[0], true);
            },MenuOption.DISCARD)
            .addBuildSpecification(createSmallBody(Element.SEPARATOR()),undefined,MenuOption.KEEP)
            .addBuildSpecification("\u26A0 See Hand (WIP) \u26A0",()=>{},MenuOption.DISCARD)
            .addBuildSpecification("\u26A0 Drop Hand (WIP) \u26A0",()=>{},MenuOption.DISCARD)
        }

        this.menuSideBar.addButton(button);
    }

    updateBody(user) {

        //default to current player
        if(!user) user = gameState.clientUser;
        //User (You)
        //{hand}: # (LIVE || AWAY)
        if(!this.buttons.has(user.id)) return;
        this.buttons.get(user.id).setBody(
        createSmallBody(
            formatName(user),Element.BREAK(),
            `\u270B: ${user.hand.images.length || 0}`, ` ${user.live ? "(LIVE)" : "(AWAY)"}`
        ));

        return;
    }

    //TODO on-leave- i.e. player leaving
        //simply grey out, or move to bottom
        //optional: if hand is empty, remove

    update() {
        //note: does not handle players leaving

        //functionality: if buttons entry not found in players, remove from playerBar
        let remove = new Set();
        this.buttons.forEach((playerButton, playerId, map) => {
            if(!this.players.has(playerId)) {
                this.menuSideBar.removeButton(playerButton);
                remove.add(playerId);
            }
        });
        for(const entry of remove.entries()) {
            this.buttons.delete(entry[0]);
        }

        //functionality: if entry in players not in playerBar, add
        let include = new Set();
        this.players.forEach((player, playerId, map) => {
            if(!this.buttons.has(playerId)) {
                include.add(player);
            }
        });
        for(const entry of include.entries()) {
            this.addPlayer(entry[0]);
        }

    }

    playerUpdate(player) {
        if(typeof player != 'object') {
            player = this.players.get(player);
        }
        this.updateBody(player);
    }
}

function createPlayerBar() {
    userInterface.playerBar = new PlayerBar();
}

//TODO- wip, see comments
export function initializeBoardInterface(clientUser) {
    createBottomRow(clientUser);

    createTopView();

    //create buttons

    //create player heads

    //create menuBar
    //dynamic import, and on both, then createMenu()
    //Purpose: spaghetti code imports across multiple files caused sequencing issues
    Promise.all([
        import("./index.js"),
        import("./frontPageInterface.js")
    ]).then((values)=> {
        //pluck out specific properties to-find in our 'lazy import'
        //TODO future- just place the entire module?
        let valuesToGo = new Map();

        //tools = [module, module]
        tools.forEach(
            //entries = [ [propertyName, val] : index, [propertyName, val] : index ]
            (module) => Object.entries(module).forEach(
                (key, value) => valuesToGo.set(key[0], module)
            )
        );

        for(const module of values) {
            for(const [key, value] of Object.entries(module)) {
                let entries = Object.entries(module);
                for (const entry of entries) {
                    if(valuesToGo.has(entry[0])) {
                        valuesToGo.get(entry[0])[entry[0]] = module[entry[0]];
                        valuesToGo.delete(entry[0]);
                    }
                }
            }
        }

        createMenu();

        createPlayerBar();
    });


    //>>require initialization to accept gameState
    //>>use gameState to then store copy (address) of players{}
}