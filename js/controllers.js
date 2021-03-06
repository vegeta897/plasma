/* Controllers */

angular.module('Plasma.controllers', [])
	.controller('Main', ['$scope', '$timeout', '$filter', 'localStorageService', 'colorUtility', 'canvasUtility', 'gameUtility', function($scope, $timeout, $filter, localStorageService, colorUtility, canvasUtility, gameUtility) {
        
        $scope.zoomPosition = [120,120]; // Tracking zoom window position
        $scope.overPixel = ['-','-']; // Tracking your coordinates'
        $scope.authStatus = '';
        $scope.helpText = '';
        $scope.userCells = 0;
        $scope.zoomLevel = 6;
        $scope.addingCell = {};
        var mainPixSize = 2, zoomPixSize = 12, zoomSize = [50,50], lastZoomPosition = [0,0], viewCenter, panOrigin,
            panMouseDown = 0,  dragPanning = false, zoomMouseDown = 0, keyPressed = false, keyUpped = true, 
            pinging = false, userID, fireUser, fireInventory, localPixels = {}, localUsers = {}, tutorialStep = 0;
        
        // Authentication
        $scope.authenticate = function() {
            $scope.authStatus = 'logging';
            auth.login('password', {email: $scope.loginEmail, password: $scope.loginPassword, rememberMe: true});
        };
        $scope.logOut = function() { auth.logout(); };

        // Create a reference to the pixel data for our canvas
        var fireRef = new Firebase('https://plasma-game.firebaseio.com/map1');
        // Create a reference to the auth service for our data
        var auth = new FirebaseSimpleLogin(fireRef, function(error, user) {
            $timeout(function() {
                if(error) {
                    console.log(error, $scope.loginEmail, $scope.loginPassword);
                    if(error.code == 'INVALID_USER') {
                        auth.createUser($scope.loginEmail, $scope.loginPassword, 
                            function(createdError, createdUser) {
                            if(createdError) { console.log(createdError); } else {
                                console.log('user created:',createdUser.id,createdUser.email);
                                userID = createdUser.id;
                                $scope.user = createdUser;
                                fireRef.auth(createdUser.token, function() {
                                    fireUser = fireRef.child('users/'+userID);
                                    fireUser.set({heartbeats: 0, new: 'true', 
                                        nick: createdUser.email.substr(0,createdUser.email.indexOf('@'))}, 
                                        function() { initUser(); });
                                    $timeout(function() { $scope.authStatus = 'logged'; });
                                });
                            }
                        })
                    } else if(error.code == 'INVALID_PASSWORD') { $scope.authStatus = 'badPass'; } else 
                    if(error.code == 'INVALID_EMAIL') { $scope.authStatus = 'badEmail'; }
                } else if(user) {
                    console.log('logged in:',user.id,user.email);
                    $scope.user = user;
                    userID = user.id;
                    fireUser = fireRef.child('users/'+userID);
                    initUser();
                    $scope.authStatus = 'logged';
                } else { console.log('logged out'); $scope.authStatus = 'notLogged'; }
            });
        });
        
        var tutorial = function(action) {
            if(action == 'init') {
                if(localStorageService.get('tutorialStep')) {
                    tutorialStep = localStorageService.get('tutorialStep');
                } else { tutorialStep = 0; }
            } else { tutorialStep++; }
            $timeout(function() { 
                $scope.helpText = gameUtility.tutorial(tutorialStep);
                localStorageService.set('tutorialStep',tutorialStep);
            });
        };
        tutorial('init');
        
        var initUser = function() {
            fireUser.once('value', function(snapshot) {
                $timeout(function() { 
                    $scope.heartbeats = snapshot.val().heartbeats;
                    $scope.brain = snapshot.val().brain;
                    $scope.newUser = (snapshot.val()['new'] == 'true');
                    $scope.userInit = true;
                    if(!$scope.newUser) { return; }
                    tutorialStep = -1;
                    tutorial('next');
                });
            });
            fireInventory = fireUser.child('inventory');
            fireInventory.on('child_added', updateInventory);
            fireInventory.on('child_changed', updateInventory);
            fireInventory.on('child_removed', removeInventory);
        };
        
        // Attempt to get these variables from localstorage
        var localStores = ['zoomPosition','zoomLevel'];
        for(var i = 0; i < localStores.length; i++) {
            if(localStorageService.get(localStores[i])) {
                $scope[localStores[i]] = localStorageService.get(localStores[i]);
            }
        }
        
        // Set up our canvas
        var mainCanvas = document.getElementById('mainCanvas');
        var zoomCanvas = document.getElementById('zoomCanvas');
        var mainContext = mainCanvas.getContext ? mainCanvas.getContext('2d') : null;
        var zoomContext = zoomCanvas.getContext ? zoomCanvas.getContext('2d') : null;
        canvasUtility.fillCanvas(mainContext,'222222'); canvasUtility.fillCanvas(zoomContext,'#222222');

        // Prevent right-click on canvases
        jQuery('body').on('contextmenu', '#zoomHighlightCanvas', function(e){ return false; })
            .on('contextmenu', '#mainHighlightCanvas', function(e){ return false; });

        var zoomHighCanvas = document.getElementById('zoomHighlightCanvas'); // Zoom canvas pixel highlighting
        var mainPingCanvas = document.getElementById('mainPingCanvas'); // Main canvas pinging
        var mainHighCanvas = document.getElementById('mainHighlightCanvas'); // Main canvas highlighting
        var zoomHighContext = zoomHighCanvas.getContext ? zoomHighCanvas.getContext('2d') : null;
        var mainPingContext = mainPingCanvas.getContext ? mainPingCanvas.getContext('2d') : null;
        var mainHighContext = mainHighCanvas.getContext ? mainHighCanvas.getContext('2d') : null;
        $timeout(function(){ alignCanvases(); }, 500); // Set its position to match the real canvas

        // Align canvas positions
        var alignCanvases = function() {
            jQuery(zoomHighCanvas).offset(jQuery(zoomCanvas).offset());
            jQuery(mainPingCanvas).offset(jQuery(mainCanvas).offset());
            jQuery(mainHighCanvas).offset(jQuery(mainCanvas).offset());
        };
        
        // Keep track of if the mouse is up or down
        zoomHighCanvas.onmousedown = function(event) { 
            zoomMouseDown = 1; 
            if(event.which == 2) {
                
            }
            return false; 
        };
        zoomHighCanvas.onmouseout = zoomHighCanvas.onmouseup = function(event) {
            if(event.which == 2) {
                
            }
            zoomMouseDown = 0; 
        };

        // Disable text selection.
        mainHighCanvas.onselectstart = function() { return false; };
        zoomHighCanvas.onselectstart = function() { return false; };
        
        $scope.resetUser = function() {
            fireUser.set({heartbeats: 0, new: 'true', nick: 'Veggies'});
        };
        $scope.waitOne = function() {
            heartbeat();
        };
        
        $scope.changeZoom = function(val) {
            if($scope.zoomLevel == val && viewCenter) { return; }
            $timeout(function(){});
            var oldZoom = zoomSize;
            var zoomLevels = [5,8,10,12,15,20,30,40,60];
            $scope.zoomLevel = parseInt(val);
            localStorageService.set('zoomLevel',$scope.zoomLevel);
            zoomPixSize = zoomLevels[$scope.zoomLevel];
            zoomSize = [600/zoomPixSize,600/zoomPixSize];
            var offset = [oldZoom[0]-zoomSize[0],oldZoom[1]-zoomSize[1]];
            if(!viewCenter) { 
                viewCenter = [$scope.zoomPosition[0] + zoomSize[0]/2, 
                $scope.zoomPosition[1] + zoomSize[1]/2];
                lastZoomPosition = $scope.zoomPosition;
            } else {
                var fixedCoords = [Math.floor(viewCenter[0]-oldZoom[0]/2),Math.floor(viewCenter[1]-oldZoom[1]/2)];
                lastZoomPosition = [Math.floor(fixedCoords[0]+offset[0]/2), // Keep centered
                    Math.floor(fixedCoords[1]+offset[1]/2)];
            }
            var x = lastZoomPosition[0], y = lastZoomPosition[1]; // Fix zoom area going off edge
            if(x < 0) { x = 0; } if(y < 0) { y = 0; }
            if(x > 300 - zoomSize[0]) { x = 300 - zoomSize[0]; }
            if(y > 300 - zoomSize[1]) { y = 300 - zoomSize[1]; }
            $scope.zoomPosition = lastZoomPosition = [x,y];
            localStorageService.set('zoomPosition',$scope.zoomPosition);
            canvasUtility.fillCanvas(mainHighContext,'erase'); // Draw new zoom highlight area
            canvasUtility.fillMainArea(mainHighContext,'rgba(255, 255, 255, 0.03)',
                lastZoomPosition,zoomSize);
            drawZoomCanvas();
            dimPixel();
        };
        
        $scope.addBrain = function() {
            tutorial('next');
            $scope.brain = {};
            $scope.brain.color = colorUtility.generate('brain',{hsv:true});
            fireUser.child('brain').set(angular.copy($scope.brain));
            fireInventory.push({
                type: 'brain', color: $scope.brain.color,
                contents: [ 'somatic', 'somatic', 'somatic', 'somatic' ]
            });
        };
        
        $scope.addCell = function(cell) {
            cell.adding = true;
            $scope.addingCell = cell;
            jQuery(zoomHighCanvas).unbind('mousedown');
            jQuery(zoomHighCanvas).mousedown(placeCell);
        };
        
        $scope.cancelAddCell = function() {
            $timeout(function() {
                dimPixel();
                $scope.addingCell.adding = false;
                $scope.addingCell = {};
                jQuery(zoomHighCanvas).unbind('mousedown');
                jQuery(zoomHighCanvas).mousedown(selectCell);
            });
        };
        
        $scope.harvestItem = function(id,item) {
            fireInventory.push({
                type: item, contents: [],
                color: colorUtility.generate(item, $scope.brain.color)
            });
            var newContents = $scope.selectedCell.contents;
            newContents.splice(id,1);
            fireRef.child('cells/'+$scope.selectedCell.grid+'/contents').set(newContents);
            if(newContents.length == 0 && tutorialStep == 3) { tutorial('next'); }
            if(item == 'energy' && tutorialStep == 5) { tutorial('next'); }
            if(item == 'germ' && tutorialStep == 8) { tutorial('next'); }
        };
        
        var heartbeat = function() {
            $timeout(function(){
                var updatedCells = gameUtility.heartbeat(localPixels, userID, $scope.heartbeats,
                    $scope.brain.color);
                fireRef.child('cells').update(updatedCells); // Will update only updated cells
                $scope.heartbeats += 1;
                fireUser.child('heartbeats').set($scope.heartbeats);
            });
        };
        
        var updateInventory = function(snapshot) {
            var itemAdded = snapshot.val();
            itemAdded.fireID = snapshot.name();
            $timeout(function(){
                switch(itemAdded.type) {
                    case 'brain':
                        fireUser.child('new').set('false');
                        $scope.newUser = false;
                        break;
                    default:
                        break;
                } 
                if(!$scope.inventory) { $scope.inventory = {}; }
                $scope.inventory[snapshot.name()] = itemAdded; 
            });
        };
        
        var removeInventory = function(snapshot) {
            $timeout(function(){
                switch(snapshot.val().type) {
                    case 'brain':
                        tutorial('next');
                        break;
                    default:
                        break;
                }
                delete $scope.inventory[snapshot.name()]; 
                var items = 0; // Check how many items are in the inventory
                for(var key in $scope.inventory) {
                    if($scope.inventory.hasOwnProperty(key)) { items++; break; }
                }
                if(items == 0) { 
                    $scope.inventory = null; 
                    if(tutorialStep == 4) { tutorial('next'); }
                }
            });
        };

        var selectCell = function(event) {
            if(event.which == 3) {  event.preventDefault(); return; } // If right click pressed
            if(event.which == 2) {  startDragPanning(event); return; } // If middle click pressed
            if($scope.authStatus != 'logged') { return; } // If not authed
            $timeout(function() {
                if(localPixels.hasOwnProperty($scope.overPixel[0] + ":" + $scope.overPixel[1])) {
                    $scope.selectedCell = localPixels[$scope.overPixel[0] + ":" + $scope.overPixel[1]];
                    $scope.selectedCell.ownerNick = localUsers[$scope.selectedCell.owner].nick;
                } else { $scope.selectedCell = null; }
                dimPixel(); // Will draw select box
                if(!$scope.selectedCell) { return; }
                if($scope.selectedCell.type == 'brain' && $scope.selectedCell.owner == userID 
                    && tutorialStep == 2) { tutorial('next'); }
                
            });
        };
        
        var placeCell = function(event) {
            if($scope.authStatus != 'logged') { return; } // If not authed
            if(event.which == 3) { $scope.cancelAddCell(); event.preventDefault(); return; } // If right click pressed
            if(event.which == 2) { startDragPanning(event); return; } // If middle click pressed
            var cell = $scope.addingCell;
            if(!gameUtility.validLocation(userID, localPixels, cell.type, $scope.overPixel)) { return; }
            dimPixel(); // Dim the pixel being drawn on
            // Add the cell in firebase
            fireRef.child('cells/'+$scope.overPixel[0] + ":" + $scope.overPixel[1]).set(
                {
                    owner: userID, type: cell.type, color: cell.color, created: $scope.heartbeats,
                    contents: cell.contents ? cell.contents : [], life: 100
                }
            );
            fireInventory.child(cell.fireID).remove();
            if(cell.type == 'brain') { 
                $scope.brain.grid = $scope.overPixel.join(':'); 
                fireUser.child('brain').update($scope.brain);
            }
            if(cell.type == 'energy' && tutorialStep == 6) { tutorial('next'); }
            $scope.addingCell = {};
            jQuery(zoomHighCanvas).unbind('mousedown');
            jQuery(zoomHighCanvas).mousedown(selectCell);
            heartbeat();
        };

        var drawZoomCanvas = function() {
            canvasUtility.fillCanvas(zoomContext,'222222');
            for(var pixKey in localPixels) {
                if(localPixels.hasOwnProperty(pixKey)) {
                    var coords = pixKey.split(":");
                    canvasUtility.drawZoomPixel(zoomContext,localPixels[pixKey].color.hex,
                        coords,$scope.zoomPosition,zoomPixSize);
                    canvasUtility.drawCellHealth(zoomContext,localPixels[pixKey].color.hex,
                        localPixels[pixKey].life,coords,$scope.zoomPosition,zoomPixSize);
                    if(localPixels[pixKey].owner == userID && localPixels[pixKey].hasOwnProperty('contents')) {
                        canvasUtility.drawCellContents(zoomContext,localPixels[pixKey],
                            coords,$scope.zoomPosition,zoomPixSize); }
                }
            }
        };
        
        var changeZoomPosition = function(x,y) {
            canvasUtility.fillMainArea(mainHighContext,'erase',lastZoomPosition,zoomSize);
            $timeout(function(){});
            $scope.zoomPosition = [x,y];
            if(viewCenter){ localStorageService.set('zoomPosition',$scope.zoomPosition); }
            lastZoomPosition = [x,y];
            drawZoomCanvas();
            if(viewCenter){ canvasUtility.fillMainArea(mainHighContext,'rgba(255, 255, 255, 0.03)',
                [x,y],zoomSize); } // Draw new zoom rect
        };
        changeZoomPosition($scope.zoomPosition[0],$scope.zoomPosition[1]);
        
        var startDragPanning = function(e) {
            dragPanning = true;
            panOrigin = $scope.overPixel;
            dimPixel();
            jQuery(zoomHighCanvas).unbind('mousemove');
            jQuery(zoomHighCanvas).mousemove(dragPan);
            jQuery(zoomHighCanvas).unbind('mousedown');
            jQuery(zoomHighCanvas).mouseup(stopDragPanning);
        };
        
        var dragPan = function(e) {
            if(!dragPanning || e.which == 0) { stopDragPanning(); return; }
            var offset = jQuery(zoomCanvas).offset(); // Get pixel location
            var x = Math.floor($scope.zoomPosition[0] + (e.pageX - offset.left) / zoomPixSize),
                y = Math.floor($scope.zoomPosition[1] + (e.pageY - offset.top) / zoomPixSize);
            var panOffset = [x - panOrigin[0], y - panOrigin[1]];
            if(panOffset[0] == 0 && panOffset[1] == 0) { return; }
            var newPosition = [$scope.zoomPosition[0]-panOffset[0],$scope.zoomPosition[1]-panOffset[1]];
            if(newPosition[0] < 0) { newPosition[0] = 0; } if(newPosition[1] < 0) { newPosition[1] = 0; }
            if(newPosition[0] > 300 - zoomSize[0]) { newPosition[0] = 300 - zoomSize[0]; }
            if(newPosition[1] > 300 - zoomSize[1]) { newPosition[1] = 300 - zoomSize[1]; }
            viewCenter = [newPosition[0]+zoomSize[0]/2,newPosition[1]+zoomSize[1]/2];
            changeZoomPosition(newPosition[0],newPosition[1]);
            dimPixel();
        };
        
        var stopDragPanning = function() {
            dragPanning = false;
            jQuery(zoomHighCanvas).mousemove(zoomOnMouseMove);
            jQuery(zoomHighCanvas).mousedown(selectCell);
            jQuery(zoomHighCanvas).unbind('mouseup');
        };
        
        var panOnMouseDown = function(e) {
            e.preventDefault();
            panMouseDown = true;
            var offset = jQuery(mainCanvas).offset(); // Get pixel location
            var x = Math.floor((e.pageX - offset.left) / mainPixSize),
                y = Math.floor((e.pageY - offset.top) / mainPixSize);
            viewCenter = [x,y]; // Store view center
            x = Math.floor(x - zoomSize[0]/2); y = Math.floor(y - zoomSize[1]/2); // Apply offsets
            if(x < 0) { x = 0; } if(y < 0) { y = 0; }
            if(x > 300 - zoomSize[0]) { x = 300 - zoomSize[0]; }
            if(y > 300 - zoomSize[1]) { y = 300 - zoomSize[1]; }
            if(lastZoomPosition[0] == x && lastZoomPosition[1] == y) { return; }
            changeZoomPosition(x,y);
            dimPixel();
        };
        
        var panOnMouseMove = function(e) {
            if(!panMouseDown || e.which == 0) { return; }
            var offset = jQuery(mainCanvas).offset(); // Get pixel location
            var x = Math.floor((e.pageX - offset.left) / mainPixSize),
                y = Math.floor((e.pageY - offset.top) / mainPixSize);
            viewCenter = [x,y]; // Store view center
            x = Math.floor(x - zoomSize[0]/2); y = Math.floor(y - zoomSize[1]/2); // Apply offsets
            if(x < 0) { x = 0; } if(y < 0) { y = 0; }
            if(x > 300 - zoomSize[0]) { x = 300 - zoomSize[0]; }
            if(y > 300 - zoomSize[1]) { y = 300 - zoomSize[1]; }
            if(lastZoomPosition[0] == x && lastZoomPosition[1] == y) { return; }
            changeZoomPosition(x,y);
            dimPixel();
        };

        var panOnMouseUp = function(e) { panMouseDown = false; };
        
        // Check for mouse moving to new pixel
        var zoomOnMouseMove = function(e) {
            var offset = jQuery(zoomHighCanvas).offset(); // Get pixel location
            var x = Math.floor((e.pageX - offset.left) / zoomPixSize),
                y = Math.floor((e.pageY - offset.top) / zoomPixSize);
            // If the pixel location has changed
            if($scope.overPixel[0] != x + $scope.zoomPosition[0] || $scope.overPixel[1] != y + $scope.zoomPosition[1]) {
                zoomHighCanvas.style.cursor = 'default'; // Show cursor
                dimPixel(); // Dim the previous pixel
                $scope.$apply(function() {
                    // Update the pixel location we're now over, offsetting by zoom window position
                    $scope.overPixel = [x+$scope.zoomPosition[0],y+$scope.zoomPosition[1]];
                    var drawColor = 'rgba(255, 255, 255, 0.1)';
                    if($scope.addingCell.hasOwnProperty('color')) {
                        var rgb = colorUtility.hexToRGB($scope.addingCell.color.hex);
                        drawColor = 'rgba(' + rgb.r + (', ') + rgb.g + (', ') + rgb.b + ', 0.5)';
                    }
                    canvasUtility.drawZoomPixel(zoomHighContext, drawColor, // Highlight pixel underneath cursor
                        $scope.overPixel, $scope.zoomPosition, zoomPixSize);
                    if($scope.addingCell && $scope.addingCell.type == 'energy') {
                        var coords = [$scope.overPixel[0]-$scope.zoomPosition[0],
                            $scope.overPixel[1]-$scope.zoomPosition[1]];
                        var reach = $scope.addingCell.type == 'energy' ? 2 : 0;
                        canvasUtility.drawReach(zoomHighContext,coords,reach,zoomPixSize);
                    }
                });
            }
        };
        // Draw selection box around selected cell
        var drawSelect = function() {
            if(!$scope.selectedCell) { return; }
            var coords = $scope.selectedCell.grid.split(':');
            coords = [coords[0]-$scope.zoomPosition[0],coords[1]-$scope.zoomPosition[1]];
            canvasUtility.drawSelect(zoomHighContext,coords,zoomPixSize);
        };
        // Draw the selected cell's reach
        var drawReach = function() {
            if(!$scope.selectedCell) { return; }
            var reach = $scope.selectedCell.type == 'energy' ? 2 : 0;
            var coords = $scope.selectedCell.grid.split(':');
            coords = [coords[0]-$scope.zoomPosition[0],coords[1]-$scope.zoomPosition[1]];
            canvasUtility.drawReach(zoomHighContext,coords,reach,zoomPixSize);
        };
        // Dim the pixel after leaving it
        var dimPixel = function() {
            canvasUtility.fillCanvas(zoomHighContext,'erase');
            if($scope.selectedCell && $scope.selectedCell.hasOwnProperty('output')) {
                drawReach();
            }
            drawSelect();
        };
        // When the mouse leaves the canvas
        var zoomOnMouseOut = function() {
            dimPixel();
            $scope.$apply(function() {
                $scope.overPixel = ['-','-'];
            });
        };
        // When scrolling on the zoom canvas
        var zoomScroll = function(event, delta, deltaX, deltaY){
            if(deltaY < 0 && $scope.zoomLevel > 0) {
                $scope.changeZoom($scope.zoomLevel - 1);
            } else if(deltaY > 0 && $scope.zoomLevel < 8) {
                $scope.changeZoom($scope.zoomLevel + 1);
            }
            $('.zoom-slider').slider('setValue',$scope.zoomLevel);
            event.preventDefault();
            return false;
        };
        // Ping a pixel
        var ping = function() {
            if(pinging || $scope.overPixel[0] == '-') { return; }
            pinging = $scope.overPixel;
            fireRef.child('meta/pings/'+pinging[0] + ":" + pinging[1]).set(true);
            $timeout(function(){unPing()},1600); // Keep ping for 5 seconds
        };
        // Un-ping a pixel
        var unPing = function() {
            fireRef.child('meta/pings/'+pinging[0] + ":" + pinging[1]).set(null);
            pinging = false;
        };
        var drawPing = function(snapshot) { canvasUtility.drawPing(mainPingContext,snapshot.name().split(":")); };
        var hidePing = function(snapshot) { canvasUtility.clearPing(mainPingContext,snapshot.name().split(":")); };
        
        jQuery(zoomHighCanvas).mousemove(zoomOnMouseMove);
        jQuery(zoomHighCanvas).mouseleave(zoomOnMouseOut);
        jQuery(zoomHighCanvas).mousedown(selectCell);
        jQuery(zoomHighCanvas).mousewheel(zoomScroll);
        jQuery(mainHighCanvas).mousemove(panOnMouseMove);
        jQuery(mainHighCanvas).mousedown(panOnMouseDown);
        jQuery(mainHighCanvas).mouseup(panOnMouseUp);
        jQuery(window).resize(alignCanvases); // Re-align canvases on window resize
        
        // When a cell is added/changed
        var drawPixel = function(snapshot) {
            if(snapshot.val().owner == userID && !localPixels.hasOwnProperty(snapshot.name())) {
                $scope.userCells++; }
            localPixels[snapshot.name()] = snapshot.val();
            localPixels[snapshot.name()].grid = snapshot.name(); // Add grid and owner nickname properties
            if($scope.selectedCell && $scope.selectedCell.grid == snapshot.name()) { // If updated selected cell
                $scope.selectedCell = snapshot.val();
                $scope.selectedCell.ownerNick = localUsers[$scope.selectedCell.owner].nick;
            } 
            var coords = snapshot.name().split(":");
            canvasUtility.drawZoomPixel(zoomContext,snapshot.val().color.hex,coords,$scope.zoomPosition,zoomPixSize);
            canvasUtility.fillMainArea(mainContext,snapshot.val().color.hex,coords,[1,1]);
            canvasUtility.drawCellHealth(zoomContext,snapshot.val().color.hex,snapshot.val().life,
                coords,$scope.zoomPosition,zoomPixSize);
            if(snapshot.val().owner == userID && snapshot.val().hasOwnProperty('contents')) {
                canvasUtility.drawCellContents(zoomContext,snapshot.val(),
                    coords,$scope.zoomPosition,zoomPixSize); }
        };
        // When a cell is removed
        var clearPixel = function(snapshot) {
            if(snapshot.val().owner == userID) { $scope.userCells--; }
            delete localPixels[snapshot.name()];
            if($scope.selectedCell && $scope.selectedCell.grid == snapshot.name()) { 
                $scope.selectedCell = null; dimPixel(); 
            }
            var coords = snapshot.name().split(":");
            $timeout(function(){ alignCanvases(); }, 200); // Realign canvases
            canvasUtility.drawZoomPixel(zoomContext,'222222',coords,$scope.zoomPosition,zoomPixSize);
            canvasUtility.fillMainArea(mainContext,'222222',coords,[1,1]);
        };
        // Firebase listeners
        fireRef.child('cells').on('child_added', drawPixel);
        fireRef.child('cells').on('child_changed', drawPixel);
        fireRef.child('cells').on('child_removed', clearPixel);
        fireRef.child('users').on('child_added', function(snap) { localUsers[snap.name()] = snap.val(); });
        fireRef.child('users').on('child_changed', function(snap) { localUsers[snap.name()] = snap.val(); });
        fireRef.child('users').on('child_removed', function(snap) { delete localUsers[snap.name()]; });
        fireRef.child('meta/pings').on('child_added', drawPing);
        fireRef.child('meta/pings').on('child_removed', hidePing);
        
        var onKeyDown = function(e) {
            if(!keyUpped) { return; }
            keyUpped = false;
            switch (e.which) {
                case 65: // A
                    ping();
                    break;
            }
        };

        jQuery(window).keydown(onKeyDown);
        jQuery(window).keyup(function() { keyUpped = true; });
        $scope.changeZoom($scope.zoomLevel); // Apply initial zoom on load
    }])
    ;