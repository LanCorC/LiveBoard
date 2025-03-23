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

            //TODO - update frontPage buttons/headers of connection
        }

        //TODO: differentiate between messages: chat, fullGameState refresh, gameUpdate
        socket.onmessage = function(event) {
            console.log(event.data);
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
        console.log(data);
        console.log(this.connection);
        this.connection.send(data);
    }

    //cleanup function; private? for JSON
    //TODO- our purpose: deck.image -> only array integers
    //TODO- our purpose: card.deck (if any) -> only the id of deck
    //TODO- our purpose: any.ref -> omit (only important to relevant client)
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
                    //TODO- turned value -> value.id
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