import server from "./serverConnection.js";
import gameState from "./gameState.js";
import { initialize as initializeAssets } from "./assets.js";

//import

//Purpose: control frontPage controls, 'loading screen', and server status (on/offline)


//TODO- store copy of server? - serve "Server is offline" or "Game: 3 players online"
//if "Reconnect" button -> attempts to call again;

//TODO- pass on "Loading Screen" to assets; or import Assets.js

//TODO: have assets.js have any number of "interface", an object
//TODO cont: have frontPageInterface.js assign all relevant "visual interface"
//TODO: on each specific assets.js interfaceType,
    //if(interface) interface.update("updateMsgString")

//said 'interfaceObj' in THIS module .update() takes the input,
//then manipulates frontPage data


//TODO- load screen elements, objects

//purpose: tracking number of obj assets to load, for user display
let assetCount = {};

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

    //TEMPORARY: testing for buttons, accessibility
    let btns = [serverJoinButton, demoButton, soloButton];
    btns.forEach((btn) => {
        btn.addEventListener("click",
            () => {
                frontPage.style.pointerEvents = "none";
                frontPage.style.opacity = "0";
            });
    })

    serverConnectButton.addEventListener("click",
        () => server.connect(addressInput.value, portInput.value));

    //update methods
    function send(message) {
        miscLoading.innerHTML += message;
    }

    function connectionFailed(message) {
        if(!message) message =
        `Connection to ${addressInput.value}:${portInput.value} failed!`;
        connectionStatus.innerHTML = message;
        serverJoinButton.setAttribute("disabled","");

        enableManualsConnects();
    }
    function connectionSuccess() {
        connectionStatus.innerHTML = "Connection successful!";
        serverJoinButton.removeAttribute("disabled");

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
        arr.forEach((ele) => ele.setAttribute("disabled",""));
    }
    function enableManualsConnects() {
        let arr = [serverConnectButton, addressInput, portInput];
        arr.forEach((ele) => ele.removeAttribute("disabled"));
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

    return { send, increment, connectionSuccess, connectionFailed, connectionStarted };
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
export {frontPage, loading, initialize};