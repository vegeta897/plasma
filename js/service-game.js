/* Game logic service */

angular.module('Plasma.game', [])
    .factory('gameUtility', function(colorUtility) {
        var randomIntRange = function(min,max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        };
        var randomRange = function(min,max) {
            return Math.random() * max + min;
        };
        var getNeighbors = function(loc,dist) {
            var neighbors = [];
            loc = [parseInt(loc[0]),parseInt(loc[1])];
            for(var i = 1; i <= dist; i++) {
                neighbors.push([loc[0]-i,loc[1]].join(':')); // W
                neighbors.push([loc[0]+i,loc[1]].join(':')); // E
                neighbors.push([loc[0],loc[1]-i].join(':')); // N
                neighbors.push([loc[0],loc[1]+i].join(':')); // S
                for(var ii=i; ii < dist; ii++) {
                    neighbors.push([loc[0]-i,loc[1]-i].join(':')); // NW
                    neighbors.push([loc[0]+i,loc[1]-i].join(':')); // NE
                    neighbors.push([loc[0]-i,loc[1]-i].join(':')); // SW
                    neighbors.push([loc[0]+i,loc[1]+i].join(':')); // SE
                }
            }
            return neighbors;
        };
        return {
            validLocation: function(cells, cellType, loc) {
                var neighbors, somatics = 0, specialFound;
                switch(cellType) {
                    case 'brain': // Can't be placed on another cell
                        return !cells.hasOwnProperty(loc.join(':'));
                        break;
                    case 'somatic': // Can't be placed on another cell, must be next to brain or energy
                        neighbors = getNeighbors(loc, 1);
                        specialFound = false;
                        for (var i = 0; i < neighbors.length; i++) {
                            if(cells.hasOwnProperty(neighbors[i])) {
                                if(jQuery.inArray(cells[neighbors[i]].type,['brain','energy']) > -1) { 
                                    specialFound = true; break; }
                            }
                        }
                        return specialFound && !cells.hasOwnProperty(loc.join(':'));
                        break;
                    case 'energy': // Can't be on another cell, must be next to 2 or more somatics
                        neighbors = [[loc[0]-1,loc[1]].join(':'), [loc[0]+1,loc[1]].join(':'),
                            [loc[0],loc[1]-1].join(':'), [loc[0],loc[1]+1].join(':')];
                        for (var j = 0; j < neighbors.length; j++) {
                            if(cells.hasOwnProperty(neighbors[j])) {
                                if(cells[neighbors[j]].type == 'somatic') { somatics++; }
                            }
                        }
                        return somatics > 1 && !cells.hasOwnProperty(loc.join(':'));
                        break;
                    default: return false; break; // Can't place unknown cell type!
                }
            },
            heartbeat: function(cells, user, heartbeats, brainColor) {
                var affected = {}, healers = [];
                for(var allGrid in cells) { // Isolate cells we're going to update
                    if(cells.hasOwnProperty(allGrid) && cells[allGrid].owner == user) {
                        affected[allGrid] = cells[allGrid];
                    }
                }
                for(var grid1 in affected) { // First pass, decay, production
                    if(affected.hasOwnProperty(grid1)) {
                        var cell1 = affected[grid1]; 
                        if(!cell1.contents) { cell1.contents = []; } // Create contents array if undefined
                        var age1 = heartbeats - cell1.created;
                        var decay = 0;
                        switch(cell1.type) { // Subtract health based on cell type
                            case 'somatic': decay = Math.round(randomRange(age1,1.5*(age1))); break;
                            case 'brain': // Energy cell every 5 turns
                                if(age1 > 0 && age1%4 == 0) { cell1.contents.push('energy'); }
                                break;
                            case 'energy':
                                if(age1 == 0) { cell1.output = 15 } else {
                                    cell1.output -= Math.round(randomRange(1,2)); }
                                if(cell1.output >= 0) {
                                    healers.push({output:cell1.output,
                                        neighbors:getNeighbors(grid1.split(':'),2)});
                                }
                                break;
                        }
                        cell1.life -= decay;
                        if(cell1.output <= 0) { // If output is dry, convert to somatic
                            cell1.type = 'somatic'; cell1.output = null;
                            cell1.color = colorUtility.generate('somatic',brainColor);
                        }
                    }
                }
                for(var grid2 in affected) { // Second pass, healing, death
                    if(affected.hasOwnProperty(grid2)) {
                        var cell2 = affected[grid2];
                        if(!cell2) { continue; } // If cell is null, skip it
                        var age2 = heartbeats - cell2.created;
                        switch(cell2.type) {
                            case 'somatic': 
                                
                                break;
                            case 'brain':
                                
                                break;
                            case 'energy':
                                
                                break;
                        }
                        for(var j = 0; j < healers.length; j++) { // Apply healing
                            var healer = healers[j];
                            for(var jj = 0; jj < healer.neighbors.length; jj++) {
                                if(healer.neighbors[jj] == grid2) {
                                    cell2.life += healer.output; break; // Heal and break!
                                }
                            }
                        }
                        if(cell2.life <= 0) { affected[grid2] = null; } // Delete the cell if it's dead
                        if(cell2.life > 100) { cell2.life = 100; } // Max 100 health
                    }
                }
                return affected;
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
                            'As heartbeats increment, your cells produce new contents to harvest.\n' +
                            'Click on your brain cell and see what it has produced!';
                        break;
                    case 6:
                        text = 'Ooh, an energy cell!\n' +
                            'Most cells lose health every heartbeat. The older they are, the more ' +
                            'health they lose after every heartbeat. When a cell reaches 0 health, it dies.\n' +
                            'Energy cells provide life to your cells after every heartbeat to combat this.\n' +
                            'The "reach" of an energy cell\'s sustenance is 2 cells. You can see this reach' +
                            'by clicking on the energy cell.\nPlace your energy cell now, and select it!';
                        break;
                    case 7:
                        text = 'The "reach" of an energy cell\'s sustenance is 2 cells. You can see this reach ' +
                            'when the cell is selected, as well as more info below.\n' +
                            'The energy cell\'s output per heartbeat is displayed. This output decreases ' +
                            'gradually as the cell ages. When it reaches 0, the cell becomes somatic.\n';
                        break;
                }
                return text;
            }
        }
});