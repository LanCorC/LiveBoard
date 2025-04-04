import bindCanvas from "./bindCanvas.js";
import gameState from "./gameState.js";
//import main from "./itemFactory.js";
import { loadAssets, assets } from "./assets.js";
import * as userInterface from "./boardInterface.js";
import server from "./serverConnection.js";
import * as pregameInterface from "./frontPageInterface.js";

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
let strictPanMode = false; //hold-CTRL: strict pan mode
let pinBoard = false;

//TODO- to move to an appropriate file/module + incorporate into user interface, e.g. select desired expansions...


//server.connect();

//TODO- ordering initialization
//First; frontpage loads, then connects to Server immediately for a connection;
    //ALL WHILST also connects to assets loading misc/ loading page for expansions
//lastly, gameState <-> server = fetch player info, gameState.items from server copy
    //gameState loads as empty players, fetches server playerList (if any), then adds self

//TODO- frontpage(+loadscreen) connects with serverConnection
pregameInterface.initialize();
//TODO- assets connects with frontpage/loadscreen
//TODO- gameState connects with serverConnection
const expansionsToLoad = ["Base Deck"];
loadAssets(expansionsToLoad);


window.onload = function() {
    //TODO - check server (if server, add to server, retrieve gameState; else create gameState)
    //Establishes uniqueID to storage if not already
    const user = gameState.initializeUser();
    //Connection 'requires' uniqueID to gauge new or old connection
    server.connect();

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

    let startPoint;
    let dragging = false;

    const redraw = function() {
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

    pregameInterface.tools.redraw = redraw;

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

    //TODO- try make inspect work on a deck
    //isPreview - boolean, to say: viewing from HTMLImageElement deck/hand preview
    const insertInspectImage = function(item, isPreview) {
        //if this is 'back' image, do not display
        if(!item || (item.index == 0 && !isPreview)) {
            inspectImage.style.visibility = `hidden`;
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

    const pinInspect = function(event) {
        //Purpose - 'pinning' an inspection 'img' for an image ref

        //TODO TBD: potential... allowing or not allowing 'pin' for handView/deckView
        if(inspectImage.style.visibility == "hidden") {
            //check valid element img to delete
            if(hoverElement instanceof HTMLImageElement && hoverElement.className == "floating-inspect") {
                hoverElement.remove();
            } else if (hoverElement instanceof HTMLCanvasElement &&
            gameState.itemFromRGB(contextTouch, mouse) == null) {
                //TODO- this is a bandaid;
                //TODO- maybe allow this for other divs
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
    let panRate = 15; //speed
    let recallTime = 10;
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
        if(changed) redraw();

        //redrawing twice? see: called by handleDrag
        if(dragging || pinBoard){
            window.setTimeout(handleEdgePan, recallTime);
            handleEdgePanlooping = true;
        } else {
            handleEdgePanlooping = false;
        }
    }

    const handleDrag = function(event) {
        //TODO: will be adapted to read currentElement, for hand<->canvas transitions
        //TODO: as well as dragToDeck visual queues
        if(!startPoint) {
            return;
        }

        //Drag item or canvas
        let point = contextVis.transformPoint(mouse.x, mouse.y);
        let dx = point.x - startPoint.x;
        let dy = point.y - startPoint.y;
        //TODO - send .anchored check to gameState
        if(itemFocus && !itemFocus.anchored && !strictPanMode) {
            if(itemFocus instanceof HTMLImageElement) {
                dragElement(event, itemFocus);
            } else
            //in group, move all items
                    //TODO - include hoverElement in gameState.dragItems() as reference whether to trigger 'deck'
                    //Keep it simple for now, then see how it feels - only put the special symbol on the 'recipient'
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
        redraw();
    }

    window.addEventListener("mousemove", function(event) {
        //track mouse
//        mouse.x = event.offsetX;
//        mouse.y = event.offsetY;
        mouse.x = event.pageX;
        mouse.y = event.pageY;

        hoverElement = document.elementFromPoint(mouse.x, mouse.y);
        gameState.hoverIsCanvas(hoverElement instanceof HTMLCanvasElement);
//        console.log(itemFocus);
//        console.log(gameState.itemFromRGB(contextTouch, mouse));

        if (document.elementFromPoint(mouse.x, mouse.y) instanceof HTMLCanvasElement)
        hoverElement = gameState.itemFromRGB(contextTouch, mouse);

        //handle tooltip hover- if canvas, finds object
        handleImageTooltip();

        //TODO-test for using nonCanvas element ref to 'hand/deck' preview
//        if(hoverElement && Object.hasOwn(hoverElement, "deck")) {
//            hoverElement = hoverElement.deck;
//        }
//
//        console.log(hoverElement);

        //check for click-hold-drag
        handleDrag(event);

    },false);

    window.addEventListener("mousedown", function(event) {

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
            gameState.startPoint(null);
            gameState.offset(null);
        } else {
            //Valid drag/select point
            startPoint = contextVis.transformPoint(mouse.x, mouse.y);
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

        if(isPreviewCard) {
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

            //TODO- test with 1+ players, if still valid on items selected by OTHER client
            if(itemFocus.selected == user.id                            //Generic shallow check
            || itemFocus.deck && (itemFocus.deck.selected == user.id    //Deck check
            || itemFocus.deck.isHand && itemFocus.deck.id == user.id && !itemFocus.deck.browsing) //ownHand check
            ) {
                server.requestFreePass = true;
                console.log("VIP request! Already selected by clientUser.");
            } else {
                server.requestFreePass = false;
                console.log("Guest request! Requires server permission. Not already selected by clientUser.");
            }

            if(!itemFocus.selected && !itemFocus.anchored) {
                gameState.select(itemFocus, user);
                redraw();
            //else- already claimed by us, de-select
            } else if (itemFocus.selected != user.id) {
                console.log("Item currently in use");
            }
            //where .selected == user.id:
            //handled in 'mouseup', for cases where dragStart
        } else {
            itemFocus = null; //insurance: if HTMLElement, remove from ref;
        }

    }, false);

    window.addEventListener("mouseup", function(event) {
        startPoint = null;

        //TODO - below is 'canvasItem' route; make the other routes (HTMLImageElement)
        //TODO-soon, enabled HTMLImageElement for purposes of deck/hand-preview
        if(!itemFocus || itemFocus instanceof HTMLImageElement) {
        //INVALID - ctrl ? nothing : purge
            if(!strictPanMode) purgeSelected();
        } else if(dragging && strictPanMode) {

            if(!selected.includes(itemFocus)) {
                gameState.deselect(itemFocus);
            }
            //else, user only panned across board. all else preserved

        } else if(dragging && !strictPanMode) {

            gameState.correctCoords(selected, itemFocus);

            //deselect if: drag not in selected[] or was dragged into a deck
            if(!selected.includes(itemFocus)) {
                gameState.addToDeck(itemFocus, hoverElement);
                purgeSelected();
                gameState.deselect(itemFocus);
            } else if(gameState.addToDeck(selected, hoverElement)){
                purgeSelected();
            }
            //else, items were all dragged and all else preserved

        } else if (strictPanMode) {
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

    //TODO- include interaction of OpponentHand [boardInterface.js is relevant]
        //handles 'previewDivElement' selection, de-selection
        if(rightClick && gameState.hoverIsCanvas()) {
            const item = gameState.itemFromRGB(contextTouch, mouse);

            //out of select-> lets us pan, or drag things into deck/opponentHand
            gameState.selectView(item);

            //unique to gameMat, playMat => let item cycle backwards on rClick
            if(item && Object.hasOwn(item, "anchored")) {
                gameState.cycleImage(item, -1);
            }

        };

        rightClick = false;
        itemFocus = null;
        dragging = false;
        gameState.purgeHoverItem();
        redraw();
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

        console.log(user.position);

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
        redraw();
    }

    window.addEventListener("keydown", function(event){
        //TODO - future, if chatbox or input box, send null
        let key = hoverElement instanceof HTMLInputElement ? null : event.code;
        switch(key) {
            //TODO: inspect size is not final; to move to buttons
            case "KeyZ":
                increaseInspectSize();
                break;
            case "KeyX":
                decreaseInspectSize();
                break;
            case "ControlLeft":
            case "ControlRight":
                strictPanMode = true;
                break;
            default:
                //unregistered key, end of processing
//                console.log("invalid key");
                return;
        }
        return;
    }, false);

    //TODO- see how this feels only one item (hoverElement) for feel
    const tapItem = function() {
        if(selected.length != 0) {
            gameState.tapItem(selected);
        } else if (itemFocus) {
            gameState.tapItem(itemFocus);
        } else {
            gameState.tapItem(hoverElement);
        }
        redraw();
    }

    //TODO- player clarity?
    const anchorItem = function() {
        gameState.anchorItem(hoverElement);
        //TODO- see if i must purgeSelected()
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
    }

    window.addEventListener("keyup", function(event){
        //TODO - future, if chatbox or input box, send null
        //TODO - future, if CHATBOX instance is TARGET(focus), aka, activeTyping into, skip processing
        let key = hoverElement instanceof HTMLInputElement ? null : event.code;
        switch(key) {
            case "KeyA":
                handleBoardRotate(false);
                break;
            case "KeyD":
                handleBoardRotate(true);
                break;
            case "KeyI":
                toggleTooltip();
                break;
            case "KeyL":
                anchorItem();
                break;
            case "KeyP": //toggle: prevent board pan
                pinBoard = !pinBoard;
                //This code turns on handleEdgePan loop check always; smooth
                //TODO future- valid alternate mode; no need to drag-pan. hover-pan+scroll
                if(pinBoard) {
                    handleEdgePan();
                }
                break;
            case "KeyR":
                rollDice();
                break;
            //Test code
            case "KeyT":
                console.log(gameState.items);
                redraw();
                break;
            //TODO temp- testing on-demand board refresh 'from JSON'
            case "KeyU":
                console.log("Here we go...");
                gameState.rebuildBoard();
                redraw();
                break;
            //TODO temp- testing purgeSelected, ifItemfocus= user.id, deselect; then itemFocus = null
            //Purpose of testing: in event of 'rejected' request chain (gameActions denied by server)
            case "KeyY":
//                if(itemFocus.selected == user.id) selected.push(itemFocus);
//                purgeSelected();
//                itemFocus = null;

                //Iteration2: clear itemFocus + dragging=false, as opposed to wiping selected[]
                if(itemFocus.selected == user.id) itemFocus.selected = 0; //simulating this is taken by someone else in a gameupdate
                itemFocus = null;
                startPoint = null; //make dragging invalid - works good

                if(selected.includes(itemFocus)) selected.splice(selected.indexOf(itemFocus), 1); //insurance

                break;
            case "ControlLeft":
            case "ControlRight":
                strictPanMode = false;
                break;
            case "Space":
                tapItem();
                break;
            default:
                //unregistered key, end of processing
                //                console.log("invalid key");
                return;
        }
    }, false);

    //[Usage: inserted inside redraw() codeblock]
    function correctTranslation() {
        let {leftBorder, rightBorder, topBorder, bottomBorder, center} = assets.dimensions;

        //notice: x,y;Point
        let leftTopPoint = contextVis.transformPoint(0,0);
        let rightBottomPoint = contextVis.transformPoint(board.clientWidth, board.clientHeight);

        //TODO tbd: see if gameState.correctCoords() affected greatly
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
        let factor = Math.pow(scale, val); //example: scale '2' results in => double (pow2) or half (pow-2 = x0.5)

        if(maxZoomOut && factor < 1) {
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

        redraw();
    };

    const scroll = function(event) {
        //if ctrl is on + scrolling, prevent canvas scroll
        if(strictPanMode) {
            return;
        } else {
            zoom(event.deltaY < 0 ? 1 : -1);
        }
        //Positive deltaY is scrolling down, or 'zooming out', thus smaller scale
    };

    touch.addEventListener("wheel", scroll, {passive: true});

    window.addEventListener('resize', function(event) {
        const vp = document.getElementById("viewport");
        vp.style.height = '100vh';
        vp.style.width = '100vw';
        board.setHeight(window.innerHeight);
        board.setWidth(window.innerWidth);
        console.log("resized");
        user.position = 0;
        centerBoard();
        redraw();
    }, true);

    preventRightClickDefault();

    //itenFactory testing
//    main();
    //For some reason, this needs to be called twice in order to properly capture, as far as tested, "mousedown"
    redraw();
}

//table.src = `https://picsum.photos/50/200`;
board.style.backgroundImage = "url(../Images/backgrounds/flat-mountains.svg)"; //credits: svgbackgrounds.com

function purgeSelected() {
    gameState.deselect(selected);
    selected.length = 0;
}