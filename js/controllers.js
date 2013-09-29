/* Controllers */

angular.module('Plasma.controllers', [])
	.controller('Main', ['$scope', '$timeout', '$filter', 'localStorageService', 'utility', function($scope, $timeout, $filter, localStorageService, utility) {
        
        $scope.zoomPosition = [120,120]; // Tracking zoom window position
        $scope.overPixel = ['-','-']; // Tracking your coordinates'
        $scope.authStatus = '';
        $scope.helpText = '';
        $scope.inventory = {}; // Local user inventory, modified in firebase callbacks
        $scope.addingCell = {}; // Cell being added when its [+] button is clicked in inventory
        var mainPixSize = 2, zoomPixSize = 10, zoomSize = [60,60], lastZoomPosition = [0,0], localPixels = {};
        var panMouseDown = 0, zoomMouseDown = 0, keyPressed = false, keyUpped = true, pinging = false;
        var userID, fireUser, fireInventory;
        
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
                            if(createdError) {
                                console.log(createdError);
                            } else {
                                console.log('user created:',createdUser.id,createdUser.email);
                                userID = createdUser.id;
                                $scope.user = createdUser;
                                fireRef.auth(createdUser.token, function() {
                                    fireUser = fireRef.child('users').child(userID);
                                    fireUser.child('new').set('true', function() {
                                        initUser();
                                    });
                                    $timeout(function() { $scope.authStatus = 'logged'; });
                                });
                            }
                        })
                    } else if(error.code == 'INVALID_PASSWORD') {
                        $scope.authStatus = 'badPass';
                    } else if(error.code == 'INVALID_EMAIL') {
                        $scope.authStatus = 'badEmail';
                    }
                } else if(user) {
                    console.log('logged in:',user.id,user.email);
                    $scope.user = user;
                    userID = user.id;
                    fireUser = fireRef.child('users').child(userID);
                    initUser();
                    $scope.authStatus = 'logged';
                } else {
                    console.log('logged out');
                    $scope.authStatus = 'notLogged';
                }
            });
        });
        
        var initUser = function() {
            fireUser.child('new').once('value', function(snapshot) {
                $timeout(function() { 
                    $scope.newUser = (snapshot.val() == 'true');
                    $scope.helpText = 'To begin, add a Brain Cell to your inventory.';
                });
            });
            fireInventory = fireUser.child('inventory');
            fireInventory.on('child_added', updateInventory);
            fireInventory.on('child_changed', updateInventory);
            fireInventory.on('child_removed', removeInventory);
        };
        
        // Attempt to get these variables from localstorage
        var localStores = ['zoomPosition'];
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
        mainContext.fillStyle = zoomContext.fillStyle = '#222222'; // Fill the canvas with gray
        mainContext.fillRect(0,0,600,600); zoomContext.fillRect(0,0,600,600);

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

        $scope.addBrain = function() {
            fireInventory.push({
                created: new Date().getTime(), type: 'brain', 
                color: utility.generate({
                    minHue: 0, maxHue: 360, minSat: 50, maxSat: 100, minVal: 60, maxVal: 100
                })
            });
        };
        
        $scope.addCell = function(cell) {
            cell.adding = true;
            $scope.addingCell = cell;
            jQuery(zoomHighCanvas).mousedown(placeCell);
        };
        
        var updateInventory = function(snapshot) {
            var itemAdded = snapshot.val();
            itemAdded.fireID = snapshot.name();
            $timeout(function(){
                switch(itemAdded.type) {
                    case 'brain':
                        fireUser.child('new').set('false');
                        itemAdded.name = utility.capitalize(itemAdded.type) + ' Cell';
                        $scope.helpText = 'Great! Now click the [+] button, and place it somewhere on the map.';
                        $scope.newUser = false;
                        break;
                    default:
                        break;
                } 
                $scope.inventory[snapshot.name()] = itemAdded; 
            });
        };
        var removeInventory = function(snapshot) {
            $timeout(function(){
                switch(snapshot.val().type) {
                    case 'brain':
                        $scope.helpText = 'Woo! There\'s your brain cell.\n' + 
                            'The brain cell is the center of your new life form.\n' + 
                            'Any cell you place from now on must connect to either your brain, ' + 
                            'or another cell you placed.';
                        break;
                    default:
                        break;
                }
                delete $scope.inventory[snapshot.name()]; 
            });
        };
        
        var placeCell = function(event) {
            if($scope.authStatus != 'logged') { return; } // If not authed
            if(event.which == 3) { event.preventDefault(); return; } // If right click pressed
            zoomHighCanvas.style.cursor = 'none'; // Hide cursor
            dimPixel(); // Dim the pixel being drawn on
            var cell = $scope.addingCell;
            // Add the cell in firebase
            fireRef.child('cells').child($scope.overPixel[0] + ":" + $scope.overPixel[1]).set(
                {
                    owner: userID, type: cell.type, color: cell.color, createdTime: new Date().getTime()
                }
            );
            fireInventory.child(cell.fireID).remove();
            $scope.addingCell = {};
            jQuery(zoomHighCanvas).unbind('mousedown');
        };

        var drawZoomCanvas = function() {
            zoomContext.fillStyle = "#222222";
            zoomContext.fillRect(0,0,zoomSize[0]*zoomPixSize,zoomSize[1]*zoomPixSize);
            for(var pixKey in localPixels) {
                if(localPixels.hasOwnProperty(pixKey)) {
                    var coords = pixKey.split(":");
                    drawZoomPixel(localPixels[pixKey].color.hex,coords[0],coords[1]);
                }
            }
        };
        
        var drawZoomPixel = function(color,x,y) {
            if(x < $scope.zoomPosition[0] || // Check that pixel is within zoom area
                x >= $scope.zoomPosition[0]+zoomSize[0] ||
                y < $scope.zoomPosition[1] ||
                y >= $scope.zoomPosition[1]+zoomSize[1]) {  return; }
            zoomContext.fillStyle = "#" + color;
            zoomContext.fillRect(parseInt(x-$scope.zoomPosition[0]) * zoomPixSize, 
                parseInt(y-$scope.zoomPosition[1]) * zoomPixSize, zoomPixSize, zoomPixSize);
        };
        
        var changeZoomPosition = function(x,y) {
            mainHighContext.clearRect(lastZoomPosition[0]*mainPixSize,lastZoomPosition[1]*mainPixSize,
                60*mainPixSize,60*mainPixSize); // Erase last position
            $timeout(function(){});
            $scope.zoomPosition = [x,y];
            lastZoomPosition = [x,y];
            localStorageService.set('zoomPosition',$scope.zoomPosition);
            drawZoomCanvas();
            mainHighContext.fillStyle = 'rgba(255, 255, 255, 0.03)'; // Draw new zoom rect
            mainHighContext.fillRect(x*mainPixSize,y*mainPixSize,60*mainPixSize,60*mainPixSize);
        };
        changeZoomPosition($scope.zoomPosition[0],$scope.zoomPosition[1]);
        
        var panOnMouseDown = function(e) {
            e.preventDefault();
            panMouseDown = true;
            var offset = jQuery(mainCanvas).offset(); // Get pixel location
            var x = Math.floor((e.pageX - offset.left) / mainPixSize) - zoomSize[0]/2,
                y = Math.floor((e.pageY - offset.top) / mainPixSize) - zoomSize[1]/2;
            changeZoomPosition(x,y);
        };
        
        var panOnMouseMove = function(e) {
            if(!panMouseDown || e.which == 0) { return; }
            var offset = jQuery(mainCanvas).offset(); // Get pixel location
            var x = Math.floor((e.pageX - offset.left) / mainPixSize) - zoomSize[0]/2,
                y = Math.floor((e.pageY - offset.top) / mainPixSize) - zoomSize[1]/2;
            if(x < 0) { x = 0; } if(y < 0) { y = 0; }
            if(x > 300 - zoomSize[0]) { x = 300 - zoomSize[0]; }
            if(y > 300 - zoomSize[1]) { y = 300 - zoomSize[1]; }
            if(lastZoomPosition[0] == x && lastZoomPosition[1] == y) { return; }
            changeZoomPosition(x,y);
        };

        var panOnMouseUp = function(e) {
            panMouseDown = false;
        };
        
        // Check for mouse moving to new pixel
        var zoomOnMouseMove = function(e) {
            var offset = jQuery(zoomHighCanvas).offset(); // Get pixel location
            var x = Math.floor((e.pageX - offset.left) / zoomPixSize),
                y = Math.floor((e.pageY - offset.top) / zoomPixSize);
            // If the pixel location has changed
            if($scope.overPixel[0] != x || $scope.overPixel[1] != y) {
                zoomHighCanvas.style.cursor = 'default'; // Show cursor
                dimPixel(); // Dim the previous pixel
                $scope.$apply(function() {
                    // Update the pixel location we're now over, offsetting by zoom window position
                    $scope.overPixel = [x+$scope.zoomPosition[0],y+$scope.zoomPosition[1]]; 
                });
                highlightPixel(); // Highlight this pixel
            }
        };
        // Dim the pixel after leaving it
        var dimPixel = function() {
            if($scope.overPixel[0] != '-') {
                zoomHighContext.clearRect(($scope.overPixel[0]-$scope.zoomPosition[0]) * zoomPixSize,
                    ($scope.overPixel[1]-$scope.zoomPosition[1]) * zoomPixSize, zoomPixSize, zoomPixSize);
            }
        };
        // When the mouse leaves the canvas
        var zoomOnMouseOut = function() {
            dimPixel();
            $scope.$apply(function() {
                $scope.overPixel = ['-','-'];
            });
        };
        
        // Highlight the pixel underneath the mouse
        var highlightPixel = function() {
            // Draw the highlighted color pixel
            zoomHighContext.fillStyle = 'rgba(255, 255, 255, 0.15)';
            zoomHighContext.fillRect(($scope.overPixel[0]-$scope.zoomPosition[0]) * zoomPixSize,
                ($scope.overPixel[1]-$scope.zoomPosition[1]) * zoomPixSize, zoomPixSize, zoomPixSize);
        };

        // Ping a pixel
        var ping = function() {
            if(pinging || $scope.overPixel[0] == '-') { return; }
            pinging = $scope.overPixel;
            fireRef.child('meta').child('pings').child(pinging[0] + ":" + pinging[1]).set(true);
            $timeout(function(){unPing()},1600); // Keep ping for 5 seconds
        };
        // Un-ping a pixel
        var unPing = function() {
            fireRef.child('meta').child('pings').child(pinging[0] + ":" + pinging[1]).set(null);
            pinging = false;
        };
        var drawPing = function(snapshot) {
            var coords = snapshot.name().split(":");
            var my_gradient = mainPingContext.createRadialGradient(
                coords[0]*mainPixSize + mainPixSize/2, coords[1]*mainPixSize + mainPixSize/2, 15,
                coords[0]*mainPixSize + mainPixSize/2, coords[1]*mainPixSize + mainPixSize/2, 0
            );
            my_gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
            my_gradient.addColorStop(0.2, "rgba(255, 255, 255, 1)");
            my_gradient.addColorStop(0.4, "rgba(255, 255, 255, 0)");
            my_gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
            mainPingContext.fillStyle = my_gradient;
            mainPingContext.beginPath();
            mainPingContext.arc(coords[0]*mainPixSize + mainPixSize/2, coords[1]*mainPixSize + mainPixSize/2, 15, 0, 2 * Math.PI, false);
            var cycle = 0;
            function fadePing() {
                if(Math.round(cycle/2) == cycle/2) {
                    mainPingContext.fill();
                } else {
                    mainPingContext.clearRect(coords[0] * mainPixSize - 15 + mainPixSize/2, coords[1] * mainPixSize - 15 + mainPixSize/2, 30, 30);
                }
                cycle++;
                if(cycle >= 8) {
                    clearInterval(pingInt);
                }
            }
            var pingInt = setInterval(function(){fadePing()},200);
            dimPixel();
        };
        var hidePing = function(snapshot) {
            var coords = snapshot.name().split(":");
            mainPingContext.clearRect(coords[0] * mainPixSize - 15 + mainPixSize/2, coords[1] * mainPixSize - 15 + mainPixSize/2, 30, 30);
        };
        
        jQuery(zoomHighCanvas).mousemove(zoomOnMouseMove);
        jQuery(zoomHighCanvas).mouseout(zoomOnMouseOut);
        jQuery(mainHighCanvas).mousedown(panOnMouseDown);
        jQuery(mainHighCanvas).mousemove(panOnMouseMove);
        jQuery(mainHighCanvas).mouseup(panOnMouseUp);
        jQuery(window).resize(alignCanvases); // Re-align canvases on window resize
        
        // Add callbacks that are fired any time the pixel data changes and adjusts the canvas appropriately
        // Note that child_added events will be fired for initial pixel data as well
        var drawPixel = function(snapshot) {
            localPixels[snapshot.name()] = snapshot.val();
            var coords = snapshot.name().split(":");
            drawZoomPixel(snapshot.val().color.hex,coords[0],coords[1]);
            mainContext.fillStyle = "#" + snapshot.val().color.hex;
            mainContext.fillRect(parseInt(coords[0]) * mainPixSize, parseInt(coords[1]) * mainPixSize, mainPixSize, mainPixSize);
        };
        // Erase a pixel
        var clearPixel = function(snapshot) {
            delete localPixels[snapshot.name()];
            var coords = snapshot.name().split(":");
            $timeout(function(){ alignCanvases(); }, 200); // Realign canvases
            drawZoomPixel('222222',coords[0],coords[1]);
            mainContext.fillStyle = '#222222'; // Canvas bg color
            mainContext.fillRect(parseInt(coords[0]) * mainPixSize, parseInt(coords[1]) * mainPixSize, mainPixSize, mainPixSize);
        };
        // Firebase listeners
        fireRef.child('cells').on('child_added', drawPixel);
        fireRef.child('cells').on('child_changed', drawPixel);
        fireRef.child('cells').on('child_removed', clearPixel);
        fireRef.child('meta').child('pings').on('child_added', drawPing);
        fireRef.child('meta').child('pings').on('child_removed', hidePing);
        
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
        jQuery(window).keyup(function() { keyUpped = true; })
        
    }])
    ;