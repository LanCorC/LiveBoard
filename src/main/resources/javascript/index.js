import bindCanvas from "./bindCanvas.js";

//Variables
const board = document.getElementById("gameBoard");
const touch = document.getElementById("touchBoard");
const table = new Image();
const background = new Image();

window.onload = function() {
    //Load all event interactions, draws,
    const context = board.getContext("2d");
    context.translate(window.innerWidth/2, window.innerHeight/2);
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

        //Repaint
        context.drawImage(table, 0, 0);
        console.log("redrawn!");
    };
    redraw();
    //mouse tracking
    let mouse = {
        x: board.width,
        y: board.height
    };

    let startPoint;
    //        let dragging;

    touch.addEventListener("mousemove", function(event) {
        mouse.x = event.offsetX;
        mouse.y = event.offsetY;

        //check for click-hold-drag
        if(startPoint) {
            let pt = context.transformPoint(mouse.x, mouse.y);
            context.translate(pt.x-startPoint.x, pt.y-startPoint.y);
            redraw();
        }
    },false);

    //TODO: check 2ndary canvas if 'playmat' or 'tabletop' selected, as opposed to 'card' or 'deck'
    touch.addEventListener("mousedown", function() {
        startPoint = context.transformPoint(mouse.x, mouse.y);

        //Temporary code TODO -- testing if we can use 'mousemove' to confirm color pixel being detected
        //            let a, b, c, d;
        let data = touch.getContext("2d").getImageData(mouse.x, mouse.y, 1, 1).data
        let { 0: r, 1: g, 2: b, 3: t }  = data;
        console.log(r);
        console.log(g);
        console.log(b);
        let itemNo = r + g*255 + b*255*255;
        console.log(`${r} ${g} ${b} is itemNo: ${itemNo}`);
        console.log(itemNo);
        //Temporary code TODO

        //            dragging = true;
    }, false);
    touch.addEventListener("mouseup", function() {
        startPoint = null;
        //            dragging = false;
    }, false);


    //experimental rotate the entire board
    //in appropriate application, tie this to a button - works
    //cons: rotates from 0,0 and does is document global for keypress a,d
    window.addEventListener("keydown", function(event){
        let key = event.code;
        if(key == "KeyA") {
            context.rotate(15 * Math.PI / 180);
        } else if(key == "KeyD") {
            context.rotate(-15 * Math.PI / 180);
        }
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
    };

    const scroll = function(event) {
        //Positive deltaY is scrolling down, or 'zooming out', thus smaller scale
        zoom(event.deltaY < 0 ? 1 : -1);
    };

    //Event is registering
    //        board.addEventListener("wheel", (event) => { console.log("wheel") } );
    touch.addEventListener("wheel", scroll, {passive: true});

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

    //For some reason, this needs to be called twice in order to properly capture, as far as tested, "mousedown"
    redraw();
}

table.src = "../Images/sticky-note-with-postponed-messageFreePikDotCom.jpg";
board.style.backgroundImage = "url(../Images/backgrounds/subtle-prism.svg)"; //credits: svgbackgrounds.com
