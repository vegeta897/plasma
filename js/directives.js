/* Directives and Filters */

angular.module('Plasma.directives', [])
    .directive('loginForm', function() {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                var userInput = element.find('#inputLoginUser');
                var passInput = element.find('#inputLoginPass');
                var loginButton = element.children('#loginSubmit'); // The log in button
                attrs.$observe('loginForm',function(){
                    var status = scope.authStatus;
                    if(status == '') { return; }
                    userInput.parent().removeClass('has-error');
                    passInput.parent().removeClass('has-error');
                    switch(status) {
                        case 'notLogged':
                            passInput.val('');
                            break;
                        case 'logged':
                            break;
                        case 'logging':
                            break;
                        case 'badEmail':
                            userInput.focus().parent().addClass('has-error');
                            break;
                        case 'badPass':
                            passInput.focus().parent().addClass('has-error');
                            break;
                    }
                    if(status == 'badEmail' || status == 'badPass') {
                        if(jQuery.trim(userInput.val()) == '') { // User input blank
                            userInput.parent().addClass('has-error');
                        }
                        if(jQuery.trim(passInput.val()) == '') { // Password input blank
                            passInput.parent().addClass('has-error');
                        }
                    }
                });
            }
        };
    })
;