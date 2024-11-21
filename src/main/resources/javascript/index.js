import bindCanvas from "./bindCanvas.js";
import gameState from "./gameState.js";
import main from "./itemsObjects.js";

//Variables
const board = document.getElementById("gameBoard");
const touch = document.getElementById("touchBoard");
//const table = new Image();
const background = new Image();
let selected = [];
let itemFocus; //current item of "mousedown"; added to 'selected' if mouseUp successful
let inspectMode = true; //toggle for InspectMode
let inspectImage = document.getElementById("inspectImage");

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

    const insertInspectImage = function(item) {
        if(!item) {
            inspectImage.style.visibility = `hidden`;
            return;
        }
        let image = gameState.getImage(item);

        inspectImage.style.visibility = `visible`;
        inspectImage.height = image.height;
        inspectImage.width = image.width;
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

        //centered
//        let x = Math.min(mouse.x - inspectImage.width/2,
//            window.innerWidth - inspectImage.width);
//        let y = Math.min(mouse.y - inspectImage.height/2,
//            window.innerHeight - inspectImage.height);
        //bottom right
        let x = Math.min(mouse.x, window.innerWidth - inspectImage.width);
        let y = Math.min(mouse.y, window.innerHeight - inspectImage.height);
        inspectImage.style.top = `${y}px`;
        inspectImage.style.left = `${x}px`;

        let ele = document.elementFromPoint(mouse.x, mouse.y);
        //assumes the game board
        if(ele instanceof HTMLCanvasElement && inspectMode) {
            //for purposes of: looking at items on board

            let item = itemFromRGB();

            //if valid, assign image to tooltip
            if(item) {
                switch(item.type) {
                    case "playMat":
                    case "gameMat":
                        console.log("i see, but i ignore");
                        break;
                    default:
                        insertInspectImage(item);
                        console.log("i see you!");
                        return;
                }
            }
        } else if (ele instanceof HTMLImageElement || !inspectMode) {
            //for purposes of: looking at hand, or preview
            //grab the id, or its parent div, or its special attribute 'id' of card
            //then use gameState to find the image
            console.log("Image element found or missing info");
        }

        insertInspectImage();
    }

    //which way - create image at spot of mouse? probably
    //TODO - for later
    const initializeImage = function(newImageElement) {
        //Purpose - 'pinning' an inspection 'img';
            //this image can be dragged, but should be skipped by tooltip (via attribute?)

    }

    let borderProximity = 0.05; //border lenience, percentage
    let panRate = 10; //speed

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
//            context.translate(0, point.y);
            context.translate(0, value);
            console.log("top");
        }
        if(mouse.y > window.innerHeight * (1 - borderProximity)) {
            context.translate(0, -value);
            console.log("bottom");
        }
        //redrawing twice? see: called by handleDrag
//        redraw();
    }

    const handleDrag = function(event) {
        //TODO: will be adapted to read currentElement, for hand<->canvas transitions
        //TODO: as well as dragToDeck visual queues
        if(!startPoint) {
            return;
        }

        handleEdgePan();

        let point = context.transformPoint(mouse.x, mouse.y);
        let dx = point.x - startPoint.x;
        let dy = point.y - startPoint.y;
        if(itemFocus && !event.ctrlKey) {
            //in group, move all items
            if(selected.includes(itemFocus)) {
                //move all items
                gameState.dragItems(dx, dy, selected, dragging);
            } else {
                //not in the group, deselect group, move just the item
                purgeSelected();
                gameState.dragItems(dx, dy, itemFocus, dragging);
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
        mouse.x = event.offsetX;
        mouse.y = event.offsetY;

        //handle tooltip hover
        handleImageTooltip();

        //check for click-hold-drag
        handleDrag(event);

    },false);

    touch.addEventListener("mousedown", function(event) {
        startPoint = context.transformPoint(mouse.x, mouse.y);
        dragging = false;

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

    touch.addEventListener("mouseup", function(event) {
        startPoint = null;

        if(!itemFocus) {
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
        let point = context.transformPoint(mouse.x, mouse.y);
        context.translate(+point.x, +point.y);
        context.rotate(pos ? radians : -radians);
        context.translate(-point.x, -point.y);

        redraw();
    }

    window.addEventListener("keydown", function(event){
        let ele = document.elementFromPoint(mouse.x, mouse.y);
        //to disable where not relevant, e.g. chat, inserting character name,; ele = inputTxt
        let key = ele == touch ? event.code : null;
        switch(key) {
            case "KeyA":
                handleBoardRotate(false);
                break;
            case "KeyD":
                handleBoardRotate(true);
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

    //scroll responsiveness multiplier
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