import bindCanvas from "./bindCanvas.js";
import gameState from "./gameState.js";
import main from "./itemFactory.js";
import { loadAssets } from "./assets.js";
import * as userInterface from "./boardInterface.js";

//Variables
const board = document.getElementById("gameBoard");
const touch = document.getElementById("touchBoard");
//const table = new Image();
const background = new Image();
let selected = [];
let itemFocus; //current item of "mousedown"; added to 'selected' if mouseUp successful
let inspectMode = true; //toggle for InspectMode
let inspectImage = document.getElementById("inspectImage");
let rightClick = false;
let strictPanMode = false; //hold-CTRL: strict pan mode

//TODO- to move to an appropriate file/module + incorporate into user interface, e.g. select desired expansions...
const expansionsToLoad = ["Base Deck"];
loadAssets(expansionsToLoad);

window.onload = function() {
    //TODO - temporary -- to refactor as loading the entire board html
    gameState.loadBoard(expansionsToLoad);

    //TODO - create ID, check server (if server, add to server, retrieve gameState; else create gameState)
    const user = {
        id: Date.now(),
        //TODO - UI to choose own color
        color: "red",
        //TODO - UI to choose own name
        name: "Player1"
    };
    //TODO: have gameState create player's 'hand' object via itemFactory.js
    gameState.addPlayer(user);
    userInterface.initializeBoard(user);
    gameState.translateOffset();

    //Load all event interactions, draws,
    const contextVis = board.getContext("2d");
    const contextTouch  = touch.getContext("2d", {willReadFrequently : true});
    bindCanvas(board, touch);

    board.setHeight(window.innerHeight);
    board.setWidth(window.innerWidth);

    //mouse tracking
    let mouse = {
        x: board.width,
        y: board.height
    };

    let startPoint;
    let dragging = false;

    const redraw = function() {
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
        let image = isPreview ? item.getImage() : gameState.getImage(item);
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

        if(!inspectMode || hoverElement == null) {
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
        if (!inspectMode) {
            console.log("Inspect mode is off");
            return;
        } else if (document.elementFromPoint(mouse.x, mouse.y) instanceof HTMLCanvasElement) {
            //for purposes of: looking at items on board

            let item = gameState.itemFromRGB(contextTouch, mouse);
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
        let {a: modifier} = contextVis.getTransform().inverse();
        let value = panRate * modifier;

        if(mouse.x < window.innerWidth * borderProximity) {
            //pan left
//            console.log("left");
            contextVis.translate(value, 0);
        }
        if(mouse.x > window.innerWidth * (1 - borderProximity)) {
            //pan right
            contextVis.translate(-value, 0);
//            console.log("right");
        }
        if(mouse.y < window.innerHeight * borderProximity) {
            //pan top
            contextVis.translate(0, value);
//            console.log("top");
        }
        if(mouse.y > window.innerHeight * (1 - borderProximity)) {
            contextVis.translate(0, -value);
//            console.log("bottom");
        }
        //redrawing twice? see: called by handleDrag
        if(dragging){
            window.setTimeout(handleEdgePan, recallTime);
            handleEdgePanlooping = true;
            redraw();
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
        } else {
            //move the board
            contextVis.translate(point.x-startPoint.x, point.y-startPoint.y);
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
        //rightclick detected - create 'detached' inspect image

        hoverElement = document.elementFromPoint(mouse.x, mouse.y);
        let isPreviewCard = Object.hasOwn(hoverElement, "card");

        if(event.buttons == 2) {
            rightClick = true;

            pinInspect(event);

            return;
        //TODO- exception for HTMLImageElement when dragging in-deck/hand cards
        //"card" property unique to preview image HTML elements
        } else if (!(hoverElement instanceof HTMLCanvasElement) && !isPreviewCard) {
            startPoint = null;
            gameState.startPoint(null);
            gameState.offset(null);
            //TODO- attempt to stop clickthrough to canvas; works; problems TBD
        } else {
            startPoint = contextVis.transformPoint(mouse.x, mouse.y);
            gameState.startPoint(startPoint);
            //divide by cardscale reverses preview distortion added when canvasObj->element
            gameState.offset(
                {x: event.offsetX, y: event.offsetY}
            );
        }

        dragging = false;

        //purpose: determine coords to use for canvas render,
        //dragStart for topOfDeck- to choose deck coords or
        //translate mouseOffset + element offset (within deck preview)
//        gameState.hoverIsCanvas = document.elementFromPoint(
//            mouse.x, mouse.y) instanceof HTMLCanvasElement;
//        console.log(gameState.hoverIsCanvas);

        //exception for MyHand and PreviewDeck imgs
        //"card" property unique to preview image HTML elements
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

        //TODO - specify for canvas - TODO- for cards in hand/preview; assign to .card property; else rework above
//        if(gameState.hoverIsCanvas()) {
//            itemFocus = gameState.itemFromRGB(contextTouch, mouse);
//
//            if(itemFocus && Object.hasOwn(itemFocus, "deck") && itemFocus.deck.browsing) {
//                itemFocus = null;
//            }
//
//        } else if (isPreviewCard) {
//            itemFocus = hoverElement.card;
//        } else {
//            itemFocus = null;
//        }

        if(isPreviewCard) {
            itemFocus = hoverElement.card;
        } else if(gameState.hoverIsCanvas() &&
        (itemFocus = gameState.itemFromRGB(contextTouch, mouse)) &&
        Object.hasOwn(itemFocus, "deck") && itemFocus.deck.browsing){
            //itemFocus set to null if itemFromRGB null, or itemFocus.deck.browsing==true
            itemFocus = null;
        }

        //on mousedown, if available, valid item, select and redraw
        if(itemFocus) {
            //'anchored' unique to gameMat, playMat => filter out
            if(!itemFocus.selected && !Object.hasOwn(itemFocus, "anchored")) {
                gameState.select(itemFocus, user);
                redraw();
            //else- already claimed by us, de-select
            } else if (itemFocus.selected != user.id) {
                console.log("Item currently in use");
            }
            //where .selected == user.id:
            //handled in 'mouseup', for cases where dragStart
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
            purgeSelected();
            gameState.cycleImage(itemFocus);

            //unique to gameMat, playMat; prevent gameMat, playMat from being selected
            if(!Object.hasOwn(itemFocus, "anchored")) {
                handleImageTooltip(itemFocus);
                selected.push(itemFocus);

                //if item was already in 'selected', it needs to be reconfirmed
                gameState.select(itemFocus, user);
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
    let rotateIncrement = 30;
    let radians = rotateIncrement * Math.PI / 180;

    const handleBoardRotate = function(pos) {
        //centeredOnMouse
//        let point = contextVis.transformPoint(mouse.x, mouse.y);
        //centeredOnScreen
        let point = contextVis.transformPoint(window.innerWidth/2, window.innerHeight/2);

        contextVis.translate(+point.x, +point.y);
        contextVis.rotate(pos ? radians : -radians);
        contextVis.translate(-point.x, -point.y);

        redraw();
    }

    window.addEventListener("keydown", function(event){
        //TODO - future, if chatbox or input box, send null
        let key = hoverElement instanceof HTMLInputElement ? null : event.code;
        switch(key) {
            case "KeyA":
                handleBoardRotate(false);
                break;
            case "KeyD":
                handleBoardRotate(true);
                break;
            //TODO: inspect size is not final; to move to buttons
            case "KeyZ":
                increaseInspectSize();
                break;
            case "KeyX":
                decreaseInspectSize();
                break;
            case "KeyI":
                toggleTooltip();
                return;
            case "ControlLeft":
            case "ControlRight":
                strictPanMode = true;
            default:
                //unregistered key, end of processing
//                console.log("invalid key");
                return;
        }
    }, false);

    window.addEventListener("keyup", function(event){
        //TODO - future, if chatbox or input box, send null
        let key = hoverElement instanceof HTMLInputElement ? null : event.code;
        switch(key) {
            case "ControlLeft":
            case "ControlRight":
                strictPanMode = false;
            default:
                //invalid key, skip processing
                //                console.log("invalid key");
                return;
        }
    }, false);

    //scrollResize responsiveness multiplier
    let scale = 1.1;

    const zoom = function(val) {
        let factor = Math.pow(scale, val); //example: scale '2' results in => double (pow2) or half (pow-2 = x0.5)
        let pt = contextVis.transformPoint(mouse.x, mouse.y);
        contextVis.translate(pt.x, pt.y);
        contextVis.scale(factor, factor);
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
//    touch.addEventListener("wheel", scroll);

    window.addEventListener('resize', function(event) {
        const vp = document.getElementById("viewport");
        vp.style.height = '100vh';
        vp.style.width = '100vw';
        board.setHeight(window.innerHeight);
        board.setWidth(window.innerWidth);
        console.log("resized");
        gameState.translateOffset();
        redraw();
    }, true);

    //summon items
    main();
    //For some reason, this needs to be called twice in order to properly capture, as far as tested, "mousedown"
    redraw();
}

//table.src = `https://picsum.photos/50/200`;
board.style.backgroundImage = "url(../Images/backgrounds/flat-mountains.svg)"; //credits: svgbackgrounds.com

function purgeSelected() {
    gameState.deselect(selected);
    selected.length = 0;
}