/* Canvas drawing service */

angular.module('Plasma.canvas', [])
    .factory('canvasUtility', function() {
        var mainPixSize = 2;
        var someFunction = function() {
            
        };
        return {
            drawSelect: function(context,coords,pixSize) {
                var thickness = pixSize < 16 ? 1 : pixSize < 31 ? 2 : 3;
                context.fillStyle = 'rgba(255, 255, 255, 0.7)';
                context.fillRect(coords[0] * pixSize-thickness, coords[1] * pixSize-thickness, // Outer box
                    pixSize+thickness*2, pixSize+thickness*2);
                context.clearRect(coords[0] * pixSize+2*thickness, coords[1] * pixSize-thickness, // Vertical
                    pixSize-4*thickness, pixSize+thickness*2);
                context.clearRect(coords[0] * pixSize-thickness, coords[1] * pixSize+2*thickness, // Horizontal
                    pixSize+thickness*2, pixSize-4*thickness);
                context.clearRect(coords[0] * pixSize, coords[1] * pixSize, // Inner box
                    pixSize, pixSize);
            },
            drawZoomPixel: function(context,color,coords,zoomPosition,pixSize) {
                var x = coords[0], y = coords[1];
                if(x < zoomPosition[0] || // Check that pixel is within zoom area
                    x >= zoomPosition[0]+(600/pixSize) ||
                    y < zoomPosition[1] ||
                    y >= zoomPosition[1]+(600/pixSize)) { return; }
                context.fillStyle = color.charAt(0) == 'r' ? color : '#' + color;
                context.fillRect(parseInt(x-zoomPosition[0]) * pixSize,
                    parseInt(y-zoomPosition[1]) * pixSize, pixSize, pixSize);
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
                var my_gradient = context.createRadialGradient(
                    coords[0]*mainPixSize + mainPixSize/2, coords[1]*mainPixSize + mainPixSize/2, 5,
                    coords[0]*mainPixSize + mainPixSize/2, coords[1]*mainPixSize + mainPixSize/2, 0
                );
                my_gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
                my_gradient.addColorStop(0.2, "rgba(255, 255, 255, 1)");
                my_gradient.addColorStop(0.4, "rgba(255, 255, 255, 0)");
                my_gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
                context.fillStyle = my_gradient;
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