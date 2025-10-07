import bindCanvas from "./bindCanvas.js";
import gameState from "./gameState.js";
import { loadAssets, assets } from "./assets.js";
import * as userInterface from "./boardInterface.js";
import server from "./serverConnection.js";
import * as pregameInterface from "./frontPageInterface.js";

//let bindCanvas;
// import("./bindCanvas.js").then(
//    (module) => { bindCanvas = module.default},
//    () => import("/js/bindCanvas.js").then((module) => { bindCanvas = module.default})
//);
//let gameState;
// import("./gameState.js").then(
//    (module) => { gameState = module.default},
//    () => import("/js/gameState.js").then((module) => { gameState = module.default})
//);
//let loadAssets;
//let assets;
// import("./assets.js").then(
//    (module) => ({loadAssets: loadAssets, assets: assets} = module),
//    () => import("/js/assets.js").then((module) => ({loadAssets: loadAssets, assets: assets} = module))
//);
//let userInterface;
// import("./boardInterface.js").then(
//    (module) => { userInterface = module},
//    () => import("/js/boardInterface.js").then((module) => { userInterface = module })
//);
//let server;
// import("./serverConnection.js").then(
//    (module) => { server = module.default},
//    () => import("/js/serverConnection.js").then((module) => { server = module.default})
//);
//let pregameInterface;
// import("./frontPageInterface.js").then(
//    (module) => { pregameInterface = module},
//    () => import("/js/frontPageInterface.js").then((module) => { pregameInterface = module })
//);

//Variables
const board = document.getElementById("gameBoard");
const touch = document.getElementById("touchBoard");
//const table = new Image();
const background = new Image();
let selected = gameState.selected;
let itemFocus; //current item of "mousedown"; added to 'selected' if mouseUp successful
let inspectMode = true; //toggle for InspectMode
let inspectImage = document.getElementById("inspectImage");
let rightClick = false;
let pinBoard = false;


//First; frontpage loads, then connects to Server immediately for a connection;
    //ALL WHILST also connects to assets loading misc/ loading page for expansions
//lastly, gameState <-> server = fetch player info, gameState.items from server copy
    //gameState loads as empty players, fetches server playerList (if any), then adds self

//Prioritize visuals
const backgroundUrl = [
    "url(images/backgrounds/rainbow-vortex.svg)",
    "url(images/backgrounds/hollowed-boxes.svg)",
    "url(images/backgrounds/colorful-stingrays.svg)",
    "url(images/backgrounds/confetti-doodles.svg)"
];
let backgroundIndex = Math.floor(Math.random() * backgroundUrl.length);
board.style.background = backgroundUrl[backgroundIndex];

//exports, delayed, to 'boardInterface.js' for menu/GUI
export const cycleBackground = function() {
    board.style.background = backgroundUrl[++backgroundIndex % backgroundUrl.length];
}.bind(this);
board.height = window.innerHeight;
board.width = window.innerWidth;

//exports, delayed, to 'boardInterface.js' for menu/GUI
export let rotateBoard = undefined;

//exports, delayed, to 'boardInterface.js' for menu/GUI
export let roll2d6 = undefined;

pregameInterface.initialize();

