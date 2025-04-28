import gameState from "./gameState.js";

//Purpose: manage all (websocket) server connections
//Example: updates received from server - gameActions or serverStatus
//likely: all other modules imports server-connection.js
//Example cont: and if(server) { server.push(playerAction) }
//Example cont: reconnect() => if(!server) { server = new WebSocket(...) }

//likely: server-connections.js also saves some copy of other modules
//Example: if (response.body[0] == "gameUpdate") => [process]...gameState.update(processed)
//Example: if (... == "addPlayer") => [process]...gameState.addPlayer(processed)
        //*boardInterface to have a copy of gameState.players, and render accordingly
//Example: if (... == "chatUpdate") => [process]...boardInterface.chat(processed)
//Example: if (... == "chatUpdate") => [process]...boardInterface.chat(processed)


//TODO- experiment with having ONE server spit out the html, and the SAME connection to server
//TODO cont- to upgrade to ws (websocket) for joining the game
//Goal: localhost the server is enough for me to load html + 'start a lobby/game' with self
//Goal2: have github spit out the HTML, the ws attempt, and loading screen + demo ready
//attempt at connecting to local server

class Server {

    constructor() {
    }

    //To push updates, texts, to frontpage reference
    frontPage;
    loading;
    game;
    chatBox;

    //boolean- if gameState exists on server
    gameStatus = false;
    //TODO 'gameConnected' boolean;
    //TODO: for game actions check server.gameConnected() for executions

    //To hold the WebSocket reference
    connection;

    //Managing requests
    parentRequestID = Date.now();
    requestChains = {}; //key: parentRequestID, value: fallbackState,
    //TODO- some variable that determines if a requestChain is "VIP" aka already client-selected pre-parent
    //STEPS- see if i can do a "mousedown" gauge if item, card, was already selected ("VIP") or not (print all)
    requestFreePass = false;

    connect(address, port) {
        if(!address) address = "localhost";

        let socket;
        let addressString;
        try {
            addressString = `://${address}${port ? ":"+port : ""}/user=${localStorage.getItem("id")}`;
            console.log("attempting ws");
            socket = new WebSocket(`ws${addressString}`);
        } catch(e) { //Mixed Content found, try secure (for purpose of tunnel proxy)
            socket = new WebSocket(`wss${addressString}`);
        };

        socket.address = address;
        socket.port = port;

        this.connection = socket;
        this.chatBox.setServer(this);

        //Note: necessary local variable for 'nested' (see below) methods
        let frontUI = this.frontPage;
        let loadingUI = this.loading;

        frontUI.connectionStarted(address, port);

        socket.onopen = function(event) {
            console.log("Server connection secured!");
            frontUI.connectionSuccess();
        }

        socket.onclose = function(event) {
            if(event.wasClean) {
                console.log(`Disconnected successfully: ${event.reason}`);
                frontUI.connectionFailed(event.reason);
            } else {
                //also triggers if connection attempt fails (server offline)
                //                console.log("Something went wrong!")
                //                frontPage.send("Server not found, or closed unexpectedly!");
                frontUI.connectionFailed();
            }

            this.server.gameStatus = false;
        }

        //Note: needed to be passed to websocket obj so it can access vars
        socket.server = this;

        socket.onmessage = function(event) {

            try {
                let data = JSON.parse(event.data);
                let header = data.messageHeader;
                switch(header) {
                    case "GameStatus":
                        //return to user interface
                        frontUI.gameBoardReady(data.bool);
                        this.server.gameStatus = data.bool;

                        console.log(`GameStatus: ${this.server.gameStatus}`);
                        break;
                    case "GameSetup":
                        this.server.game.rebuildBoard(data.gameState, data.players, data.itemCount, false);
                        break;
                    case "ServerAddress":
                        this.server.frontPage.connectionSuccess(data.explicit);
                        break;
                    case "GameUpdate":
                        //Purpose messages received here are 'server approved'; we may apply immediately

//                        console.log("Game update received, printing .cards, .decks, .playMats:");
//                        console.log(data.cards);
//                        console.log(data.decks);
//                        console.log(data.playMats);
//                        console.log(data.hands);

//                        if(data.senderId != this.server.game.clientUser.id) {
//                            console.log("update not from us! WIP");
//                        } else {
//                            console.log("update from us! WIP");
//                        }

                        this.server.game.updateItems(data);
                        break;
                    case "NewPlayer":
                        if(data.senderId == this.server.game.clientUser.id) {
                            console.log(`returned ${header}!`);
                            //Do not process;
                            break;
                        }

                        console.log(`New player received! ${data.senderId}`);

                        this.server.game.addPlayer(data.player);

                        break;
                    case "ChatUpdate":
//                        if(data.player && data.player.id == this.server.game.clientUser.id) {
//                            break; //skip processing: message came from us
//                        }
                        if(data.senderId && data.senderId == this.server.game.clientUser.id) {
                            break; //skip processing: message came from us
                        }
                        let sender = this.server.game.getPlayer(data.senderId);
                        //TODO- differentate between normal chat entry, ping item, ping hand

                        switch(data.subHeader) {
                            case "ChatUpdate":
                                this.server.chatBox.newEntry(data.explicit, data.timeStamp, sender);
                                break;
                            case "PingItem":
                                this.server.chatBox.pingItemToChat(
                                    this.server.game.findItems(data.cards), sender
                                );
                                break;
                            case "GiveRandom":
                                this.server.chatBox.giveRandomToChat(sender, data.player,
                                    this.server.game.findItems(data.cards));
                                break;
                            case "ShowHand":
                                this.server.chatBox.showHandToChat(sender, data.player,
                                    this.server.game.findItems(data.cards));
                                break;
                            default:
                                console.log(`ChatUpdate type "${data.subHeader}" not recognized`);
                                break;
                        }
//                        console.log("receiving chat entry..");
                        break;
                    case "ClientUpdate":
                        if(data.player && data.player.id == this.server.game.clientUser.id) {
                            break; //skip processing: message came from us
                        }

                        this.server.game.updatePlayer(data.player);
                        break;
                    case "PermissionGameAction":
                        console.log(data);
                        this.server.processPermission(data);
                        break;
                    default:
                        console.log(`"${header}" header not defined`);
                        console.log(data);
                        break;
                }
            } catch (e) {
                console.log(e);
                console.log(event.data);
            }

        }
    }

