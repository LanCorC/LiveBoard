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
        if(!port) port = "8080";

        let socket;
        //`ws://localhost:8080`
//        console.log(this.game.clientUser.id);
        socket = new WebSocket(
//            `wss://${address}:${port}/user=${localStorage.getItem("id")}`);
            `ws://${address}:${port}/user=${localStorage.getItem("id")}`);

        this.connection = socket;
        this.chatBox.setServer(this);

        //Note: necessary local variable for 'nested' (see below) methods
        let frontUI = this.frontPage;
        let loadingUI = this.loading;

        frontUI.connectionStarted(address, port);

        socket.onopen = function(event) {
            console.log("Server connection secured!");
            //TODO - update frontPage buttons/headers of connection
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

        //TODO: differentiate between messages: chat, fullGameState refresh, gameUpdate
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
                        if(data.player && data.player.id == this.server.game.clientUser.id) {
                            break; //skip processing: message came from us
                        }
//                        console.log("receiving chat entry..");
                        this.server.chatBox.newEntry(data.explicit, data.timeStamp, data.player);
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
            console.log("Invalid request- no changes. scrapping.");
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
            if(item.type == null) {
                console.log(`error found- item is null in action: ${stringAction}`);
                console.log(item);
                console.log("");
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

    //TODO- client to server
    sendChat(stringData) {
        if(this.connection == undefined || this.connection.readyState != 1) return;
        console.log("we SO here");
        let message = {};
        message.messageHeader = "ChatUpdate";
        message.explicit = stringData;
        message.player = this.game.clientUser;
        message = JSON.stringify(message, this.replacer());

        this.connection.send(message);
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