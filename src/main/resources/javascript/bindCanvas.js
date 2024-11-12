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
    let int = interact.getContext("2d");

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
    vis.drawImage = function(img, x, y) {
        int.fillRect(x, y, img.width, img.height);
        //* fillStytle will be filled by item's unique RGB, then reverse-engineered on itemDrag, itemFlip,
        //itemRotate

        //TODO: ship to separate method within gameState singleton
        //mock item
        let itemNo = 65280;
        let r = itemNo % 255;
        let g = Math.floor(itemNo/255%255);
        let b = Math.floor(itemNo/255/255%255);
        //mock item
        if(img.width == 7964) {
            int.fillStyle = `rgb(${r} ${g} ${b} / 100%)`;
            //TODO temporary note, 255all is white, 0all is black, % is transparency
            int.fill();
        }

        return drawImage.call(vis, img, x, y);
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