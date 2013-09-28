/* Controllers */

angular.module('Plasma.controllers', [])
	.controller('Main', ['$scope', '$timeout', '$filter', 'localStorageService', 'utility', function($scope, $timeout, $filter, localStorageService, utility) {
        
        $scope.zoomPosition = [0,0]; // Tracking zoom window position
        $scope.overPixel = ['-','-']; // Tracking your coordinates'
        $scope.authStatus = '';
        var mainPixSize = 2, zoomPixSize = 10, zoomSize = [60,60], lastZoomPosition = [0,0], localPixels = {};
        var panMouseDown = 0, zoomMouseDown = 0, keyPressed = false, keyUpped = true, pinging = false;
        
        // Authentication
        $scope.authenticate = function() {
            $scope.authStatus = 'logging';
            auth.login('password', {email: $scope.loginEmail, password: $scope.loginPassword, rememberMe: true});
        };
        $scope.logOut = function() { auth.logout(); };

        // Create a reference to the pixel data for our canvas
        var fireRef = new Firebase('https://color-chaos.firebaseio.com/canvas1');
        var fireRefPlasma = new Firebase('https://plasma-game.firebaseio.com');
        // Create a reference to the auth service for our data
        var auth = new FirebaseSimpleLogin(fireRefPlasma, function(error, user) {
            $timeout(function() {
                if(error) {
                    console.log(error, $scope.loginEmail, $scope.loginPassword);
                    if(error.code == 'INVALID_USER') {
                        auth.createUser($scope.loginEmail, $scope.loginPassword, function(createdError, createdUser) {
                            if(createdError) {
                                console.log(createdError);
                            } else {
                                console.log(createdUser);
                                $scope.user = createdUser;
                                $scope.authStatus = 'logged';
                            }
                        })
                    } else if(error.code == 'INVALID_PASSWORD') {
                        $scope.authStatus = 'badPass';
                    } else if(error.code == 'INVALID_EMAIL') {
                        $scope.authStatus = 'badEmail';
                    }
                } else if(user) {
                    console.log(user);
                    $scope.authStatus = 'logged';
                    $scope.user = user;
                } else {
                    console.log('logged out');
                    $scope.authStatus = 'notLogged';
                }
            });
        });
        
        // Attempt to get these variables from localstorage
        var localStores = [];
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
        zoomHighCanvas.onmousedown = function() { 
            zoomMouseDown = 1; 
            if(event.which == 2) {
                
            }
            return false; 
        };
        zoomHighCanvas.onmouseout = zoomHighCanvas.onmouseup = function() {
            if(event.which == 2) {
                
            }
            zoomMouseDown = 0; 
        };

        // Disable text selection.
        mainHighCanvas.onselectstart = function() { return false; };
        zoomHighCanvas.onselectstart = function() { return false; };
        
        var drawOnMouseDown = function() {
            if($scope.authStatus != 'logged') { return; } // If not authed
            if(event.which == 3) { event.preventDefault(); return; } // If right click pressed
            zoomHighCanvas.style.cursor = 'none'; // Hide cursor
            dimPixel(); // Dim the pixel being drawn on
            // Write the pixel into Firebase
            var randomColor = {hex:'222222'};
            if(event.which == 1) { // If left click pressed
                for(var i=0; i<3; i++) {
                    randomColor = utility.generate($scope.keptPixels);
                    addLastColor(randomColor);
                }
            }
            if($scope.overPixel[0] != '-') {
                if(keyPressed) {
                    for(var k=0; k<3; k++) {
                        randomColor = utility.generate($scope.keptPixels);
                        addLastColor(randomColor);
                    }
                }
                keyPressed = false;
            } else {
                return;
            }
            colorToPlace = randomColor;
            if(($scope.lastPixel[0] != $scope.overPixel[0] || $scope.lastPixel[1] != $scope.overPixel[1])) // If we're on a new pixel
            {
                $scope.lastColors = [];
            }
            if(event.which != 2) {
                $scope.keeping = true;
            }
            fireRef.child('pixels').child($scope.overPixel[0] + ":" + $scope.overPixel[1]).set(colorToPlace.hex);
            
            // WIP tooltip stuff... put in own function
//            $timeout(function() {
//                console.log(jQuery('#palCol'+colorToPlace.hex).attr('title','hey you!').tooltip({placement:'bottom',trigger:'manual'}).tooltip('show'));
//            },100);
//            $timeout(function() {
//                jQuery('#palCol'+colorToPlace.hex).tooltip('destroy');
//            },2000);
        };

        var drawZoomCanvas = function() {
            zoomContext.fillStyle = "#222222";
            zoomContext.fillRect(0,0,zoomSize[0]*zoomPixSize,zoomSize[1]*zoomPixSize);
            for(var pixKey in localPixels) {
                if(localPixels.hasOwnProperty(pixKey)) {
                    var coords = pixKey.split(":");
                    drawZoomPixel(localPixels[pixKey],coords[0],coords[1]);
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
            drawZoomCanvas();
            mainHighContext.fillStyle = 'rgba(255, 255, 255, 0.03)'; // Draw new zoom rect
            mainHighContext.fillRect(x*mainPixSize,y*mainPixSize,60*mainPixSize,60*mainPixSize);
        };
        changeZoomPosition(0,0);
        
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
        var onMouseMove = function(e) {
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
        var onMouseOut = function() {
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
        
        // When the mouse button is pressed (on the zoomHighCanvas)
        var overZoomMouseDown = function() {
            jQuery(zoomCanvas).mousedown(); // Echo the event to the zoom canvas
        };
        
        jQuery(zoomHighCanvas).mousemove(onMouseMove);
        jQuery(zoomHighCanvas).mouseout(onMouseOut);
        jQuery(mainHighCanvas).mousedown(panOnMouseDown);
        jQuery(mainHighCanvas).mousemove(panOnMouseMove);
        jQuery(mainHighCanvas).mouseup(panOnMouseUp);
    //    jQuery(zoomHighCanvas).mousedown(overZoomMouseDown); // Will send to zoom canvas
    //    jQuery(zoomCanvas).mousedown(drawOnMouseDown);
        jQuery(window).resize(alignCanvases); // Re-align canvases on window resize
        
        // Add callbacks that are fired any time the pixel data changes and adjusts the canvas appropriately
        // Note that child_added events will be fired for initial pixel data as well
        var drawPixel = function(snapshot) {
            localPixels[snapshot.name()] = snapshot.val();
            var coords = snapshot.name().split(":");
            drawZoomPixel(snapshot.val(),coords[0],coords[1]);
            mainContext.fillStyle = "#" + snapshot.val();
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
        fireRef.child('pixels').on('child_added', drawPixel);
        fireRef.child('pixels').on('child_changed', drawPixel);
        fireRef.child('pixels').on('child_removed', clearPixel);
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