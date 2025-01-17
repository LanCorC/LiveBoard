import bindCanvas from "./bindCanvas.js";
import gameState from "./gameState.js";
import main from "./itemFactory.js";
import { loadAssets } from "./assets.js";

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
let strictDragMode = false;
loadAssets();

//TODO: to be localised; global for now
//purpose: what to scale 'card size' from boards to 'hand's and 'deckPreview's
const cardScale = 0.5;

window.onload = function() {
    //TODO - temporary
    gameState.loadBoard(["Base Deck"]);

    //TODO - create ID, check server (if server, add to server, retrieve gameState; else create gameState)
    const user = {
        id: Date.now(),
        //TODO - UI to choose own color
        color: "white",
        //TODO - UI to choose own name
        name: "Player1"
    };
    gameState.addPlayer(user);

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
    //Uses of hoverElement: detecting player hand, etc
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

    const insertInspectImage = function(item) {
        //if this is 'back' image, do not display
        if(!item || item.index == 0) {
            inspectImage.style.visibility = `hidden`;
            return;
        }
        //TODO to become item.getImage() under 'genericFactory'
        let image = gameState.getImage(item);

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
        //TODO: experimental- item == hoverElement, for 'detect deck'
        if(hoverElement instanceof HTMLCanvasElement) {
            hoverElement = gameState.itemFromRGB(contextTouch, mouse);
        }

        //determine what element has been selected
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

        //assumes the game board
        if(document.elementFromPoint(mouse.x, mouse.y) instanceof HTMLCanvasElement && inspectMode) {
            //for purposes of: looking at items on board

            let item = gameState.itemFromRGB(contextTouch, mouse);
            //used in downstream of 'mousemove'
            hoverElement = item;

            //if valid, assign image to tooltip
            if(item) {
                //prevents hovertooltip on deckDongle
                if(item.isDeck) {
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
        } else if (hoverElement instanceof HTMLImageElement || !inspectMode) {
            //for purposes of: looking at hand, or preview
            //grab the id, or its parent div, or its special attribute 'id' of card
            //then use gameState to find the image
            console.log("Image element found or missing info");
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

        if(inspectImage.style.visibility == "hidden") {
            //check for img to delete
            if(hoverElement.className == "floating-inspect") {
                hoverElement.remove();
                hoverElement = null;
                preventRightClickDefault();
                rightClick = false;
            } else {
                enableRightClickDefault();
            }
            return;
        }
        preventRightClickDefault();

        //same dimensions, image
        let detachedToolTip = new Image(inspectImage.width, inspectImage.height);
        detachedToolTip.style.top = inspectImage.style.top;
        detachedToolTip.style.left = inspectImage.style.left;
        detachedToolTip.style.border = `5px solid white`;

        detachedToolTip.style.position = `absolute`;
        detachedToolTip.style.zIndex = `2`;
        detachedToolTip.style.userSelect = `none`;
        detachedToolTip.classList.add("floating-inspect");
        detachedToolTip.setAttribute("draggable", false);
//        detachedToolTip.setAttribute("inspect-tooltip", "Left: Drag, Right: Close");

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
            console.log("left");
            contextVis.translate(value, 0);
        }
        if(mouse.x > window.innerWidth * (1 - borderProximity)) {
            //pan right
            contextVis.translate(-value, 0);
            console.log("right");
        }
        if(mouse.y < window.innerHeight * borderProximity) {
            //pan top
            contextVis.translate(0, value);
            console.log("top");
        }
        if(mouse.y > window.innerHeight * (1 - borderProximity)) {
            contextVis.translate(0, -value);
            console.log("bottom");
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
        if(itemFocus && !itemFocus.anchored && !strictDragMode) {
//            console.log(hoverElement);
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

        //TODO-temporary
//        let data = contextTouch.getImageData(mouse.x, mouse.y, 1, 1).data;
//        let { 0: r, 1: g, 2: b, 3: t }  = data;
//        console.log(`${r} ${g} ${b}`);

        hoverElement = document.elementFromPoint(mouse.x, mouse.y);
//        console.log(hoverElement);

        //handle tooltip hover- if canvas, finds object
        handleImageTooltip();

        //check for click-hold-drag
        handleDrag(event);

    },false);

    window.addEventListener("mousedown", function(event) {

        //rightclick detected - create 'detached' inspect image
        if(event.buttons == 2) {
            rightClick = true;

            pinInspect(event);

            return;
        //if coming from rightclick, keep startPoint null
        } else if (rightClick) {
            startPoint = null;
            gameState.startPoint = null;
            gameState.offset = null;
        } else {
            startPoint = contextVis.transformPoint(mouse.x, mouse.y);
            gameState.startPoint = startPoint;
            //divide by cardscale reverses preview distortion added when canvasObj->element
            gameState.offset = contextVis.transformPoint(
                event.offsetX/cardScale, event.offsetY/cardScale
            );
//            gameState.offset = { x: event.offsetX/cardScale, y: event.offsetY/cardScale};
            console.log(gameState.offset);
        }

        rightClick = false;
        dragging = false;

        //purpose: determine coords to use for canvas render,
        //dragStart for topOfDeck- to choose deck coords or
        //translate mouseOffset + element offset (within deck preview)
        gameState.hoverIsCanvas = document.elementFromPoint(
            mouse.x, mouse.y) instanceof HTMLCanvasElement;
        console.log(gameState.hoverIsCanvas);

        if((itemFocus = hoverElement)
            instanceof HTMLImageElement) {

            purgeSelected(selected);

            //element, thus keep startPoint untransformed
            startPoint = { x: mouse.x, y: mouse.y };
            elementStartPoint = {
                x: parseInt(itemFocus.style.left),
                y: parseInt(itemFocus.style.top),
            };
            return;
        }

        //TODO - specify for canvas
        itemFocus = gameState.itemFromRGB(contextTouch, mouse);

        //on mousedown, if available, valid item, select and redraw
        if(itemFocus) {
            if(!itemFocus.selected) {
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
        if(!itemFocus || itemFocus instanceof HTMLImageElement) {
        //INVALID - ctrl ? nothing : purge
            if(!strictDragMode) purgeSelected();

        } else if(dragging && strictDragMode) {

            if(!selected.includes(itemFocus)) {
                gameState.deselect(itemFocus);
            }
            //else, user only panned across board. all else preserved

        } else if(dragging && !strictDragMode) {

            if(!selected.includes(itemFocus)) {
                purgeSelected();
                gameState.deselect(itemFocus);
            }
            //else, items were all dragged and all else preserved

        } else if (strictDragMode) {
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
            handleImageTooltip(itemFocus);
            selected.push(itemFocus);
//            console.log("tap!" + ` ${itemFocus.touchStyle}`);

            //if item was already in 'selected', it needs to be reconfirmed
            gameState.select(itemFocus, user);
        }

        itemFocus = null;
        dragging = false;
        gameState.purgeHoverItem();
        redraw();
    }, false);


    //Rotate the board around the mouse, press 'a' or 'd'
    //note: 90 is right angle rotation, 180 is upsidedown, 360 is all the way to normal
    let rotateIncrement = 30;
    let radians = rotateIncrement * Math.PI / 180;

    //TODO: feels it should be global, e.g. center of screen, not mouse
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
                strictDragMode = true;
            default:
                //invalid key, skip processing
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
                strictDragMode = false;
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
        if(strictDragMode) {
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