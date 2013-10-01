/* Game logic service */

angular.module('Plasma.game', [])
    .factory('gameUtility', function() {
        var someVar;
        var randomIntRange = function(min,max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        };
        return {
            validLocation: function(cells, cellType, loc) {
                switch(cellType) {
                    case 'brain':
                        return !cells.hasOwnProperty(loc.join(':'));
                        break;
                    case 'somatic':
                        var neighbors = [[loc[0]-1,loc[1]].join(':'), [loc[0]+1,loc[1]].join(':'),
                            [loc[0],loc[1]-1].join(':'), [loc[0],loc[1]+1].join(':')];
                        var brainFound = false;
                        for (var i = 0; i < neighbors.length; i++) {
                            if(cells.hasOwnProperty(neighbors[i])) {
                                if(cells[neighbors[i]].type == 'brain') { brainFound = true; break; }
                            }
                        }
                        return brainFound && !cells.hasOwnProperty(loc.join(':'));
                        break;
                    default: return false; break; // Can't place unknown cell type!
                }
            },
            heartbeat: function(cells, user, heartbeats) {
                var affected = {};
                for(var allGrid in cells) { // Isolate cells we're going to update
                    if(cells.hasOwnProperty(allGrid) && cells[allGrid].owner == user) {
                        affected[allGrid] = cells[allGrid];
                    }
                }
                for(var grid in affected) {
                    if(affected.hasOwnProperty(grid) && affected[grid].owner == user) {
                        var cell = affected[grid];
                        var age = heartbeats - cell.created;
                        var decay = 0;
                        switch(cell.type) { // Subtract health based on cell type
                            case 'somatic': decay = randomIntRange(2*(age-1),3*(age-1));
                        }
                        cell.life -= decay;
                    }
                }
                return affected;
            }
        }
});