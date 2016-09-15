angular.module('sendTextToRaspberry', ['ngRoute','ui.bootstrap','pascalprecht.translate'])

.config(['$routeProvider', function($routeProvider) {
  console.log("in routeProvider");
  $routeProvider.
  when('/', {
    templateUrl: 'pages/sendTextToRaspberry.tpl.html',
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
