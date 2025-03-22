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
    const frontPage = document.getElementById("textHere1"); //topHalf div

    //tracking properties (array of updates? e.g. list of assets received)

    //apply properties

    //update methods
    function send(message) {
//        frontPage.appendChild(message);
        frontPage.innerHTML += message;
    }

    function connectionFailed() {
        frontPage.innerHTML += "Connection failed";
    }
    function connectionSuccess() {
        frontPage.innerHTML += "Connection successful";
    }

    function increment() { //Purpose: subtle 'miscAssets' loading
        //TODO - reference of frontPage outside of  frontPageInterface.js finds .count obj
        //TODO - but fails to work inside. i've seen this before        //TODO- separate divs

        assetCount.miscCards++;

        let message = `<p>Loading miscellaneous assets...
        ${assetCount.miscCards}/${assetCount.miscCardsExpected}`;

        const pElement = document.createElement("p");
        pElement.innerHTML = message;
        frontPage.appendChild(pElement);
        pElement.scrollIntoView();
    }

    //clear methods

    //animation: fade out (transition to gameboard)

    return { send, increment, connectionSuccess, connectionFailed };
})();

//purpose: handle all loading page,elements: connection to assets on loadscr
const loading = (function() {
    //element reference
    //TODO- front page elements, objects
    //TODO testing: preliminary test to demonstrate "Loaded asset tracking" for loading page; add to div
    const loadingScreen = document.getElementById("textHere2"); //bottomHalf div

    //tracking properties (array of updates? e.g. list of assets received)

    //apply properties

    //update methods
    function send(message) {
//        loadingScreen.appendChild(message);
        loadingScreen.innerHTML += message;
    }

    function increment() {
        assetCount.expansionCards++;

        let message = `<p>Retrieving card image assets...
        ${assetCount.expansionCards}/${assetCount.expansionCardsExpected}`;
        const pElement = document.createElement("p");
        pElement.innerHTML = message;
        loadingScreen.appendChild(pElement);
        pElement.scrollIntoView();
    }

    //clear methods

    //animation: fade out (transition to gameboard)

    return { send, increment };
})();

//TODO- purpose to make sure all reference are passed; i.e. 'serverConnection.js' receives its c
function initialize() {
    //connect to server
    server.initialize(frontPage, loading, gameState);

    //connect to assets, loadscreen
    initializeAssets(frontPage, loading, false, assetCount);
}

//TODO more elements
export {frontPage, loading, initialize};