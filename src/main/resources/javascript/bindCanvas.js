//Introduces canvas.setHeight(y), canvas.setWidth(x)
//Introduces context.transformPoint(x, y)
 function bindCanvas(visual, interact) {

    visual.setWidth = function(x) {
        visual.width = x;
        interact.width = x;
    }

    visual.setHeight = function(y) {
        visual.height = y;
        interact.height = y;
    }

    let vis = visual.getContext("2d");
    let int = interact.getContext("2d", {willReadFrequently : true});

     //-- TODO - tie userColor to make it clear which user has selected what
     //*optional, as the user's mouse will be tracked too

    let save = vis.save;
    vis.save = function() {
        int.save();
        return save.call(vis);
    }

    let restore = vis.restore;
    vis.restore = function() {
        int.restore();
        return restore.call(vis);
    }

    let translate = vis.translate;
    vis.translate = function(x, y) {
        int.translate(x, y);
        return translate.call(vis, x, y);
    }

    let rotate = vis.rotate;
    vis.rotate = function(rad) {
        int.rotate(rad);
        return rotate.call(vis, rad);
    }

    let setTransform = vis.setTransform;
    vis.setTransform = function(x, y, z, a, b, c) {
        int.setTransform(x, y, z, a, b, c);
        return setTransform.call(vis, x, y, z, a, b, c);
    }

    let scale = vis.scale;
    vis.scale = function(x, y) {
        int.scale(x, y);
        return scale.call(vis, x, y);
    }

    let clearRect = vis.clearRect;
    vis.clearRect = function(x, y, width, height) {
        int.clearRect(x, y, width, height);
        return clearRect.call(vis, x, y, width, height);
    }

    let drawImage = vis.drawImage;
    vis.drawImage = function(item, x, y) {
        //TODO: below is 'default image' for testing, this is not an interactable obj
        if (item instanceof Element) {
            int.fillStyle = "black";
            int.fillRect(x, y, item.width, item.height);
            int.fill();

            //* fillStytle will be filled by item's unique RGB, then reverse-engineered on itemDrag, itemFlip,
            //itemRotate
            return drawImage.call(vis, item, x, y);
        }

        int.fillStyle = item.touchStyle;
        int.fillRect(x, y, item.width, item.height);
        int.fill();

//        return drawImage.call(vis, !item.flipped ? item.img : item.backImg, x, y);

        if(item.selected) {
            vis.shadowColor = "white";
            vis.shadowBlur = 200;
        }
        drawImage.call(vis, !item.flipped ? item.img : item.backImg, x, y);
        vis.shadowBlur = 0;

    }

    //converts on-screen client.x,client.y to true canvas position (post transform)
    let point = new DOMPoint();
    vis.transformPoint = function(x, y) {
        point.x = x; point.y = y;
        let matrix = vis.getTransform();
        return point.matrixTransform(matrix.inverse());
    }
};

 export default bindCanvas;