    disconnect(code, reason) {
        this.connection.close(code, reason);
    }

    //purpose: receive relevant UI elements for visual updates
    //TODO TBD: when to connect to our gameState (on loadscreen? on connect (single lobby?)
    initialize(frontObj, loadObj, gameObj, chatBox) { //TODO- add chatObj
        this.frontPage = frontObj;
        this.loading = loadObj;
        this.game = gameState;
        this.chatBox = chatBox;

        //TODO- implement client-side send to server chat message
        chatBox.setServer(this);

//        console.log(this.frontPage);
//        console.log(this.loading);

        //Immediately try default server
        //TODO- not just yet. establish clientUser first, as server-conn identifier
//        this.connect();
    }

    //TODO- validate if connected; additional: way to handle if connection drops?
    //or leave for unlikely
    pushGame(data) {
        //'1' => Websocket.OPEN; '0' => Webocket.CONNECTING
        if(this.connection == undefined || this.connection.readyState != 1) return;

        //data[0] - Object  -> GameState (items)
        //data[1] - Array   ->ArrayList<Users>
        //data[2] - number  -> Integer

        //prepare data into appropriate "message"
        let message = {};
        message.messageHeader = "GameSetup";
        message.gameState = data[0];
        message.players = data[1];
        message.itemCount = data[2];
        message.bool = false;
        message.explicit =
        "This message holds gameState, playerList that initializes server copy.";

        message = JSON.stringify(message, this.replacer());
//        console.log(message)

        this.connection.send(message);
    }

    fetchGameState() {
        //'1' => Websocket.OPEN; '0' => Webocket.CONNECTING
        if(this.connection == undefined || this.connection.readyState != 1
        || !this.gameStatus) return;

        let message = {};
        message.messageHeader = "GameSetup";
        message.bool = true;
        message.player = this.game.clientUser;
        message.explicit = "This is a request to be sent back the gameState";

        message = JSON.stringify(message, this.replacer());

        this.connection.send(message);
    }

