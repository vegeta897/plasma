/* Services */

angular.module('Plasma.canvas', [])
    .factory('canvasUtility', function() {
        var mainPixSize = 2, zoomPixSize = 10, zoomSize = [60,60];
        var someFunction = function() {
            
        };
        return {
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
            },
            drawSelect: function(context,coords) {
                context.fillStyle = 'rgba(255, 255, 255, 0.7)';
                context.fillRect(coords[0] * zoomPixSize-1, coords[1] * zoomPixSize-1, zoomPixSize+2, zoomPixSize+2);
                context.clearRect(coords[0] * zoomPixSize+2, coords[1] * zoomPixSize-1, zoomPixSize-4, zoomPixSize+2);
                context.clearRect(coords[0] * zoomPixSize-1, coords[1] * zoomPixSize+2, zoomPixSize+2, zoomPixSize-4);
                context.clearRect(coords[0] * zoomPixSize, coords[1] * zoomPixSize, zoomPixSize, zoomPixSize);
            },
            drawZoomPixel: function(context,color,coords,zoomPosition) {
                var x = coords[0], y = coords[1];
                if(x < zoomPosition[0] || // Check that pixel is within zoom area
                    x >= zoomPosition[0]+zoomSize[0] ||
                    y < zoomPosition[1] ||
                    y >= zoomPosition[1]+zoomSize[1]) { return; }
                context.fillStyle = color.charAt(0) == 'r' ? color : '#' + color;
                context.fillRect(parseInt(x-zoomPosition[0]) * zoomPixSize,
                    parseInt(y-zoomPosition[1]) * zoomPixSize, zoomPixSize, zoomPixSize);
            },
            fillCanvas: function(context,color) {
                var method = color == 'erase' ? 'clearRect' : 'fillRect';
                context.fillStyle = color.charAt(0) == 'r' ? color : '#' + color;
                context[method](0,0,600,600);
            },
            fillMainArea: function(context,color,coords,size) {
                var method = color == 'erase' ? 'clearRect' : 'fillRect';
                context.fillStyle = color.charAt(0) == 'r' ? color : '#' + color;
                context[method](coords[0]*mainPixSize,coords[1]*mainPixSize,size[0]*mainPixSize,size[1]*mainPixSize);
            }
        }
});