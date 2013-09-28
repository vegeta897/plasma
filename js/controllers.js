/* Controllers */

angular.module('Plasma.controllers', [])
	.controller('Main', ['$scope', '$timeout', '$filter', 'localStorageService', 'utility', function($scope, $timeout, $filter, localStorageService, utility) {
        
        $scope.overPixel = ['-','-']; // Tracking your coordinates'
        $scope.lastPixel = ['-','-']; // Tracking last pixel placed coordinates
        $scope.authStatus = '';
        var mainPixSize = 3, zoomPixSize = 10;
        var mouseDown = 0, keyPressed = false, keyUpped = true, pinging = false;
        
        // Authentication
        $scope.authenticate = function() {
            $scope.authStatus = 'logging';
            auth.login('password', {email: $scope.loginEmail, password: $scope.loginPassword, rememberMe: true});
        };
        $scope.logOut = function() { auth.logout(); };

        // Create a reference to the pixel data for our canvas
        var fireRef = new Firebase('https://plasma-game.firebaseio.com');
        // Create a reference to the auth service for our data
        var auth = new FirebaseSimpleLogin(fireRef, function(error, user) {
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
        
        jQuery('body').on('contextmenu', '#zoomHighlightCanvas', function(e){ // Prevent right-click on canvas
            return false; 
        });

        var zoomHighCanvas = document.getElementById('zoomHighlightCanvas'); // Define zoomHighCanvas for pixel highlighting
        var mainPingCanvas = document.getElementById('mainPingCanvas'); // Define mainPingCanvas for pinging
        var zoomHighContext = zoomHighCanvas.getContext ? zoomHighCanvas.getContext('2d') : null;
        var mainPingContext = mainPingCanvas.getContext ? mainPingCanvas.getContext('2d') : null;
        $timeout(function(){ alignCanvases(); }, 500); // Set its position to match the real canvas

        // Align canvas positions
        var alignCanvases = function() {
            jQuery(zoomHighCanvas).offset(jQuery(zoomCanvas).offset());
            jQuery(mainPingCanvas).offset(jQuery(mainCanvas).offset());
        };
        
        // Keep track of if the mouse is up or down
        zoomHighCanvas.onmousedown = function() { 
            mouseDown = 1; 
            if(event.which == 2) {
                erasing = true;
            }
            return false; 
        };
        zoomHighCanvas.onmouseout = zoomHighCanvas.onmouseup = function() {
            if(event.which == 2) {
                erasing = false;
            }
            mouseDown = 0; 
        };

        // Disable text selection.
        mainCanvas.onselectstart = function() { return false; };
        
        var drawOnMouseDown = function() {
            if($scope.authStatus != 'logged') { return; } // If not authed
            if(event.which == 3) { event.preventDefault(); return; } // If right click pressed
            if(erasing) {
                fireRef.child('pixels').child($scope.overPixel[0] + ":" + $scope.overPixel[1]).set(null);
                return;
            }
            zoomHighCanvas.style.cursor = 'none'; // Hide cursor
            dimPixel(); // Dim the pixel being drawn on
            // Write the pixel into Firebase
            var randomColor = {hex:'222222'};
            if(!grabbing) { // If we don't have a color grabbed
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
            }
            if(($scope.lastPixel[0] != $scope.overPixel[0] || $scope.lastPixel[1] != $scope.overPixel[1]) && !grabbing) // If we're on a new pixel
            {
                $scope.lastColors = [];
            }
            if(event.which != 2) {
                $scope.keeping = true;
            }
            if(grabbing) {
                fireRef.child('pixels').child($scope.lastPixel[0] + ":" + $scope.lastPixel[1]).set(colorToPlace.hex);
                if(colorToPlace.hasOwnProperty('hsv')) {
                    $scope.keptPixels[$scope.lastPixel[0] + ":" + $scope.lastPixel[1]] = colorToPlace;
                    $scope.keptPixels[$scope.lastPixel[0] + ":" + $scope.lastPixel[1]].id = $scope.lastPixel[0] + ":" + $scope.lastPixel[1];
                }
            } else {
                fireRef.child('pixels').child($scope.overPixel[0] + ":" + $scope.overPixel[1]).set(colorToPlace.hex);
            }
            
            
            // WIP tooltip stuff... put in own function
//            $timeout(function() {
//                console.log(jQuery('#palCol'+colorToPlace.hex).attr('title','hey you!').tooltip({placement:'bottom',trigger:'manual'}).tooltip('show'));
//            },100);
//            $timeout(function() {
//                jQuery('#palCol'+colorToPlace.hex).tooltip('destroy');
//            },2000);
            grabbing = false;
        };
        
        // Check for mouse moving to new pixel
        var onMouseMove = function(e) {
            // Get pixel location
            var offset = jQuery(zoomHighCanvas).offset();
            var x = Math.floor((e.pageX - offset.left) / zoomPixSize),
                y = Math.floor((e.pageY - offset.top) / zoomPixSize);
            // If the pixel location has changed
            if($scope.overPixel[0] != x || $scope.overPixel[1] != y) {
                zoomHighCanvas.style.cursor = 'default'; // Show cursor
                dimPixel(); // Dim the previous pixel
                $scope.$apply(function() {
                    $scope.overPixel = [x,y]; // Update the pixel location we're now over
                });
                highlightPixel(); // Highlight this pixel
            }
        };
        // Dim the pixel after leaving it
        var dimPixel = function() {
            if($scope.overPixel[0] != '-') {
                zoomHighContext.clearRect($scope.overPixel[0] * zoomPixSize, $scope.overPixel[1] * zoomPixSize, zoomPixSize, zoomPixSize);
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
            zoomHighContext.fillRect($scope.overPixel[0] * zoomPixSize, $scope.overPixel[1] * zoomPixSize, zoomPixSize, zoomPixSize);
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
        var overMouseDown = function() {
            jQuery(mainCanvas).mousedown(); // Echo the event to the real canvas
        };
        
        jQuery(zoomHighCanvas).mousemove(onMouseMove);
        jQuery(zoomHighCanvas).mouseout(onMouseOut);
        jQuery(zoomHighCanvas).mousedown(overMouseDown); // Will send to real canvas
        jQuery(mainCanvas).mousedown(drawOnMouseDown);
        jQuery(window).resize(alignCanvases); // Re-align canvases on window resize

        // Add callbacks that are fired any time the pixel data changes and adjusts the canvas appropriately
        // Note that child_added events will be fired for initial pixel data as well
        var drawPixel = function(snapshot) {
            var coords = snapshot.name().split(":");
            mainContext.fillStyle = "#" + snapshot.val();
            mainContext.fillRect(parseInt(coords[0]) * mainPixSize, parseInt(coords[1]) * mainPixSize, mainPixSize, mainPixSize);
        };
        // Erase a pixel
        var clearPixel = function(snapshot) {
            var coords = snapshot.name().split(":");
            $timeout(function(){ alignCanvases(); }, 200); // Realign canvases
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