    //TODO- server update on gameAction
    pushGameAction(stringAction, items, ...fallbackState)  {
        //TODO important note: uncomment when not testing
        if(this.connection == undefined || this.connection.readyState != 1) return;

        //TakeFromDeck* - permission based (wait for server response)

        //for now, just push

        //TODO preview all actions are being read
//        console.log(stringAction);
//        console.log(items);
//        console.log(`VIP: ${this.requestFreePass}`);


        //items assumed array, make (items.deck)[]
        if(!Array.isArray(items)) items = new Array(items);
        if(items.length == 0) {
            console.log("Request has no valid changes. Silently logging.");
            return;
        }

        let subHeader = ""; //parentRequest childRequest VIP permission
        let requestChain = 0;

        //Start of chain: filter for
        if((stringAction == "select" || stringAction == "deselect") &&
        this.requestFreePass) {
            Object.entries(this.requestChains)
                .forEach((keyValueArr) => { //[key, value]
                items.forEach((item) => {

                    //In all entries, find matching fallbackState item id
                    //Note: Expect requestChains{ key=id, val=arr[arr,arr,arr] }
                    let found = keyValueArr[1].find((entries) => {
                        entries.forEach((entry)=>entry.id == item.id);
                    });
                    if(found) requestChain = keyValueArr[0];
                });
            });

            //if requestChain assigned (see above)
            if(requestChain) {
                this.requestFreePass = false; //this new chain is linked
                //TODO: is a parentRequest WITH a parent request ref
                subHeader = "parentRequest";
            } else {
                subHeader = "VIP"; //else maintain VIP status
            }
        }

        switch (stringAction) {
            case "select": //only case for parentRequest
                if(subHeader) break; //empty string falsy
                subHeader = "parentRequest";

                if(!requestChain) {
                    this.requestChains[this.parentRequestID] = [fallbackState];
                } else {
                    this.requestChains[requestChain].push(fallbackState);
                }

                break;
            //TODO- rework how permissions are called
            //Intention: permissions wrapped, waits for server response,
            //then if client receives "Yes", then run the command as a VIP gameUpdate
            //If on permission, requestFreePass == true, run as VIP immediately
            //If on permission, requestFreePass != true, run normally as permission
            case "tapItem":
            case "anchorItem":
            case "selectView":
            case "deselectView":
                subHeader = "VIP"; //VIP- placeholder until permissions rework
                break;
            //Special: not always triggered by mousedown, or have a 'parentRequest'
            //Note: if linked to a real parent request, it will be filtered above
            case "deselect":
                subHeader = "VIP";
            default:
                if(this.requestFreePass) subHeader = "VIP";
                subHeader = this.requestFreePass ? "VIP" : "childRequest";
                break;
        }

        //TODO important: separate decks and items
        let itemsDecks = new Set();
        let itemsCards = new Set();
        let itemsPlayMats = new Set();
        let itemsHands = new Set();
        items.forEach((item) => {
            if(!item || !item.type) {
                //Filter, as well as attempt to find faults in previous command chain
                console.log(`error found- item is null in action: ${stringAction}`);
                console.log(item);
                this.chatBox.newEntry(`error found- item is null in action: ${stringAction}`);
                window.alert(`error found- item is null in action: ${stringAction}`);
                return;
            }
            if(item.type == "playMat" || item.type == "gameMat") {
                itemsPlayMats.add(item);
                return;
            }

            if(item.deck) {
                item.deck.isHand ?
                itemsHands.add(item.deck) : itemsDecks.add(item.deck);
            }

            if(item.isDeck) {
                item.isHand ?
                itemsHands.add(item) : itemsDecks.add(item);
            } else {
                itemsCards.add(item);
            }
        });

        let message = {};
        message.messageHeader = "GameUpdate";
        message.subHeader = subHeader;
        message.senderId = this.game["clientUser"].id;
        message.timeStamp = Date.now();
        message.explicit = stringAction;
//        console.log(`Sending the following .cards, .decks, .playMats, .hands at command ${stringAction}`);
        if(itemsCards) message.cards = new Array(...itemsCards);
//        console.log(message.cards);
        if(itemsDecks) message.decks = new Array(...itemsDecks);
//        console.log(message.decks);
        if(itemsPlayMats) message.playMats = new Array(...itemsPlayMats);
//        console.log(message.playMats);
        if(itemsHands) message.hands = new Array(...itemsHands);
//        console.log(message.hands);
        if(requestChain) message.itemCount = requestChain;
        message = JSON.stringify(message, this.replacer());

        this.connection.send(message);
    }

