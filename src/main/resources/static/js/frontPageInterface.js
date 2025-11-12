import server from "./serverConnection.js";
import gameState from "./gameState.js";
import { initialize as initializeAssets } from "./assets.js";
import { createChat } from "./boardInterface.js";
import { createSmallBody, Element} from "./tinyContentHtml.js";

const defaultProjectHost = "https://liveboard.onrender.com";
const defaultHowTo = "https://github.com/LanCorC/LiveBoard/tree/master?tab=readme-ov-file#prerequisites";
const verboseTroubleshoot = false;

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
    chat: undefined,
    leaveGame: undefined
}; //store 'outside functions' like context redraw

//purpose: handle all frontPage - connect button, load board, [join lobby?]
const frontPage = (function() {
    //element reference
    const frontPage = document.getElementById("frontPage");

    const miscLoading = document.getElementById("miscLoad");
    const connectionStatus = document.getElementById("connectionStatus"); //topHalf div

    const serverConnectButton = document.getElementById("connectButton");
    const addressInput = document.getElementById("address");

    const serverJoinButton = document.getElementById("serverJoin");
    const demoButton = document.getElementById("loadDemo");
    const soloButton = document.getElementById("loadSolo");

    const gameLoading = document.getElementById("gameLoad");

    //OR set up board and send new gameState to server
    serverJoinButton.addEventListener("click", ()=>{

        //if server has NOT returned any "gameStates"s already,
        //Create game
        if(!server.gameStatus) {
            gameState.loadBoard(); //also pushes to gameState
            tools.chat.joinChat(true);
        } else { //fetch
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
        gameState.rebuildBoard("","","",true);
//        tools.redraw();
        gameLoadMessage("Revealing board!");
        revealGame();

//        tools.disable(demoButton);
//        tools.enable(soloButton);
        tools.chat.join("DEMO");
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
        tools.chat.join("SOLO");
    });

    const leaveGame = function() {
        server.disconnect(1000, "Client has left the game.");
            gameLoadMessage("You have left the game. Refresh [F5] or press [&#10226;] above to reconnect.");
            server.inGame = false;
            hideGame();
    }.bind(this);

    tools.leaveGame = leaveGame;

    function revealGame() {
        frontPage.style.visibility = "hidden";
    }
    function hideGame() {
        frontPage.style.visibility = ""; //initial
    }

    //serverConnectButton toggles between 'edit addressInput' and 'Connect'
    let serverConnectButtonConnect = function() {
        tools.disable(addressInput);
//        server.connect(addressInput.value);
        server.preconnect(addressInput.value);
        serverConnectButton.onclick = serverConnectButtonEdit;
        serverConnectButton.innerHTML = `&#9997;`;
    }
    let serverConnectButtonEdit = function() {
        tools.enable(addressInput);
        serverConnectButton.onclick = serverConnectButtonConnect;
        serverConnectButton.innerHTML = `Connect`;
    }
    document.getElementById("defaultConnectButton").onclick = () => {
//        server.connect();
        server.preconnect();
    }
    serverConnectButton.onclick = serverConnectButtonEdit;

    function gameLoadMessage(message) {
        if(typeof message == "string") {
            gameLoading.innerHTML = message;
            return;
        }

        //assumes message is html object,
        gameLoading.innerHTML = '';
        gameLoading.append(message);
    }

    function howToConnect() {
        gameLoadMessage(
            createSmallBody(
                "To try the live demo, grab a friend and visit ", Element.LINK(defaultProjectHost), "!",
                Element.BREAK(),
                "Or find out how to ", Element.LINK(defaultHowTo, "host your own lobby"), "!"
//                "Note: You must be on a secure website to access non-local servers."
            )
        );
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

        serverConnectButtonConnect();
    }
    function enableManualsConnects() {
        let arr = [serverConnectButton, addressInput];
        arr.forEach((ele) => tools.enable(ele));

        serverConnectButtonEdit();
    }

    function increment() { //Purpose: subtle 'miscAssets' loading

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
            gameLoadMessage("To join the game in session, press [Join Game]!");

            gameLoadMessage(createSmallBody(
                "To join the game in session, press [Join Game]!",
                Element.BREAK(),
                "Or find out how to ", Element.LINK(defaultHowTo, "host your own lobby"), "!"
            ));
        } else {
            //false, - "Start Game"     //future: default for 'PartyLeader'
            serverJoinButton.innerText = "Start Game";
            gameLoadMessage("To start a game session, press [Start Game]!");
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
//            document.getElementById("ESCAPEtag").style.visibility = "inherit";
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

    return { send, increment, connectionSuccess, connectionFailed, connectionStarted, gameLoadMessage, howToConnect,
    gameBoardReady, toggleHomescreen, namePlaceholder, leaveGame};
})();

//purpose: handle all loading page,elements: connection to assets on loadscr
const loading = (function() {
    //element reference
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

//Purpose to make sure all reference are passed; i.e. 'serverConnection.js' receives its link to chat
function initialize() {
    if(verboseTroubleshoot) {
        console.log("Hi, this is initialize() frontPageInterface.js :)");
    }
    tools.chat = createChat(gameState.clientUser);

    //connect to server
    server.initialize(frontPage, loading, gameState, tools.chat);

    //connect to assets, loadscreen
    initializeAssets(frontPage, loading, false, assetCount);

    //connect gameState to frontPage
    gameState.frontPage = {frontPage, loading};

    if(verboseTroubleshoot) {
        console.log("initialize() frontPageInterface.js has reached its end :)");
    }
}

//TODO more elements
export {frontPage, loading, initialize, tools};