//window.onload = function() {
window.addEventListener("load", (event) => {
    const expansionsToLoad = ["Base Deck"];
    loadAssets(expansionsToLoad);

    //Establishes uniqueID to storage if not already
    const user = gameState.initializeUser();
    //Connection 'requires' uniqueID to gauge new or old connection
    server.connect("");

    //Load all event interactions, draws,
    const contextVis = board.getContext("2d");
    const contextTouch  = touch.getContext("2d", {willReadFrequently : true});
    bindCanvas(board, touch, assets.dimensions);

    board.setHeight(window.innerHeight);
    board.setWidth(window.innerWidth);

    function centerBoard() {
        gameState.translateDimensions(board.clientWidth, board.clientHeight);

        let multiplier = assets.dimensions.minZoomoutTransform;
        let center = assets.dimensions.center;

        //adjust proportions
        contextVis.setTransform(multiplier, 0, 0, multiplier, 0, 0);

        //reverse transform:
        let pt =
        contextVis.transformPoint(board.clientWidth/2, board.clientHeight/2);
        contextVis.translate(pt.x - center.x, pt.y - center.y);
    }
    centerBoard();

    //mouse tracking
    let mouse = {
        x: board.width,
        y: board.height
    };

    let startPoint;         //translated to canvas dimensions
    let startPointReal;     //taken from actual mouse positions
    let dragging = false;

    //purpose: manage 'redraw' loop
    let redrawing = false;
    const redraw = function() {
        redrawing = false;
//        console.log("aw man we drawin'");
        correctTranslation();
        //Clear
        contextVis.save();
        contextTouch.save();
        contextVis.setTransform(1, 0, 0, 1, 0, 0);
        contextVis.clearRect(0,0,board.width,board.height);
        contextVis.restore();
        contextTouch.restore();

        //redraw
//        gameState.drawItems(itemFocus, dragging, contextVis, contextTouch);
        gameState.drawItems(dragging, contextVis, contextTouch);
    };

    //purpose: trigger redraw once per interval;
    const redrawFramesPerSecond = 144; //1000ms => 1s; 60/1000ms == 60fps, 1000/60 == interval per frame
    const redrawInterval = 1000/redrawFramesPerSecond;
    function pulseRedraw() {
        if(!redrawing) {
            redrawing = true;
            window.setTimeout(redraw, redrawInterval);
        }
    }

    //TODO- kinda unused,
    pregameInterface.tools.redraw = redraw;
    gameState.redraw.triggerRedraw = pulseRedraw; //in use

    let inspectImgSize = 1;
    let iISizeMin = 0.2;
    let iISizeMax = 2;
    //Primary use: to understand what underlying 'gameObject' is under the cursor; cards, decks, etc
    //Secondary use: to determine what HTMLElement is under the cursor
    let hoverElement = null;
    //keep above 1.0 to be effective
    let inspectEleResizeFactor = 1.1;

    //for purposes of
    const clearHoverElement = function() {
        //if canvas + canvas object -> set defaults
        //defaults: a) relinquish lock (selected)
        //defaults: b) set null special deck marker

        hoverElement = null;
    }

    const increaseInspectSize = function() {
        if(hoverElement.className == "floating-inspect") {
            hoverElement.height *= inspectEleResizeFactor;
            hoverElement.width *= inspectEleResizeFactor;
            return;
        }
        inspectImgSize = Math.min(iISizeMax, inspectImgSize + 0.1);
        handleImageTooltip();
    }
    const decreaseInspectSize = function() {
        if(hoverElement.className == "floating-inspect") {
            hoverElement.height /= inspectEleResizeFactor;
            hoverElement.width /= inspectEleResizeFactor;
            return;
        }
        inspectImgSize = Math.max(iISizeMin, inspectImgSize - 0.1);
        handleImageTooltip();
    }

    //isPreview - boolean, to say: viewing from HTMLImageElement deck/hand preview
    const insertInspectImage = function(item, isPreview) {
        //if this is 'back' image, do not display
        if(!item || (item.index == 0 && !isPreview)) {
            inspectImage.style.visibility = `hidden`;
            inspectImage.style.top = `${0}px`;
            inspectImage.style.left = `${0}px`;
            return;
        }
        //TODO to become item.getImage() under 'genericFactory'
//        let image = isPreview ? item.getImage() : gameState.getImage(item);
        let image = gameState.getImage(item, isPreview); //if preview, force: frontImg
        if(!image) return;

        inspectImage.style.visibility = `visible`;
        if(dragging) {
            inspectImage.style.opacity = `40%`;
        } else {
            inspectImage.style.opacity = `90%`;
        }
        inspectImage.height = image.height * inspectImgSize;
        inspectImage.width = image.width * inspectImgSize;
        inspectImage.src = image.src;
    }

    const toggleTooltip = function() {
        if(inspectMode) {
            inspectMode = false;
            //hide
            //send to abyss?
            inspectImage.style.visibility = `hidden`;
        } else {
            inspectMode = true;
            //show
            inspectImage.style.visibility = `visible`;
        }
    }
    //turn on, default, leave item hidden
    insertInspectImage();

    const handleImageTooltip = function(event) {

        if(!inspectMode) {
            return;
        }

        let x, y;

        //topLeft of mouse; when cornered
        if(mouse.x > window.innerWidth - inspectImage.width && mouse.y > window.innerHeight - inspectImage.height) {
            y = mouse.y - inspectImage.height;
            x = mouse.x - inspectImage.width;
        } else {
        //default: bottomRight of mouse; 'min' reduces content overflow
            x = Math.min(mouse.x, window.innerWidth - inspectImage.width);
            y = Math.min(mouse.y, window.innerHeight - inspectImage.height);
        }
        inspectImage.style.top = `${y}px`;
        inspectImage.style.left = `${x}px`;

        if(!hoverElement) return insertInspectImage();

        //Canvas route
        if (document.elementFromPoint(mouse.x, mouse.y) instanceof HTMLCanvasElement) {
            //for purposes of: looking at items on board

            let item = hoverElement;
            //used in downstream of 'mousemove'
            hoverElement = item;

            //if valid, assign image to tooltip
            if (item) {
                //prevents hovertooltip on deckDongle
                if (item.isDeck) {
                    insertInspectImage();
                    return;
                };
                switch(item.type) {
                    case "playMat":
                    case "gameMat":
                        break;
                    default:
                        insertInspectImage(item);
                        return;
                }
            }
        //only child image elements of PreviewBox have 'card' property
        } else if (Object.hasOwn(hoverElement, 'card')) {
            //that way, we can just pass through the img.card ref
            if(hoverElement.className == "floating-inspect") {
                insertInspectImage(false, false);
                return;
            }
            insertInspectImage(hoverElement.card, true);
            return;
        }

        insertInspectImage();
    }

    let elementStartPoint = null;
    //generic 'dragElement'
    const dragElement = function(event, element) {

        let dx = mouse.x - startPoint.x;
        let dy = mouse.y - startPoint.y;

        //Math.min, .max ensures item never goes outside client screen
        element.style.top =
        `${Math.min(Math.max(elementStartPoint.y + dy, 0), window.innerHeight - element.height)}px`;
        element.style.left =
        `${Math.min(Math.max(elementStartPoint.x + dx, 0), window.innerWidth - element.width)}px`;
    }

    //Uses: specific prevent rightclick
    const preventRightClickDefault = function() {
        document.addEventListener("contextmenu", preventDefault, false);
    }
    const enableRightClickDefault = function() {
        document.removeEventListener("contextmenu", preventDefault, false);
    }
    const preventDefault = function(event) {
        event.preventDefault();
    }

    //Retired code
    const pinInspect = function(event) {
        //Purpose - 'pinning' an inspection 'img' for an image ref

        if(inspectImage.style.visibility == "hidden") {
            //check valid element img to delete
            if(hoverElement instanceof HTMLImageElement && hoverElement.className == "floating-inspect") {
                hoverElement.remove();
            } else if (hoverElement instanceof HTMLCanvasElement &&
            gameState.itemFromRGB(contextTouch, mouse) == null) {

//                enableRightClickDefault();
                return;
            }
            hoverElement = null;
            preventRightClickDefault();
            return;
        }
        preventRightClickDefault();

        //same dimensions, image
        let detachedToolTip = new Image(inspectImage.width, inspectImage.height);
        detachedToolTip.style.top = inspectImage.style.top;
        detachedToolTip.style.left = inspectImage.style.left;
        detachedToolTip.style.borderColor = `${user.color}`;

        detachedToolTip.classList.add("floating-inspect");
        detachedToolTip.setAttribute("draggable", false);

        //image
        detachedToolTip.onload = document.getElementById("container")
            .appendChild(detachedToolTip);
        detachedToolTip.src = inspectImage.src;
    }

    let borderProximity = 0.05; //border lenience, percentage
    const edgePanMultiplier = 1;
    let panRate = 15 * edgePanMultiplier; //speed
    let recallTime = 10 * edgePanMultiplier;
    let handleEdgePanlooping = false;

    const handleEdgePan = function() {
        let {a, b, c} = contextVis.getTransform().inverse();

        let modifier = a;
        let clientLeft = mouse.x < window.innerWidth * borderProximity;
        let clientRight = mouse.x > window.innerWidth * (1 - borderProximity);
        let clientTop = mouse.y < window.innerHeight * borderProximity;
        let clientBottom = mouse.y > window.innerHeight * (1 - borderProximity);

        switch(user.position) {
            case 1:
                modifier = b;
                [clientLeft, clientRight, clientTop, clientBottom] = [clientBottom, clientTop, clientLeft, clientRight];
                break;
            case 3:
                modifier = c;
                [clientLeft, clientRight, clientTop, clientBottom] = [clientTop, clientBottom, clientRight, clientLeft];
                break;
            default: //position 0, 2
                break;
        }

        let value = panRate * modifier;

        let changed = false;
        if(clientLeft) {
            //pan left (board perspective, not client)
//            console.log("left");
            contextVis.translate(value, 0);
            changed = true;
        }
        if(clientRight) {
            //pan right (board perspective, not client)
            contextVis.translate(-value, 0);
//            console.log("right");
            changed = true;
        }
        if(clientTop) {
            //pan top (board perspective, not client)
            contextVis.translate(0, value);
//            console.log("top");
            changed = true;
        }
        if(clientBottom) {
            //pan bottom (board perspective, not client)
            contextVis.translate(0, -value);
//            console.log("bottom");
            changed = true;
        }

        //limits draws to if mouse is at the edges;
        if(changed) pulseRedraw();

        //redrawing twice? see: called by handleDrag
        if(dragging || pinBoard){
            window.setTimeout(handleEdgePan, recallTime);
            handleEdgePanlooping = true;
        } else {
            handleEdgePanlooping = false;
        }
    }
    const threshold = 10; //pixels, arbitrary
    const handleDrag = function(event) {
        if(!startPoint) {
            return;
        }

        //Touch lenience: 'tap' made accessible by introducing a movement threshold to validate 'moving' attempts
        if(
        !dragging &&
        !event.isTrusted &&     //criteria only enables feature for 'crafted' events (Touch)
        Math.abs(mouse.x - startPointReal.x) + Math.abs(mouse.y - startPointReal.y) < threshold) {
            return;
        }

        //Drag item or canvas
        let point = contextVis.transformPoint(mouse.x, mouse.y);
        let dx = point.x - startPoint.x;
        let dy = point.y - startPoint.y;

        if(itemFocus && !itemFocus.anchored && !event.ctrlKey) {
            if(itemFocus instanceof HTMLImageElement) {
                dragElement(event, itemFocus);
            } else
            //in group, move all items
            if(selected.includes(itemFocus)) {
                //move all items
                gameState.dragItems(dx, dy, selected, dragging, hoverElement, itemFocus);
            } else {
                //not in the group, deselect group, move just the item
                purgeSelected();
                gameState.dragItems(dx, dy, itemFocus, dragging, hoverElement, itemFocus);
            }

            if(!handleEdgePanlooping) {
                handleEdgePan();
            }
        } else if(!pinBoard){
            //move the board
            contextVis.translate(point.x-startPoint.x, point.y-startPoint.y);
        } else {
            console.log(`Board is pinned, preventing from moving across the board: press "P" to unlock`);
        }

        //Placed here, as means to determine (see .dragItems()) whether this is the first
        dragging = true;
        pulseRedraw();
    }

    window.addEventListener("mousemove", function(event) {
        //track mouse
//        mouse.x = event.offsetX;
//        mouse.y = event.offsetY;
        mouse.x = event.pageX;
        mouse.y = event.pageY;

        //Track user movement for online
        gameState.clientMovement(contextVis.transformPoint(mouse.x, mouse.y));

        hoverElement = document.elementFromPoint(mouse.x, mouse.y);
        gameState.hoverIsCanvas(hoverElement instanceof HTMLCanvasElement);
//        console.log(itemFocus);
//        console.log(gameState.itemFromRGB(contextTouch, mouse));

        if (document.elementFromPoint(mouse.x, mouse.y) instanceof HTMLCanvasElement)
        hoverElement = gameState.itemFromRGB(contextTouch, mouse);

        //handle tooltip hover- if canvas, finds object
        handleImageTooltip();

        //check for click-hold-drag
        handleDrag(event);

    },false);

    let longPress = null;
    const longPressInterval = 500; //milliseconds
    const longPressRClick = function(event) {
        if(dragging || startPoint == null) {
//            console.log("boopn't! longpressn't!");
            return;
        }
//        console.log("boop! longpress!");

        const touch = event.changedTouches[0];
        rightClick = true;
        const rightClickEvent = new MouseEvent("mouseup", {
            screenX: touch.screenX,
            screenY: touch.screenY,
            buttons: 2,
            clientX: touch.clientX,
            clientY: touch.clientY,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
            view: window,
            bubbles: true,
            sourceCapabilities: new InputDeviceCapabilities({fireTouchEvents: true})
        });

        if(itemFocus && itemFocus.deck && itemFocus.deck.selected == user.id) {
//            console.log("longpress yippee!");
        } else {
//            console.log("longpress yippeen't :(");
            //reset all 'select'
            purgeSelected();
        }

        let thisFocus = itemFocus;
        //prevents current itemFocus from being 'cycleImage()'-d
        itemFocus = null;

        event.target.dispatchEvent(rightClickEvent);

        //completes 'itemFocus = null', deselecting once finished
        //Important: happens after rightClick. rClick while currently selected means priority-accepted request.
        gameState.deselect(thisFocus);
    };

    window.addEventListener("mousedown", function(event) {
//        console.log("mousedown received");
//        console.log(event);

        //Hover references
        hoverElement = document.elementFromPoint(mouse.x, mouse.y);
        let isPreviewCard = hoverElement ? Object.hasOwn(hoverElement, "card") : false;

        //New request ID
        server.parentRequestID = Date.now();

        if(event.buttons == 2) {
            rightClick = true;

            return;
        } else if (!(hoverElement instanceof HTMLCanvasElement) && !isPreviewCard) {
            //Invalid drag/select point - not Canvas nor PreviewCard
            startPoint = null;
            startPointReal = null;
            gameState.startPoint(null);
            gameState.offset(null);
        } else {
            //Valid drag/select point
            document.body.classList.add("grabbing");
            startPoint = contextVis.transformPoint(mouse.x, mouse.y);
            startPointReal = { x: mouse.x, y: mouse.y };
            gameState.startPoint(startPoint);
            gameState.offset(
                {x: event.offsetX, y: event.offsetY}
            );
        }

        dragging = false;

        //Unused, does not cause issues to keep
        //If ImageElement + not preview, not valid
        if((itemFocus = hoverElement)
            instanceof HTMLImageElement && !isPreviewCard) {

            purgeSelected(selected);

            //element, thus keep startPoint untransformed
            startPoint = { x: mouse.x, y: mouse.y };
            elementStartPoint = {
                x: parseInt(itemFocus.style.left),
                y: parseInt(itemFocus.style.top),
            };
            return;
        }

        if(isPreviewCard && hoverElement instanceof HTMLImageElement) {
            itemFocus = hoverElement.card;
        } else if(gameState.hoverIsCanvas() &&
        (itemFocus = gameState.itemFromRGB(contextTouch, mouse)) &&
        itemFocus.deck && itemFocus.deck.browsing){
            //itemFocus set to null if itemFromRGB null, or itemFocus.deck.browsing==true
            itemFocus = null;
        }

        //TODO important- itemFocus is received, special note for server/VIP requests
        //on mousedown, if available, valid item, select and redraw
        if(itemFocus && !(itemFocus instanceof HTMLElement)) {

            if(itemFocus.selected == user.id                            //Generic shallow check
            || itemFocus.deck && (itemFocus.deck.selected == user.id    //Deck check
            || itemFocus.deck.isHand && itemFocus.deck.id == user.id && !itemFocus.deck.browsing) //ownHand check
            ) {
                server.requestFreePass = true;
//                console.log("VIP request! Already selected by clientUser.");
            } else {
                server.requestFreePass = false;
//                console.log("Guest request! Requires server permission. Not already selected by clientUser.");
            }

            if(!itemFocus.selected && !itemFocus.anchored) {
                gameState.select(itemFocus, user);
                pulseRedraw();
            //else- already claimed by us, de-select
            } else if (itemFocus.selected != user.id) {
//                console.log("Item currently in use");
            }
            //where .selected == user.id:
            //handled in 'mouseup', for cases where dragStart
        } else {
            itemFocus = null; //insurance: if HTMLElement, remove from ref;
        }

    }, false);

    window.addEventListener("mouseup", function(event) {
        startPoint = null;
        document.body.classList.remove("grabbing");

        let markForPurge = false;

        if(!itemFocus || itemFocus instanceof HTMLImageElement) {
        //INVALID - ctrl ? nothing : purge
            if(!event.ctrlKey) markForPurge = true;

        } else if(dragging && event.ctrlKey) {

            if(!selected.includes(itemFocus)) {
                gameState.deselect(itemFocus);
            }
            //else, user only panned across board. all else preserved

        } else if(dragging && !event.ctrlKey) {

            gameState.correctCoords(selected, itemFocus);

            //Boolean switch: end of drag, always deselect all
            let alwaysDeselect = true;
            if(alwaysDeselect) markForPurge = true;

            //deselect if: drag not in selected[] or was dragged into a deck
            if(!selected.includes(itemFocus)) {
                gameState.addToDeck(itemFocus, hoverElement);
                gameState.deselect(itemFocus);
                if(!alwaysDeselect) markForPurge = true;
            } else if (gameState.addToDeck(selected, hoverElement)) {
                if(!alwaysDeselect) markForPurge = true;
            }

        } else if (event.ctrlKey) {
        //NODRAG

            if(selected.includes(itemFocus)) {
                let index = selected.indexOf(itemFocus);
                gameState.deselect(selected.splice(index, 1)); //remove, then de-select x1
            } else {
                selected.push(itemFocus);
            }

        } else {
        //NODRAG noCtrl
            selected.forEach((item) => {
                if(item != itemFocus) {
                    gameState.deselect(item);
                    selected.splice(selected.indexOf(item), 1);
                }
            })
            gameState.cycleImage(itemFocus);

            if(!itemFocus.anchored) {
                handleImageTooltip(itemFocus);
                if(!selected.includes(itemFocus)) selected.push(itemFocus);
            }
        }

        //handles 'previewDivElement' selection, de-selection
        if(rightClick) {
            let item = gameState.itemFromRGB(contextTouch, mouse);

            //Proceed with canvas related rClicks
            if(gameState.hoverIsCanvas()) {

                //unique to gameMat, playMat => let item cycle backwards on rClick
                if(item && Object.hasOwn(item, "anchored")) {
                    gameState.cycleImage(item, -1);
                }

                //out of select-> lets us pan, or drag things into deck/opponentHand
//                let followupRightClick = false;
//                if(!event.ctrlKey) followupRightClick = gameState.selectView(item);
                gameState.permission(gameState.selectView, item);
                //do not ping if selectView was valid
//                if(!followupRightClick) gameState.pingItemToChat(item);
                gameState.pingItemToChat(item);
            } else {
                //Prepare for non-canvas related rClicks
                item = hoverElement;

                //Proceed with non-canvas related rClcks
                if(event.ctrlKey) gameState.pingItemToChat(item);
            }
        };

        if(markForPurge) purgeSelected();

        rightClick = false;
        itemFocus = null;
        dragging = false;
        gameState.purgeHoverItem();
        pulseRedraw();
    }, false);

    //Rotate the board around the mouse, press 'a' or 'd'
    //note: 90 is right angle rotation, 180 is upsidedown, 360 is all the way to normal
    let rotateIncrement = 90;
    let radians = rotateIncrement * Math.PI / 180;

    let maxZoomOut = false; //purpose: early skip zoom() if conditions met

    const handleBoardRotate = function(pos) {
        //centeredOnMouse
//        let point = contextVis.transformPoint(mouse.x, mouse.y);
        //centeredOnScreen
        let point = contextVis.transformPoint(window.innerWidth/2, window.innerHeight/2);

        user.position += pos ? 1 : -1;
        user.position %= 4;
        if(user.position < 0) user.position = 3;

//        console.log(user.position);

        contextVis.translate(+point.x, +point.y);
        contextVis.rotate(pos ? radians : -radians);
        contextVis.translate(-point.x, -point.y);

        switch(user.position) {
            case 1:
            case 3:
                gameState.translateDimensions(board.clientHeight, board.clientWidth);
                break;
            default:
                gameState.translateDimensions(board.clientWidth, board.clientHeight);
        }
        maxZoomOut = false;
        pulseRedraw();
    }.bind(this);

    rotateBoard = handleBoardRotate;

    window.addEventListener("keydown", function(event){
        if(!event.key) return;
        let key = event.key.toUpperCase();
        if(document.activeElement instanceof HTMLInputElement) key = null;

        switch(key) {
            //TODO: inspect size is not final; to move to buttons
            case "Z":
                increaseInspectSize();
                break;
            case "X":
                decreaseInspectSize();
                break;
            default:
                //unregistered key, end of processing
//                console.log("invalid key");
                return;
        }
        return;
    }, false);

    const tapItem = function() {
        if(selected.length != 0) {
            gameState.tapItem(selected);
        } else if (itemFocus) {
            gameState.tapItem(itemFocus);
        } else {
            gameState.tapItem(hoverElement);
        }
        pulseRedraw();
    }

    //TODO- player clarity?
    const anchorItem = function() {
        gameState.anchorItem(hoverElement);
    }

    const rollDice = function() {
//        let ans = new Array(13);
//        ans.fill(0);
//        let times = 5000;
//        for(let i = 0; i < times; i++) {
//            ans[Math.ceil(Math.random() * 6) + Math.ceil(Math.random() * 6)]++;
//        }
//        for(let i = 0; i < ans.length; i++) {
//            ans[i] = ans[i]/times * 100;
//        }
//        console.log(ans);

        //TODO - ping on server, + store as 'latest roll' under clientUser for future 'tracking'
        //elaboration: players may look at each other's badgeName to see the latest rolled value (2D6 => 2-12)
        let result = Math.ceil(Math.random() * 6) + Math.ceil(Math.random() * 6)
        console.log(result);
        return result;
    }

    const roll2d6Text = function() {
        let a = Math.ceil(Math.random() * 6);
        let b = Math.ceil(Math.random() * 6);
        return ` rolled [${a}][${b}] for a total of ${a+b}!`;
    }

    const triggerRollDice = function() {
        let text = roll2d6Text();
        userInterface.userInterface.chatBox.sendChat(text,"ChatUpdate");
        userInterface.userInterface.chatBox.newEntry(text,undefined,"");
    }.bind(this);

    roll2d6 = triggerRollDice;

    let testBool = false;
    window.addEventListener("keyup", function(event){
        if(!event.key) return;
        let key = event.key.toUpperCase();
        if(key != "ESCAPE" && document.activeElement instanceof HTMLInputElement && key != "ENTER") key = null;
        switch(key) {
            case "A":
                handleBoardRotate(false);
                break;
            case "B":
                gameState.logBrokenItems();
                break;
            case "D":
                handleBoardRotate(true);
                break;
            case "I":
                toggleTooltip();
                break;
            case "L":
                anchorItem();
                break;
            case "P": //toggle: prevent board pan
                pinBoard = !pinBoard;
                //This code turns on handleEdgePan loop check always; smooth
                //TODO future- valid alternate mode; no need to drag-pan. hover-pan+scroll
                if(pinBoard) {
                    handleEdgePan();
                }
                break;
            case "R":
                let text = roll2d6Text();
                userInterface.userInterface.chatBox.sendChat(text,"ChatUpdate");
                userInterface.userInterface.chatBox.newEntry(text,undefined,"");
                break;
            //Test code
            case "T":
                break;
            //"U" => testing code for on-demand board refresh 'from JSON'
//            case "U":
//                console.log("Here we go...");
//                gameState.rebuildBoard();
//                pulseRedraw();
//                break;
            //Purpose of testing: in event of 'rejected' request chain (gameActions denied by server)
            case "Y":
//                if(itemFocus.selected == user.id) selected.push(itemFocus);
//                purgeSelected();
//                itemFocus = null;

                //Iteration2: clear itemFocus + dragging=false, as opposed to wiping selected[]
//                if(itemFocus.selected == user.id) itemFocus.selected = 0; //simulating this is taken by someone else in a gameupdate
//                itemFocus = null;
//                startPoint = null; //make dragging invalid - works good
//
//                if(selected.includes(itemFocus)) selected.splice(selected.indexOf(itemFocus), 1); //insurance

                break;
            case "ENTER":
                let UI = userInterface.userInterface;
                if(!UI || !UI.chatBox) return;
                UI.chatBox.toggleInputFocus();
                break;
            //Note: ESCAPE breaks game, stops fetch requests (assets loading) stage
            //Currently, the 'tip' only appears once assets loaded to minimize overexcitement accidents
            case "ESCAPE":
                pregameInterface.frontPage.toggleHomescreen();
                break;
            //Placeholder destination for this function; = cycles through backgrounds
            case "=":
                cycleBackground();
                break;
            case " ":
                tapItem();
                break;
            default:
                //unregistered key, end of processing
//                console.log(`unregistered ${key} from original input ${event.key}`);
                return;
        }
    }, false);

    //[Usage: inserted inside redraw() codeblock]
    function correctTranslation() {
        let {leftBorder, rightBorder, topBorder, bottomBorder, center} = assets.dimensions;

        //notice: x,y;Point
        let leftTopPoint = contextVis.transformPoint(0,0);
        let rightBottomPoint = contextVis.transformPoint(board.clientWidth, board.clientHeight);

        switch(user.position) {
            case 1:
                [topBorder, bottomBorder] = [bottomBorder, topBorder];
                break;
            case 2:
                [leftBorder, rightBorder] = [rightBorder, leftBorder];
                [topBorder, bottomBorder] = [bottomBorder, topBorder];
                break;
            case 3:
                [leftBorder, rightBorder] = [rightBorder, leftBorder];
                break;
            default: //default
                break;
        }

        //Measure pair breach: notice, if both (left:right or top:bottom), = null
        let leftRight = null;
        if(leftTopPoint.x <= leftBorder) {
            leftRight = "left";
        }
        if(rightBottomPoint.x >= rightBorder) {
            //if both, null;
            leftRight = leftRight ? null : "right";
        }

        let topBottom = null;
        if(leftTopPoint.y <= topBorder) {
            topBottom = "top";
        }
        if(rightBottomPoint.y >= bottomBorder) {
            topBottom = topBottom ? null : "bottom";
        }

        if(leftRight == null && topBottom == null) {
            return;
        }

        //Note: if one of a pair has breached, find smallest
        if(leftRight) {
            if(Math.abs(leftTopPoint.x - leftBorder) <
            Math.abs(rightBottomPoint.x - rightBorder)) {
                leftRight = "left";
            } else {
                leftRight = "right";
            }
        }
        if(topBottom) {
            if(Math.abs(leftTopPoint.y - topBorder) <
            Math.abs(rightBottomPoint.y - bottomBorder)) {
                topBottom = "top";
            } else {
                topBottom = "bottom";
            }
        }

        let argX = 0;
        let argY = 0;

        switch (leftRight) {
            case "left":
                argX = leftTopPoint.x - leftBorder; //easy
//                console.log("fix from edge: left!");
                break;
            case "right":
                argX = rightBottomPoint.x - rightBorder; //? translate?
//                console.log("fix from edge: right!");
                break;
            default:
//                console.log("leftRight = null!");
                break;
        }

        switch (topBottom) {
            case "top":
                argY = leftTopPoint.y - topBorder; //easy
//                console.log("fix from edge: top!");
                break;
            case "bottom":
                argY = rightBottomPoint.y - bottomBorder; //? translate?
//                console.log("fix from edge: bottom!");
                break;
            default:
//                console.log("topBottom = null!");
                break;
        }

        contextVis.translate(argX, argY);
    }

    //scrollResize responsiveness multiplier
    let scale = 1.1;

    const zoom = function(val) {
//        console.log("Start of zoom");
        let factor = Math.pow(scale, val); //example: scale '2' results in => double (pow2) or half (pow-2 = x0.5)

        if(maxZoomOut && factor < 1) {
//            console.log("end of zoom- exceeeds maxZoomout");
            return;
        } else {
            maxZoomOut = false;
        }

        let pt = contextVis.transformPoint(mouse.x, mouse.y);

        //a assumed identical to d
        let {a, b, c, d} = contextVis.getTransform();
        let currentMultiplier;

        switch(user.position) {
            case 1:
            case 3:
                currentMultiplier = Math.abs(b); //Math.abs(c) also works
                break;
            case 2:
                currentMultiplier = Math.abs(a);
                break;
            default: //position 0 aka 0*,360*
                currentMultiplier = a;
        }

        //TODO note warning: hard coded; assign to named variable
        //min - arbitrary
        if(factor > 1 && currentMultiplier > 2
        //max - arbitrary, generous allowance
        || factor < 1 && currentMultiplier < 0.05) {
//            console.log("end of zoom- too zoomed in");
            return;
        }

        let override = false;
        let currMinimum = assets.dimensions.minZoomoutTransform;

        if(factor < 1 &&
        currentMultiplier * factor < currMinimum) {
            override = true;
            maxZoomOut = true;
        }

        contextVis.translate(pt.x, pt.y);
        let {e, f} = contextVis.getTransform();
        switch(user.position) {
            case 1:
                if(override) {
                    contextVis.setTransform(0, currMinimum, -currMinimum, 0, e, f);
                } else {
                    contextVis.setTransform(0, currentMultiplier*factor, -currentMultiplier*factor, 0, e, f);
                }
                break;
            case 2:
                if(override) {
                    contextVis.setTransform(-currMinimum, 0, 0, -currMinimum, e, f);
                } else {
                    contextVis.setTransform(-currentMultiplier*factor, 0, 0, -currentMultiplier*factor, e, f);
                }
                break;
            case 3:
                if(override) {
                    contextVis.setTransform(0, -currMinimum, +currMinimum, 0, e, f);
                } else {
                    contextVis.setTransform(0, -currentMultiplier*factor, currentMultiplier*factor, 0, e, f);
                }
                break;
            default:
                if(override) {
                    contextVis.setTransform(currMinimum, b, c, currMinimum, e, f);
                } else {
                    contextVis.scale(factor, factor);
                }
        }
        contextVis.translate(-pt.x, -pt.y);

        pulseRedraw();
//        console.log("End of zoom");
    };

    const scroll = function(event) {
//        console.log("Start of scroll");
        //if ctrl is on + scrolling, prevent canvas scroll
        zoom(event.deltaY < 0 ? 1 : -1);

        //Positive deltaY is scrolling down, or 'zooming out', thus smaller scale
//        console.log("End of scroll");
    };

    touch.addEventListener("wheel", scroll, {passive: true});

    window.addEventListener('resize', function(event) {
        const vp = document.getElementById("viewport");
        vp.style.height = '100vh';
        vp.style.width = '100vw';
        board.setHeight(window.innerHeight);
        board.setWidth(window.innerWidth);
//        console.log("resized");
        user.position = 0;
        centerBoard();
        pulseRedraw();
    }, true);

    preventRightClickDefault();

    let startPinch = false;
    //...are we making our own touchEvents?
    let touchPoints = [];
    let initialLength;

    const pinchzoom = function(event) {
        if(event.touches.length != 2) {
            startPinch = false;
            return;
        }

        //note: touchPoints contains ORIGINAL positions, hence compare length
        let a = event.touches[0];
        let b = event.touches[1];

        const newLength = Math.abs(a.clientX - b.clientX) +
                          Math.abs(a.clientY - b.clientY);
        let result;
        const rate = 0.5;
        if(initialLength < newLength) {
            result = rate; //zooming in
        } else {
            result = -rate; //zooming out
        }

        initialLength = newLength;

        zoom(result);
        return;
    }

    //Touch-event -> Mouse-event / Wheel event
    //https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/MouseEvent
    function onTouch(evt) {

        if (
//        evt.touches.length > 1 ||
        (evt.type === "touchend" && evt.touches.length > 0)) {
            return;
        }

        let type = null;
        let touch = null;
        let buttons = 0; //note: if 'viewmode', mousedown is ==2; else =1

        switch (evt.type) {
        case "touchstart":
            type = "mousedown";
            touch = evt.changedTouches[0];
            buttons = 1; //TODO - =2 is rClick needed for deck view
            if(evt.target instanceof HTMLCanvasElement || evt.target instanceof HTMLImageElement) {
                evt.preventDefault();

                //handles emulating rClick for touch
                if(longPress) {
                    clearTimeout(longPress);
                    longPress = null;
                }
                longPress = setTimeout(longPressRClick, longPressInterval, evt);
            }

            if(evt.touches.length == 2) {
                startPinch = true;
                touchPoints[0] = {
                    x: evt.touches[0].clientX,
                    y: evt.touches[0].clientY
                }
                touchPoints[1] = {
                    x: evt.touches[1].clientX,
                    y: evt.touches[1].clientY
                }
                initialLength = Math.abs(touchPoints[0].x - touchPoints[1].x) +
                                Math.abs(touchPoints[0].y - touchPoints[1].y);
            } else {
                startPinch = false;
            }

            break;
        case "touchmove":
            type = "mousemove";
            touch = evt.changedTouches[0];

            if(startPinch) {
                pinchzoom(evt);
            }

            break;
        case "touchend":
            type = "mouseup";
            touch = evt.changedTouches[0];
            if(evt.target instanceof HTMLCanvasElement || evt.target instanceof HTMLImageElement) {
                evt.preventDefault();
//                target = evt.currentTarget;
            }
            break;
        }

        //'center' of a pinch to prevent dragging tug-of-war between two points (very stuttery)
        let screenX;
        let screenY;
        let clientX;
        let clientY;
        if(evt.touches.length == 2) {
            screenX = (evt.touches[0].screenX + evt.touches[1].screenX)/2;
            screenY = (evt.touches[0].screenY + evt.touches[1].screenY)/2;
            clientX = (evt.touches[0].clientX + evt.touches[1].clientX)/2;
            clientY = (evt.touches[0].clientY + evt.touches[1].clientY)/2;
        }

        let newEvt = new MouseEvent(type, {
            screenX: screenX || touch.screenX,
            screenY: screenY || touch.screenY,
            buttons: buttons,               //TODO - mousedown, value = 2 for rClick pings/deckView
            clientX: clientX || touch.clientX,
            clientY: clientY || touch.clientY,
            ctrlKey: evt.ctrlKey,
            shiftKey: evt.shiftKey,
            altKey: evt.altKey,
            metaKey: evt.metaKey,
            view: window,
            bubbles: true,
            sourceCapabilities: new InputDeviceCapabilities({fireTouchEvents: true})
        });

        //this is a CATCHUP - mousemove is crucial for initializing some references, and affects subsequent mousedown
        if(type == "mousedown") {
            evt.target.dispatchEvent(new MouseEvent("mousemove", {
                    screenX: screenX || touch.screenX,
                    screenY: screenY || touch.screenY,
                    buttons: buttons,               //TODO - mousedown, value = 2 for rClick pings/deckView
                    clientX: clientX || touch.clientX,
                    clientY: clientY || touch.clientY,
                    ctrlKey: evt.ctrlKey,
                    shiftKey: evt.shiftKey,
                    altKey: evt.altKey,
                    metaKey: evt.metaKey,
                    view: window,
                    bubbles: true,
                    sourceCapabilities: new InputDeviceCapabilities({fireTouchEvents: true})
            }));
        }
        evt.target.dispatchEvent(newEvt);
    }

    window.addEventListener("touchstart", onTouch, {passive: false});
    window.addEventListener("touchend", onTouch, {passive: false});
    window.addEventListener("touchcancel", onTouch, {passive: false});
    window.addEventListener("touchmove", onTouch, {passive: false});

    //For some reason, this needs to be called twice in order to properly capture, as far as tested, "mousedown"
    pulseRedraw();
}
);

function purgeSelected() {
    gameState.deselect(selected);
    selected.length = 0;
}