    //note: "items" is strictly cards- no playmats, decks, tokens
    sendChat(stringData, stringAction, cards, recipient) {
        if(this.connection == undefined || this.connection.readyState != 1) return;
        if(cards && !Array.isArray(cards)) cards = [cards];

        //TODO- allow for 'PingHand' route for 'SeeHand' gameaction
        let message = {};
        message.messageHeader = "ChatUpdate";
        message.subHeader = stringAction;
        message.senderId = this.game.clientUser.id;     //sender
        message.explicit = stringData;
        if(recipient) message.player = recipient;          //recipient
        if(cards) message.cards = cards;
        message = JSON.stringify(message, this.replacer());

        this.connection.send(message);
    }

    //purpose: send clientUser updates to server
    clientUpdate(subHeader) {
        if(this.connection == undefined || this.connection.readyState != 1) return;

        //TODO- if mousemove, include coords

        let message = {};
        message.messageHeader = "ClientUpdate";
        message.subHeader = subHeader;
        message.player = this.game.clientUser;
        message = JSON.stringify(message, this.replacer());

        this.connection.send(message);
    }

    #pendingPermissions = {};

    //process outbound permissions
    //serverCheckItems- the most relevant items that end up manipulated at end of func
    //e,g, 'selectView' is the item.deck, often triggered on topCard (not deck)
    permission(func, funcArgs, serverCheckItems) {
        if(this.connection == undefined || this.connection.readyState != 1) {
            func(...funcArgs);
            return;
        }

        //TODO connection is true, so track;
        //TODO future- if in fallbackState, do not process yet
        //if not, send request to server

        //store for tracking
        let currentId = Date.now();
        this.#pendingPermissions[currentId] = [func, funcArgs];

        //assuming funcArgs is one item... card/deckm

        let message = {};
        message.messageHeader = "PermissionGameAction";
        message.timeStamp = currentId;
        //Note: weak code, assumes is 'card' or 'deck', and only holds 1 item
        if(serverCheckItems[0].isDeck) {
            message.decks = serverCheckItems;
        } else {
            message.cards = serverCheckItems;
        }
        message.player = this.game.clientUser;
        message = JSON.stringify(message, this.replacer());

        this.connection.send(message);
    }

    //process inbound permissions
    //currently coded only with 'selectView' in mind
    processPermission(data) {
        if(!data.player
        || !data.player.id
        || data.player.id != this.game.clientUser.id) return; //not ours, ignore

        console.log(`Seen and allowed to process: ${data.bool}`);

        if(this.#pendingPermissions[data.timeStamp] && data.bool) {
            //exists, not falsy
            let callBack = this.#pendingPermissions[data.timeStamp];

            //callBack expected to be [func, funcArgsArray]
            callBack[0](...callBack[1]);

            delete this.#pendingPermissions[data.timeStamp];
        }
    }

    //cleanup function; private? for JSON
    JSONreplacer() {
        let isInitial = true;

        return (key, value) => {
            if(value instanceof Map) { //handle Map object, in case of "players"
                let newVal = [];
                value.forEach((v,k,m) => newVal.push(v));
                return newVal;
            }

            if (isInitial) {
                isInitial = false;
                return value;
            }

            if (key === "") {
                // Omit all properties with name "" (except the initial object)
                return undefined;
            }
            switch(key) {
                case "ref":     //of objects with UI references
                    return undefined;
                case "deck":    //of card.deck which contains said card in .deck.images
                    if(value && value.isDeck) return value.id; //value is deck, return its id
                    return value; //or 0, if value != deck
                case "images":  //of 'decks' and 'hands' with backreferences
                    //TODO-check is actually related to deck
                    let newImagesRef = [];
                    if(value.length == 0) return newImagesRef;  //handle "empty" hand
                    if(!Object.hasOwn(value[0], "index")) {     //are NOT card objects
                        value.forEach(card => {
                            newImagesRef.push(card.source);
                        });
                    } else {            //else, are CARD objects
                        value.forEach(card => newImagesRef.push(card.id));
                    }
                    return newImagesRef;
                case "players":
                    //TODO- test if i can handle MAP to just return arr objs values
//                    console.log(key);
                default:
                    return value;
            }

            return value;
        };
    }

    //note: Use this as second arg in JSON.stringify
    //Returns TypeError "not a function", but work for purposes of reusability
    replacer() {
        return this.JSONreplacer();
    }
}

const server = new Server();

export default server;