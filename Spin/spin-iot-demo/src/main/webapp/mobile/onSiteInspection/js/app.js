angular.module('onSiteInspection', ['ngRoute','ui.bootstrap','pascalprecht.translate'])

.config(['$routeProvider', function($routeProvider) {
    $routeProvider.
        when('/', {
            templateUrl: 'pages/onSiteInspection.tpl.html',
            controller: 'MainController',
            resolve: {
                userId: function(resolver) { return resolver.user(); },
                deviceId: function(resolver) { return resolver.device(); }
            }
        }).
        when('/error', {
          templateUrl: 'pages/error.tpl.html',
          controller: 'ErrorController',
          resolve: {
                message: function(resolver) { return resolver.errorMessage(); }
          }
        });
}])

.config(['$translateProvider', function($translateProvider) {
    console.log("entering translateProvider");
    $translateProvider.useStaticFilesLoader({
        prefix: 'languages/',
        suffix: '.json'
    });

    $translateProvider.fallbackLanguage('en-GB');
    $translateProvider.preferredLanguage('en-GB');
}])

.run(['app', function(app){
    app.checkForDevice();
}]);
