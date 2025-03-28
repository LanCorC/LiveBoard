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

    //boolean- if gameState exists on server
    gameStatus = false;
    //TODO 'gameConnected' boolean;
    //TODO: for game actions check server.gameConnected() for executions

    //To hold the WebSocket reference
    connection;

    connect(address, port) {
        if(!address) address = "localhost";
        if(!port) port = "8080";

        let socket;
        //`ws://localhost:8080`
//        console.log(this.game.clientUser.id);
        socket = new WebSocket(
            `ws://${address}:${port}/user=${localStorage.getItem("id")}`);
        this.connection = socket;

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
            console.log(event.data);

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
                    default:
                        console.log(`"${header}" header not defined`);
                        break;
                }
            } catch (e) {
                console.log(e);
            }


        }
    }

    disconnect(code, reason) {
        this.connection.close(code, reason);
    }

    //purpose: receive relevant UI elements for visual updates
    //TODO TBD: when to connect to our gameState (on loadscreen? on connect (single lobby?)
    initialize(frontObj, loadObj, gameObj) {
        this.frontPage = frontObj;
        this.loading = loadObj;
        this.game = gameState;

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
        //data[1] - Array   -> List<Users>
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
        console.log(message)

        this.connection.send(message);
    }

    fetchGameState() {
        //'1' => Websocket.OPEN; '0' => Webocket.CONNECTING
        if(this.connection == undefined || this.connection.readyState != 1
        || !this.gameStatus) return;

        let message = {};
        message.messageHeader = "GameSetup";
        message.bool = true;
        message.explicit = "This is a request to be sent back the gameState";

        message = JSON.stringify(message);

        this.connection.send(message);
    }

    //TODO- server update on gameAction
    pushGameAction(stringAction, items)  {
        //Select (mousedown) - store copy of itemFocus, itemFocus.deck (if any)
        //Deselect (mouseup) - store copy of item/s, items.forEach(item->item.deck) if any
        //TakeFromDeck* with care, if last card;

        //for now, just push

        //TODO preview all actions are being read
        console.log(stringAction);

        //items assumed array, make (items.deck)[]
        if(!Array.isArray(items)) items = new Array(items);

        //TODO important: separate decks and items
        let itemsDecks = [];
        let itemsCards = [];
        items.forEach((item) => {
            if(item.deck) {
                itemsDecks.push(item.deck);
            }
            if(item.isDeck) {
                itemsDecks.push(item);
            } else {
                itemsCards.push(item);
            }
        });

        let message = {};
        message.messageHeader = stringAction;
        message.cards = itemsCards;
        message.decks = itemsDecks;
        //TODO- make sure itemsCards and itemsDecks seem accurate

        message = JSON.stringify(message, this.replacer());
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
                    return value.id;
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