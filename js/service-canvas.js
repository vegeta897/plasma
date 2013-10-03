/* Canvas drawing service */

angular.module('Plasma.canvas', [])
    .factory('canvasUtility', function(colorUtility) {
        var mainPixSize = 2;
        return {
            drawSelect: function(context,coords,pixSize) {
                var x = coords[0], y = coords[1];
                var thickness = pixSize < 16 ? 1 : pixSize < 31 ? 2 : 3;
                context.fillStyle = 'rgba(255, 255, 255, 0.7)';
                context.fillRect(x * pixSize-thickness, y * pixSize-thickness, // Outer box
                    pixSize+thickness*2, pixSize+thickness*2);
                context.clearRect(x * pixSize+2*thickness, y * pixSize-thickness, // Vertical
                    pixSize-4*thickness, pixSize+thickness*2);
                context.clearRect(x * pixSize-thickness, y * pixSize+2*thickness, // Horizontal
                    pixSize+thickness*2, pixSize-4*thickness);
                context.clearRect(x * pixSize, y * pixSize, // Inner box
                    pixSize, pixSize);
            },
            drawReach: function(context,coords,reach,pixSize) {
                if(pixSize<12) { return; }
                var x = coords[0]*pixSize, y = coords[1]*pixSize;
                context.lineWidth = pixSize < 32 ? 2 : 4;
                context.strokeStyle = 'rgba(200, 255, 200, 0.4)';
                var dirs = [{x:1,y:-1},{x:1,y:1},{x:-1,y:1},{x:-1,y:-1}];
                context.beginPath();
                var loc = {x:x-pixSize*reach,y:y}; // Keep track of where we are so we can apply relative coords
                context.moveTo(loc.x,loc.y);
                for(var i = 0; i < 4; i++) {
                    var traverseX = function(i) {
                        loc = {x:loc.x+pixSize*dirs[i].x,y:loc.y}; context.lineTo(loc.x,loc.y);
                    };
                    var traverseY = function(i) {
                        loc = {x:loc.x,y:loc.y+pixSize*dirs[i].y}; context.lineTo(loc.x,loc.y);
                    };
                    for(var ii = 0; ii < reach+1; ii++) {
                        if(i % 2 == 0) { traverseX(i); } else { traverseY(i); }
                        if(ii < reach) {
                            if(i % 2 == 0) { traverseY(i); } else { traverseX(i); }
                        }
                    }
                }
                context.closePath();
                context.stroke();
            },
            drawZoomPixel: function(context,color,coords,zoomPosition,pixSize) {
                var x = parseInt(coords[0]), y = parseInt(coords[1]);
                if(x < zoomPosition[0] || // Check that pixel is within zoom area
                    x >= zoomPosition[0]+(600/pixSize) || y < zoomPosition[1] ||
                    y >= zoomPosition[1]+(600/pixSize)) { return; }
                context.fillStyle = color.charAt(0) == 'r' ? color : '#' + color;
                context.fillRect((x-zoomPosition[0]) * pixSize, (y-zoomPosition[1]) * pixSize, pixSize, pixSize);
            },
            drawCellHealth: function(context,color,life,coords,zoomPosition,pixSize) {
                var x = (coords[0]-zoomPosition[0]) * pixSize, y = (coords[1]-zoomPosition[1]) * pixSize;
                var border = Math.ceil(pixSize/8); var rgb = colorUtility.hexToRGB(color);
                context.fillStyle = 'rgba('+rgb.r+', '+rgb.g+', '+rgb.b+', '+life/100+')';
                context.clearRect(x + border, y + border, pixSize - border*2, pixSize - border*2);
                context.fillRect(x + border, y + border, pixSize - border*2, pixSize - border*2);
            },
            drawCellContents: function(context,cell,coords,zoomPosition,pixSize) {
                if(pixSize<12) { return; } var itemSize = Math.ceil(pixSize/8);
                var x = (coords[0]-zoomPosition[0]) * pixSize, y = (coords[1]-zoomPosition[1]) * pixSize;
                if(cell.color.hsv.val > 0.8) { context.fillStyle = 'rgba(0, 0, 0, 0.5)'; } else {
                    context.fillStyle = 'rgba(255, 255, 255, 0.5)'; }
                for(var i = 0; i < cell.contents.length; i++) {
                    var padding = Math.ceil(itemSize/2);
                    if(x + itemSize*(i+1) + padding*i + itemSize > x + pixSize - itemSize) {
                        context.fillRect(x + itemSize*(i-2) + padding*(i-3), y + itemSize*2 + padding, 
                            itemSize, itemSize); } else {
                        context.fillRect(x + itemSize*(i+1) + padding*i, y + itemSize, itemSize, itemSize);
                    }
                }
            },
            drawCellHealthBar: function(context,life,coords,zoomPosition,pixSize) {
                var x = coords[0]-zoomPosition[0], y = coords[1]-zoomPosition[1];
                var padding = pixSize < 10 ? -1 : pixSize < 21 ? 0 : 1;
                if(padding == -1) { return; }
                context.fillStyle = '#000000';
                context.fillRect(x * pixSize + padding, y * pixSize + pixSize - 2 - 3 * padding,
                    pixSize-padding*2, padding*2+2);
                context.fillStyle = '#FFFFFF';
                context.fillRect(x * pixSize + 2 * padding,
                    y * pixSize + pixSize - 2 - 2 * padding, (pixSize-4*padding)*life/100, 2);
            },
            fillCanvas: function(context,color) {
                var method = color == 'erase' ? 'clearRect' : 'fillRect';
                if(color != 'erase') { context.fillStyle = color.charAt(0) == 'r' ? color : '#' + color; }
                context[method](0,0,600,600);
            },
            fillMainArea: function(context,color,coords,size) {
                var method = color == 'erase' ? 'clearRect' : 'fillRect';
                if(color != 'erase') { context.fillStyle = color.charAt(0) == 'r' ? color : '#' + color; }
                context[method](coords[0]*mainPixSize,coords[1]*mainPixSize,size[0]*mainPixSize,size[1]*mainPixSize);
            },
            drawPing: function(context,coords) {
                var pingGradient = context.createRadialGradient(
                    coords[0]*mainPixSize + mainPixSize/2, coords[1]*mainPixSize + mainPixSize/2, 5,
                    coords[0]*mainPixSize + mainPixSize/2, coords[1]*mainPixSize + mainPixSize/2, 0
                );
                pingGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
                pingGradient.addColorStop(0.2, "rgba(255, 255, 255, 1)");
                pingGradient.addColorStop(0.4, "rgba(255, 255, 255, 0)");
                pingGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
                context.fillStyle = pingGradient;
                context.beginPath();
                context.arc(coords[0]*mainPixSize + mainPixSize/2,
                    coords[1]*mainPixSize + mainPixSize/2, 5, 0, 2 * Math.PI, false);
                var cycle = 0;
                function fadePing() {
                    if(Math.round(cycle/2) == cycle/2) {
                        context.fill();
                    } else {
                        context.clearRect(coords[0] * mainPixSize - 15 + mainPixSize/2,
                            coords[1] * mainPixSize - 15 + mainPixSize/2, 30, 30);
                    }
                    cycle++;
                    if(cycle >= 8) {
                        clearInterval(pingInt);
                    }
                }
                var pingInt = setInterval(function(){fadePing()},200);
            },
            clearPing: function(context,coords) {
                context.clearRect(coords[0] * mainPixSize - 15 + mainPixSize/2,
                    coords[1] * mainPixSize - 15 + mainPixSize/2, 30, 30);
            }
        }
});