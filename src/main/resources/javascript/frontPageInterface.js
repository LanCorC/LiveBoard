import server from "./serverConnection.js";
import gameState from "./gameState.js";
import { initialize as initializeAssets } from "./assets.js";

//Purpose: control frontPage controls, 'loading screen', and server status (on/offline)

//purpose: tracking number of obj assets to load, for user display
let assetCount = {};
let tools = {
    disable: function(element) {
        element.setAttribute("disabled","");
    },
    enable: function(element) {
        element.removeAttribute("disabled");
    }
}; //store 'outside functions' like context redraw

//purpose: handle all frontPage - connect button, load board, [join lobby?]
const frontPage = (function() {
    //element reference
    //TODO- front page elements, objects
    //TODO testing: preliminary test to demonstrate "Loaded asset tracking" for loading page; add to div
    const frontPage = document.getElementById("frontPage");

    const miscLoading = document.getElementById("miscLoad");
    const connectionStatus = document.getElementById("connectionStatus"); //topHalf div

    const serverConnectButton = document.getElementById("connectButton");
    const addressInput = document.getElementById("address");
    const portInput = document.getElementById("port");

    //TODO- if server.gameState exists, reword to "Join Game"; client loads gameState from server
    //TODO- if not already, reword to "Start Game"; this client creates then passes to server
    const serverJoinButton = document.getElementById("serverJoin");
    //TODO: soloButton loads from scratch;
    //TODO: demoButton loads from a "simulated" snapshot
    const demoButton = document.getElementById("loadDemo");
    const soloButton = document.getElementById("loadSolo");

    const gameLoading = document.getElementById("gameLoad");

    //TODO- fetch gameState from server, then set up board
    //OR set up board and send new gameState to server
    serverJoinButton.addEventListener("click", ()=>{

        //if server has NOT returned any "gameStates"s already,
        //Create game
        if(!server.gameStatus) {
            gameState.loadBoard(); //also pushes to gameState
        } else { //fetch
            //TODO somehow; reveal only after loaded; maybe connect to after rebuildBoard
            server.fetchGameState();
            console.log("Fetching gamestate...");
            gameLoadMessage("Fetching gameState from server");
        }

        revealGame();

        //server.gameStatus

        tools.disable(serverJoinButton);
    });

    demoButton.addEventListener("click", async() => {
        server.disconnect(1000, "Client is loading: DEMO");
        gameLoadMessage("Setting up board...");
        await gameState.rebuildBoard("","","",true);
        tools.redraw();
        gameLoadMessage("Revealing board!");
        revealGame();

        tools.disable(demoButton);
    });

    //Note: not async, never had an issue with redraw() and asset onload mismatch
    soloButton.addEventListener("click", () => {
        server.disconnect(1000, "Client is loading: SOLO");

        gameLoadMessage("Setting up board...");
        gameState.loadBoard();
        tools.redraw();
        gameLoadMessage("Revealing board!");
        revealGame();

        //Keep: Important; if you dont click out + !disabled, spacebar retriggers
        tools.disable(soloButton);
    });

    function revealGame() {
        frontPage.style.pointerEvents = "none";
        frontPage.style.opacity = "0";
    }
    function hideGame() {
        frontPage.style.pointerEvents = "default";
        frontPage.style.opacity = "1";
    }

    serverConnectButton.addEventListener("click",
        () => server.connect(addressInput.value, portInput.value));

    function gameLoadMessage(message) {
        gameLoading.innerHTML = message;
    }

    //update methods
    function send(message) {
        miscLoading.innerHTML += message;
    }

    function connectionFailed(message) {
        if(!message) message =
        `Connection to ${addressInput.value}:${portInput.value} failed!`;
        connectionStatus.innerHTML = message;

        tools.disable(serverJoinButton);

        enableManualsConnects();
    }

    let hostAddress = "";
    function connectionSuccess(address) {
        let innerHtml;
        if(!hostAddress){
            hostAddress = address || "";
        }

        innerHtml = "Connected successfully! Hosting at: " + hostAddress;

        connectionStatus.innerHTML = innerHtml;
        tools.enable(serverJoinButton);

        disableManualsConnects();
    }
    function connectionStarted(address, port) {
        connectionStatus.innerHTML = `Establishing connection... ${address}:${port}`;
        addressInput.value = address;
        portInput.value = port;

        disableManualsConnects();
    }

    function disableManualsConnects() {
        let arr = [serverConnectButton, addressInput, portInput];
        arr.forEach((ele) => tools.disable(ele));

    }
    function enableManualsConnects() {
        let arr = [serverConnectButton, addressInput, portInput];
        arr.forEach((ele) => tools.enable(ele));
    }

    function increment() { //Purpose: subtle 'miscAssets' loading
        //TODO - reference of frontPage outside of  frontPageInterface.js finds .count obj
        //TODO - but fails to work inside. i've seen this before        //TODO- separate divs

        assetCount.miscCards++;

        let message =
        `Loading miscellaneous assets...${assetCount.miscCards}/${assetCount.miscCardsExpected}`;

        if(assetCount.miscCards==assetCount.miscCardsExpected) {
            message = "Misc loading: Complete!";
        }
        miscLoading.innerText = message;
    }

    function gameBoardReady(boolean) {
        if(boolean) {
            //true, - "Join Game";      //future: default for 'non PartyLeader'
            serverJoinButton.innerText = "Join Game";
        } else {
            //false, - "Start Game"     //future: default for 'PartyLeader'
            serverJoinButton.innerText = "Start Game";
        }
    }

    return { send, increment, connectionSuccess, connectionFailed, connectionStarted, gameLoadMessage,
    gameBoardReady};
})();

//purpose: handle all loading page,elements: connection to assets on loadscr
const loading = (function() {
    //element reference
    //TODO- front page elements, objects
    //TODO testing: preliminary test to demonstrate "Loaded asset tracking" for loading page; add to div
    const loadingScreen = document.getElementById("assetLoad"); //bottomHalf div
    const demoButton = document.getElementById("loadDemo");
    const soloButton = document.getElementById("loadSolo");
    //tracking properties (array of updates? e.g. list of assets received)

    //apply properties

    //update methods
    function send(message) {
        loadingScreen.innerHTML += message;
    }

    function increment() {
        assetCount.expansionCards++;

        let message =
        `Retrieving card image assets...${assetCount.expansionCards}/${assetCount.expansionCardsExpected}`;

        if(assetCount.expansionCards==assetCount.expansionCardsExpected) {
            message = "Asset loading: Complete!";
            demoButton.removeAttribute("disabled");
            soloButton.removeAttribute("disabled");
        }
        loadingScreen.innerText = message;
    }

    return { send, increment };
})();

//TODO- purpose to make sure all reference are passed; i.e. 'serverConnection.js' receives its c
function initialize() {
    //connect to server
    server.initialize(frontPage, loading, gameState);

    //connect to assets, loadscreen
    initializeAssets(frontPage, loading, false, assetCount);

    //connect gameState to frontPage
    //TODO: have gameState push updates, "Fetching gameState..." "Setting up board..."
    gameState.frontPage = {frontPage, loading};
}

//TODO more elements
export {frontPage, loading, initialize, tools};