/* Services */

angular.module('Plasma.services', [])
    .factory('utility', function() {
        var hsvToRGB = function(hsv) {
            var h = hsv.hue, s = hsv.sat, v = hsv.val, rgb, i, data = [];
            if (s === 0) { rgb = [v,v,v]; } 
            else {
                h = h / 60; i = Math.floor(h);
                data = [v*(1-s), v*(1-s*(h-i)), v*(1-s*(1-(h-i)))];
                switch(i) {
                    case 0: rgb = [v, data[2], data[0]]; break;
                    case 1: rgb = [data[1], v, data[0]]; break;
                    case 2: rgb = [data[0], v, data[2]]; break;
                    case 3: rgb = [data[0], data[1], v]; break;
                    case 4: rgb = [data[2], data[0], v]; break;
                    default: rgb = [v, data[0], data[1]]; break;
                }
            }
            return rgb.map(function(x){ return ("0" + Math.round(x*255).toString(16)).slice(-2); }).join('');
        };
        var getAverages = function(palette) {
            if(!palette) { return false; }
            var hueTotal = 0, satTotal = 0, valTotal = 0, totalColors = 0;
            for(var palKey in palette) {
                if(palette.hasOwnProperty(palKey)) {
                    if(palette[palKey].hsv.hue - hueTotal/totalColors > 180) {
                        hueTotal += (360 - palette[palKey].hsv.hue + hueTotal/totalColors)*-1;
                    } else if (hueTotal/totalColors - palette[palKey].hsv.hue > 180) {
                        hueTotal += 360 + palette[palKey].hsv.hue;
                    } else {
                        hueTotal += palette[palKey].hsv.hue;
                    }
                    totalColors++;
                    satTotal += palette[palKey].hsv.sat;
                    valTotal += palette[palKey].hsv.val;
                }
            }
            var avgHue = hueTotal/(totalColors);
            var avgSat = satTotal/(totalColors);
            var avgVal = valTotal/(totalColors);
            if(avgHue >= 360) {
                avgHue = avgHue % 360;
            } else if (avgHue < 0) {
                avgHue = 360 + (avgHue % 360);
            }
            if(avgSat > 1) { avgSat = 1; } else if(avgSat < 0) { avgSat = 0; }
            if(avgVal > 1) { avgVal = 1; } else if(avgVal < 0) { avgVal = 0; }
            if(totalColors == 0) {
                return false;
            } else {
                return {
                    hue: avgHue,
                    sat: avgSat,
                    val: avgVal,
                    total: totalColors
                };
            }
            
        };
        var applyAverages = function(averages) {
            var hueOffset = Math.floor(Math.pow(Math.random(),1+Math.log(averages.total)/Math.LN10 )*180);
            if(flip()) { hueOffset *= -1; }
            var satMin = averages.sat > 0.5 ? 1-averages.sat : averages.sat;
            var satMax = averages.sat > 0.5 ? averages.sat : 1-averages.sat;
            var satOffset = Math.pow(Math.random(),1+Math.log(averages.total)/Math.LN10)
                * satMax - Math.random()*0.2;
            if(averages.sat > 0.5) { satOffset *= -1; }
            if(Math.random()<satMin) { satOffset *= -1; }
            if(flip()) { satOffset *= -1; }
            var valMin = averages.val > 0.5? 1-averages.val : averages.val;
            var valMax = averages.val > 0.5? averages.val : 1-averages.val;
            var valOffset = Math.pow(Math.random(),1+Math.log(averages.total)/Math.LN10)
                * valMax - Math.random()*0.2;
            if(averages.val > 0.5) { valOffset *= -1; }
            if(Math.random()<valMin) { valOffset *= -1; }
            var hsv = {
                hue: averages.hue+hueOffset,
                sat: averages.sat+satOffset,
                val: averages.val+valOffset
            };
            if(hsv.sat > 1) { hsv.sat = 1-hsv.sat%1; } // Fix out of bounds
            if(hsv.sat < 0) { hsv.sat = -1*(hsv.sat%-1); }
            if(hsv.val > 1) { hsv.val = 1-hsv.val%1; }
            if(hsv.val < 0) { hsv.val = -1*(hsv.val%-1); }
            if(hsv.hue >= 360) {
                hsv.hue = hsv.hue % 360;
            } else if (hsv.hue < 0) {
                hsv.hue = 360 + (hsv.hue % 360);
            }
            hsv.hue = Math.round(hsv.hue*100)/100; // Clean up long decimals
            hsv.sat = Math.round(hsv.sat*100)/100;
            hsv.val = Math.round(hsv.val*100)/100;
            return hsv;
        };
        var flip = function() { // Flip a coin
            return Math.floor(Math.random()*2) == 1;
        };
        return {
            generate: function(/* palette (array) OR maxMins (object has 'maxSat') */) {
            //    var palette = jQuery.isArray(arguments[0]) ? arguments[0] : undefined;
                if(arguments[0]) {
                    var maxMins = arguments[0].hasOwnProperty('maxSat') ? arguments[0] : undefined;
                    var cellType = typeof arguments[0] == 'string' ? arguments[0] : undefined;
                    if(arguments[1]) {
                        var brainColor = arguments[1].hasOwnProperty('hsv') ? arguments[1] : undefined;
                    }
                }
            //    var averages = getAverages(palette);
                var hsv = {};
            //    if(averages) { hsv = applyAverages(averages); } else
                if(maxMins) {
                    var hueRange = maxMins.maxHue - maxMins.minHue;
                    var satRange = maxMins.maxSat - maxMins.minSat;
                    var valRange = maxMins.maxVal - maxMins.minVal;
                    hsv = {
                        hue: Math.floor(Math.random()*hueRange + maxMins.minHue),
                        sat: Math.round(Math.random()*satRange + maxMins.minSat)/100,
                        val: Math.round(Math.random()*valRange + maxMins.minVal)/100
                    };
                } else if(cellType && brainColor) {
                    switch(cellType) {
                        case 'somatic':
                            hsv = {
                                hue: brainColor.hsv.hue + Math.floor(Math.random()*26 - 13),
                                sat: Math.round(Math.random()*30 + 15)/100,
                                val: Math.round(Math.random()*10 + 40)/100
                            };
                            break;
                    }
                } else {
                    hsv = {
                        hue: Math.floor(Math.random()*360),
                        sat: Math.round(Math.random()*100)/100,
                        val: Math.round(Math.random()*100)/100
                    };
                }
                if(hsv.hue >= 360) { // Fix hue wraparound
                    hsv.hue = hsv.hue % 360;
                } else if (hsv.hue < 0) {
                    hsv.hue = 360 + (hsv.hue % 360);
                }
                return {
                    hex: hsvToRGB(hsv),
                    hsv: hsv
                };
            },
            tutorial: function(step) {
                var text = '';
                switch(parseInt(step)) {
                    case 0:
                        text = 'To begin, add a Brain Cell to your inventory.';
                        break;
                    case 1:
                        text = 'Great! Now click the [+] button, and place it somewhere on the map.';
                        break;
                    case 2:
                        text = 'Woo! There\'s your brain cell.\n' +
                            'The brain cell is the center of your new life form.\n' +
                            'Any cell you place from now on must connect to either your brain, ' +
                            'or another cell you placed.\n' +
                            'Click on your brain cell to view its properties.';
                        break;
                    case 3:
                        text = 'When you select one of your cells, its properties are shown.\n' +
                            'You can see the color, cell type, and the cell\'s contents.\n' + 
                            'Certain cells produce certain contents at certain rates.\n' +
                            'Click the buttons to transfer the contents to your inventory.';
                        break;
                    case 4:
                        text = 'Excellent! Now you can place these new cells around your brain cell.\n' +
                            'Somatic cells are the most basic type of cell, and can only be placed ' + 
                            'next to special cells like the brain.';
                        break;
                    case 5:
                        text = 'Great, you\'re up to a 5 cell organism!\n' +
                            'Each cell you place makes some time pass. This time span is called a heartbeat.\n' +
                            'As heartbeats increment, your cells produce new contents to harvest.';
                        break;
                }
                return text;
            },
            rgbToHex: function rgbToHex(r, g, b) {
                if (r > 255 || g > 255 || b > 255)
                    throw "Invalid color component";
                return ((r << 16) | (g << 8) | b).toString(16);
            },
            capitalize: function(string) {
                return string.charAt(0).toUpperCase() + string.slice(1);
            }
        }
});