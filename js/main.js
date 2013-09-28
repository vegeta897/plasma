angular.module('Plasma', ['Plasma.controllers', 'Plasma.services', 'Plasma.directives', 'LocalStorageModule'])
	.config(['$routeProvider', function($routeProvider) { // Set up URL page routing
		$routeProvider.
			when('/', {templateUrl: 'partials/main.html', controller: 'Main'}). // Main page
		    otherwise({redirectTo: ''}); // Redirect to main page if none of the above match
	}]);