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


const server = (function() {

    //To hold the WebSocket reference
    let connection = null;

    function connect(address, port) {
        if(!address) address = "localhost";
        if(!port) port = "8080";

        let socket;
        //`ws://localhost:8080`
        socket = new WebSocket(`ws://${address}:${port}`);
        connection = socket;

        socket.onopen = function(event) {
            console.log(event);
            console.log("whoop?");
            //TODO - update frontPage buttons/headers of connection
        }

        socket.onclose = function(event) {
            if(event.wasClean) {
                console.log("Disconnected successfully");
            } else {
                //also triggers if connection attempt fails (server offline)
                console.log("Something went wrong!")
            }

            //TODO - update frontPage buttons/headers of connection
        }

//        socket.onmessage = function(event) {
//            console.log(event);
//            console.log("whoopie?");
//        }
    }

    function disconnect() {
        connection.close();
    }

    return { connect, connection, disconnect };
})();

export default server;