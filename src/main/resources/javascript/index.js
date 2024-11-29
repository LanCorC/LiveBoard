import bindCanvas from "./bindCanvas.js";
import gameState from "./gameState.js";
import main from "./itemsObjects.js";
import { directoryTest } from "./assets.js";

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

//console.log(a);
directoryTest();

window.onload = function() {
//    console.log("im begging");

    //Load all event interactions, draws,
    const context = board.getContext("2d");
    const context2  = touch.getContext("2d", {willReadFrequently : true});
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
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0,0,board.width,board.height);
        context.restore();

        //redraw
        gameState.drawItems(itemFocus, dragging, context, context2);
    };

    const itemFromRGB = function() {
        let data = touch.getContext("2d").getImageData(mouse.x, mouse.y, 1, 1).data;
        let { 0: r, 1: g, 2: b, 3: t }  = data;
        return gameState.findByRGB(r, g, b);
    }

    let inspectImgSize = 1;
    let iISizeMin = 0.2;
    let iISizeMax = 2;
    //Uses of hoverElement: detecting player hand, etc
    let hoverElement = null;
    //keep above 1.0 to be effective
    let inspectEleResizeFactor = 1.1;

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
        if(!item) {
            inspectImage.style.visibility = `hidden`;
            return;
        }
        let image = gameState.getImage(item);

        inspectImage.style.visibility = `visible`;
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
        if(hoverElement instanceof HTMLCanvasElement && inspectMode) {
            //for purposes of: looking at items on board

            let item = itemFromRGB();

            //if valid, assign image to tooltip
            if(item) {
                switch(item.type) {
                    case "playMat":
                    case "gameMat":
//                        console.log("i see, but i ignore");
                        break;
                    default:
                        insertInspectImage(item);
//                        console.log("i see you!");
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
        let {a: modifier} = context.getTransform().inverse();
        let value = panRate * modifier;

        if(mouse.x < window.innerWidth * borderProximity) {
            //pan left
            console.log("left");
            context.translate(value, 0);
        }
        if(mouse.x > window.innerWidth * (1 - borderProximity)) {
            //pan right
            context.translate(-value, 0);
            console.log("right");
        }
        if(mouse.y < window.innerHeight * borderProximity) {
            //pan top
            context.translate(0, value);
            console.log("top");
        }
        if(mouse.y > window.innerHeight * (1 - borderProximity)) {
            context.translate(0, -value);
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
        let point = context.transformPoint(mouse.x, mouse.y);
        let dx = point.x - startPoint.x;
        let dy = point.y - startPoint.y;
        if(itemFocus && !event.ctrlKey) {

            if(itemFocus instanceof HTMLImageElement) {
                dragElement(event, itemFocus);
            } else
            //in group, move all items
            if(selected.includes(itemFocus)) {
                //move all items
                gameState.dragItems(dx, dy, selected, dragging);
            } else {
                //not in the group, deselect group, move just the item
                purgeSelected();
                gameState.dragItems(dx, dy, itemFocus, dragging);
            }

            if(!handleEdgePanlooping) {
                handleEdgePan();
            }
        } else {
            context.translate(point.x-startPoint.x, point.y-startPoint.y);
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

        //handle tooltip hover
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
        } else {
            startPoint = context.transformPoint(mouse.x, mouse.y);
        }

        rightClick = false;
        dragging = false;

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

        itemFocus = itemFromRGB();

        //on mousedown, if valid item, select and redraw
        if(itemFocus) {
            if(itemFocus.enabled) {
                gameState.select(itemFocus);
                redraw();
            } else if (!selected.includes(itemFocus)){
                //todo: notify that card is currently disabled (in-use)
                console.log("Item currently in use");
            }
        }

    }, false);

    window.addEventListener("mouseup", function(event) {
        startPoint = null;

        //TODO - below is 'canvasItem' route; make the other routes (HTMLImageElement)
        if(!itemFocus || itemFocus instanceof HTMLImageElement) {
        //INVALID - ctrl ? nothing : purge
            if(!event.ctrlKey) purgeSelected();

        } else if(dragging && event.ctrlKey) {
        //DRAG ctrlkey

            if(!selected.includes(itemFocus)) {
                gameState.deselect(itemFocus);
            }
            //else, user only panned across board. all else preserved

        } else if(dragging && !event.ctrlKey) {
        //DRAG noCtrl
            if(!selected.includes(itemFocus)) {
                purgeSelected();
                gameState.deselect(itemFocus);
            }
            //else, items were all dragged and all else preserved

        } else if (event.ctrlKey){
        //NODRAG Ctrl

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
            console.log("tap!");

            //if item was already in 'selected', it needs to be reconfirmed
            gameState.select(itemFocus);
        }

        itemFocus = null;
        dragging = false;
        redraw();
    }, false);


    //Rotate the board around the mouse, press 'a' or 'd'
    //note: 90 is right angle rotation, 180 is upsidedown, 360 is all the way to normal
    let rotateIncrement = 30;
    let radians = rotateIncrement * Math.PI / 180;

    //TODO: feels it should be global, e.g. center of screen, not mouse
    const handleBoardRotate = function(pos) {
        //centeredOnMouse
//        let point = context.transformPoint(mouse.x, mouse.y);
        //centeredOnScreen
        let point = context.transformPoint(window.innerWidth/2, window.innerHeight/2);
        context.translate(+point.x, +point.y);
        context.rotate(pos ? radians : -radians);
        context.translate(-point.x, -point.y);

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
        let pt = context.transformPoint(mouse.x, mouse.y);
        context.translate(pt.x, pt.y);
        context.scale(factor, factor);
        context.translate(-pt.x, -pt.y);
        redraw();

    };

    const scroll = function(event) {
        //if ctrl is on + scrolling, prevent canvas scroll
        if(event.ctrlKey) {
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