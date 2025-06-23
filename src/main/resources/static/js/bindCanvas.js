//import tapIcon from "./assets.js";

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

     //*optional, as the user's mouse will be tracked too

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

     //rounds the object; use .clip() but .save() prior and .restore() after
     let radius = 50;
//     const roundedImage = function(x,y,width,height,radius){
     const roundedImage = function(x,y,width,height){
        let ctx = this;
         ctx.beginPath();
         ctx.moveTo(x + radius, y);
         ctx.lineTo(x + width - radius, y);
         ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
         ctx.lineTo(x + width, y + height - radius);
         ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
         ctx.lineTo(x + radius, y + height);
         ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
         ctx.lineTo(x, y + radius);
         ctx.quadraticCurveTo(x, y, x + radius, y);

         ctx.clip();
     }
     int.roundedImage = roundedImage;
     vis.roundedImage = roundedImage;

    //converts on-screen client.x,client.y to true canvas position (post transform)
    let point = new DOMPoint();
    vis.transformPoint = function(x, y) {
        point.x = x; point.y = y;
        let matrix = vis.getTransform();
        return point.matrixTransform(matrix.inverse());
    }
};

 export default bindCanvas;