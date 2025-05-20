import server from "/js/serverConnection.js";
import gameState from "/js/gameState.js";
import { initialize as initializeAssets } from "/js/assets.js";
import { createChat } from "/js/boardInterface.js";

//Purpose: control frontPage controls, 'loading screen', and server status (on/offline)

//purpose: tracking number of obj assets to load, for user display
let assetCount = {};
let tools = {
    disable: function(element) {
        element.setAttribute("disabled","");
    },
    enable: function(element) {
        element.removeAttribute("disabled");
    },
    assetReady: false,
    miscReady: false,
    readyFunc: function(){}, //purpose: initialized in frontPage, on trigger, readies buttons
    chat: undefined
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
            tools.chat.joinChat(true);
        } else { //fetch
            //TODO somehow; reveal only after loaded; maybe connect to after rebuildBoard
            server.fetchGameState();
            console.log("Fetching gamestate...");
            gameLoadMessage("Fetching gameState from server");
        }

        revealGame();

        tools.disable(serverJoinButton);
    });

    demoButton.addEventListener("click", async() => {
        server.disconnect(1000, "Client is loading: DEMO");
        gameLoadMessage("Setting up board...");
        await gameState.rebuildBoard("","","",true);
//        tools.redraw();
        gameLoadMessage("Revealing board!");
        revealGame();

//        tools.disable(demoButton);
//        tools.enable(soloButton);
    });

    //Note: not async, never had an issue with redraw() and asset onload mismatch
    soloButton.addEventListener("click", () => {
        server.disconnect(1000, "Client is loading: SOLO");

        gameLoadMessage("Setting up board...");
        gameState.loadBoard();
//        tools.redraw();
        gameLoadMessage("Revealing board!");
        revealGame();

        //Keep: Important; if you dont click out + !disabled, spacebar retriggers
        //NOTE: frontpage.visibility = hidden; seems to prevent this ancient bug
//        tools.disable(soloButton);
//        tools.enable(demoButton);
//        tools.enable(soloButton);
    });

    function revealGame() {
        frontPage.style.visibility = "hidden";
    }
    function hideGame() {
        frontPage.style.visibility = ""; //initial
    }

    serverConnectButton.addEventListener("click",
        () => server.connect(addressInput.value));

    function gameLoadMessage(message) {
        gameLoading.innerHTML = message;
    }

    //update methods
    function send(message) {
        miscLoading.innerHTML += message;
    }

    function connectionFailed(message) {
        if(!message) message =
        `Connection to ${addressInput.value} failed!`;
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
        if(tools.assetReady && tools.miscReady) {
            tools.enable(serverJoinButton);
        }

//        disableManualsConnects();
    }
    function connectionStarted(address) {
        connectionStatus.innerHTML = `Establishing connection... ${address}`;
        addressInput.value = address;

//        disableManualsConnects();
    }

    function disableManualsConnects() {
        let arr = [serverConnectButton, addressInput];
        arr.forEach((ele) => tools.disable(ele));

    }
    function enableManualsConnects() {
        let arr = [serverConnectButton, addressInput];
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
            tools.readyFunc("misc");
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

    //User customization (name, color)
    const customizeContainer = document.getElementById("playerCustomizeContainer");
    const userNameInput = document.getElementById("playerName");
    const userColorInput = document.getElementById("playerColor");
    const randomizer = document.getElementById("randomUser");
    const player = gameState.clientUser;

    //initialize default values
    function namePlaceholder() {
        userNameInput.placeholder = player.name;
        userNameInput.value = player.name;
        userColorInput.value = player.color; //#ff0022 hexadec format
    }
    namePlaceholder();

    randomizer.addEventListener("click", ()=> {
        gameState.rerollUser();
        namePlaceholder(); //tested- triggers onchange and pushes to server
    });

    //Details: use a gameState function to manipulate user info;
    //and in that gameState function, it'll update server for us
    userNameInput.onchange = function(event) {
        gameState.changeUserName(userNameInput.value);
    }
    userColorInput.onchange = function(event) {
        gameState.changeUserColor(userColorInput.value);
    }

    function toggleHomescreen() {
        //NOTE: toggles homescreen visibility
        frontPage.style.visibility ? hideGame() : revealGame();

        //NOTE: only toggles customize container
//        let initial = customizeContainer.style.visibility != "initial";
//        customizeContainer.style.visibility = initial ? "initial" : "hidden";
    }

    //ensures both misc and assets are ready before enabling 'demo' 'solo'
    tools.readyFunc = function(key) {
        if(!key) return;
        switch(key) {
            case "misc":
                tools.miscReady = true;
                break;
            case "asset":
                tools.assetReady = true;
                break;
            default:
                break;
        }
        if(tools.assetReady && tools.miscReady) {
            demoButton.removeAttribute("disabled");
            soloButton.removeAttribute("disabled");
            document.getElementById("ESCAPEtag").style.visibility = "inherit";
            //if server ready, enable
            if(server.connection.readyState == 1) {
                serverJoinButton.removeAttribute("disabled");
            }
        }
    }

    const helpDialog = document.getElementById("instructionsDialog");
    const openHelp = document.getElementById("openHelp");
    const closeHelp = document.getElementById("closeHelp");

    openHelp.addEventListener("click", ()=>{
        helpDialog.showModal();
    });
    closeHelp.addEventListener("click", ()=>{
        helpDialog.close();
    });
    helpDialog.addEventListener("click", (event) => {
        if(event.target == helpDialog) helpDialog.close();
    });

    const creditsDialog = document.getElementById("creditsDialog");
    const openCredits = document.getElementById("openCredits");
    //    const closeHelp = document.getElementById("closeHelp");

    openCredits.addEventListener("click", ()=>{
        creditsDialog.showModal();
    });
    creditsDialog.addEventListener("click", (event) => {
        if(event.target == creditsDialog) creditsDialog.close();
    });

    const rulesDialog = document.getElementById("rulesDialog");
    const openRules = document.getElementById("openRules");

    openRules.addEventListener("click", ()=>{
        rulesDialog.showModal();
    });
    rulesDialog.addEventListener("click", (event) => {
        if(event.target == rulesDialog) rulesDialog.close();
    });

    const aboutDialog = document.getElementById("aboutDialog");
    const openAbout = document.getElementById("openAbout");

    openAbout.addEventListener("click", ()=>{
        aboutDialog.showModal();
    });
    aboutDialog.addEventListener("click", (event) => {
        if(event.target == aboutDialog) aboutDialog.close();
    });

    return { send, increment, connectionSuccess, connectionFailed, connectionStarted, gameLoadMessage,
    gameBoardReady, toggleHomescreen, namePlaceholder};
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
            tools.readyFunc("asset");
        }
        loadingScreen.innerText = message;
    }

    return { send, increment };
})();

//TODO- purpose to make sure all reference are passed; i.e. 'serverConnection.js' receives its c
function initialize() {
    tools.chat = createChat(gameState.clientUser);

    //connect to server
    server.initialize(frontPage, loading, gameState, tools.chat);

    //connect to assets, loadscreen
    initializeAssets(frontPage, loading, false, assetCount);

    //connect gameState to frontPage
    gameState.frontPage = {frontPage, loading};
}

//TODO more elements
export {frontPage, loading, initialize, tools};