import bindCanvas from "./bindCanvas.js";
import gameState from "./gameState.js";
import main from "./itemsObjects.js";

//Variables
const board = document.getElementById("gameBoard");
const touch = document.getElementById("touchBoard");
const table = new Image();
const background = new Image();
let selected = [];
let itemFocus; //current item of "mousedown"; added to 'selected' if mouseUp successful

window.onload = function() {
    //Load all event interactions, draws,
    const context = board.getContext("2d");
    const context2  = touch.getContext("2d", {willReadFrequently : true});
    bindCanvas(board, touch);

    board.setHeight(window.innerHeight);
    board.setWidth(window.innerWidth);

    const redraw = function() {
        //Clear
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0,0,board.width,board.height);
        //background
        //            context.drawImage(background, 0, 0);
        context.restore();

        //Repaint -- default object
        context.drawImage(table, 0, 0);
//        console.log("redrawn!");

        //draw all items in gameState
        for (const [type, list] of Object.entries(gameState.items)) {
//            if(list.length == 0) {
//                continue;
//            }
//            console.log(type);
//            console.log(list.length);
            list.forEach((item) => {
                if(item) {
//                    console.log(item);
                    //TODO: streamline - implement drawImage() on the item themselves
                    context.drawImage(item, item.getX(), item.getY());
                }
            });
        }
    };
    redraw();
    //mouse tracking
    let mouse = {
        x: board.width,
        y: board.height
    };

    let startPoint;
    let dragging = false;

    touch.addEventListener("mousemove", function(event) {

        //console.log("mousemove");

        mouse.x = event.offsetX;
        mouse.y = event.offsetY;

        //check for click-hold-drag
        if(startPoint) {
            let point = context.transformPoint(mouse.x, mouse.y);
            let dx = point.x - startPoint.x;
            let dy = point.y - startPoint.y;
            if(itemFocus) {
                //TODO: see how this feels. ctrl, without, group,solo, outside group,
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
    },false);

    touch.addEventListener("mousedown", function(event) {
        startPoint = context.transformPoint(mouse.x, mouse.y);
        dragging = false;

        let data = touch.getContext("2d").getImageData(mouse.x, mouse.y, 1, 1).data;
        let { 0: r, 1: g, 2: b, 3: t }  = data;
        let itemNo = r + g*255 + b*255*255;

        //on mousedown, if valid item, select and redraw
        if(itemFocus = gameState.findByRGB(r,g,b)) {
            gameState.select(itemFocus);
//            //this inner 'if' is purely cosmetic -- it doesnt work?
//            if(!selected.includes(itemFocus) && !event.ctrlKey) purgeSelected();
            redraw();
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
            gameState.flip(itemFocus);
            selected.push(itemFocus);

            //if item was already in 'selected', it needs to be reconfirmed
            gameState.select(itemFocus);
        }

        itemFocus = null;
        dragging = false;
        console.log(selected);
        redraw();
    }, false);


    //Rotate the board around the mouse, press 'a' or 'd'
    //note: 90 is right angle rotation, 180 is upsidedown, 360 is all the way to normal
    let rotateIncrement = 30;
    let radians = rotateIncrement * Math.PI / 180;

    window.addEventListener("keydown", function(event){
        let ele = document.elementFromPoint(mouse.x, mouse.y);
        let key = ele == touch ? event.code : null;
        let rotate;
        switch(key) {
            case "KeyA":
                rotate = () => context.rotate(-radians);
                break;
            case "KeyD":
                rotate = () => context.rotate(radians);
                break;
            default:
                //invalid key, skip processing
                console.log("invalid key");
                return;
        }

        let point = context.transformPoint(mouse.x, mouse.y);
        context.translate(+point.x, +point.y);
        rotate();
        context.translate(-point.x, -point.y);

        redraw();
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

        console.log()
    };

    const scroll = function(event) {
        if(event.ctrlKey) event.preventDefault();
        //Positive deltaY is scrolling down, or 'zooming out', thus smaller scale
        zoom(event.deltaY < 0 ? 1 : -1);
    };

//    touch.addEventListener("wheel", scroll, {passive: true});
    touch.addEventListener("wheel", scroll);

    //Window resizing -- works
    //this is something to import, so it does not clog; like a library
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

table.src = `https://picsum.photos/50/200`;
board.style.backgroundImage = "url(../Images/backgrounds/flat-mountains.svg)"; //credits: svgbackgrounds.com

function purgeSelected() {
    gameState.deselect(selected);
    selected.length = 0;
}