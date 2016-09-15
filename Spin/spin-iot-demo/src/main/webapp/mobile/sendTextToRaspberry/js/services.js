angular.module('sendTextToRaspberry')

.factory('app', ['$http', '$location', '$q', '$window', '$translate', '$filter',
        function($http, $location, $q, $window, $translate, $filter) {

    /* Configuration passed on to the $http requests. */
    var config = {headers: {'Content-Type': 'application/json','Accept': 'application/json'}};
    var rootURL = '';
    var orderByDescription = "description['{0}']";
    var errorMessage = { title: '', text: '' };

    /* Updates the root url based on the presence of a device or not. */
    var updateRootURL = function() {
        if(service.hasDevice) {
            rootURL = service.deviceInterface().getApiURL();
        }
    };

    /* Updates the language based on the presence of a device or not. */
    var updateLanguage = function() {
        if(service.hasDevice) {
            $translate.uses(service.deviceInterface().getCurrentLocaleCode());
            $translate.refresh();
        }
        else {
            $translate.uses($location.search()["lang"]);
            $translate.refresh();
        }
    };

    var service = {
        currentDeviceId: null,
        currentUserId: null,
        hasDevice: false,
        getQueryString: function (field) {
            var href = window.location.href;
            var reg = new RegExp( '[?&]' + field + '=([^&#]*)', 'i' );
            var string = reg.exec(href);
            return string ? string[1] : null;
        },
        deviceInterface: function() {
            return $window.device;
        },
        checkForDevice: function() {
            service.hasDevice = angular.isDefined($window.device);
            service.updateHttpHeaders();
            updateLanguage();
            updateRootURL();

            return service.hasDevice;
        },
        updateHttpHeaders: function() {
            if(service.hasDevice){
                config.headers.Authorization = "apikey " + service.deviceInterface().getUserApiKey();
            }
        },
        getErrorMessage: function() {
            return errorMessage;
        },
        setErrorMessage: function(title, text){
            errorMessage.title = title;
            errorMessage.text = text;
            $location.path('/error');
            service.clearQueryString();
        },
        getIntFromQueryParams: function(param, resolver, error) {
            var integer = service.getQueryString(param);

            if(angular.isDefined(integer)){
                var parsedInt = parseInt(integer, 10);
                if(isNaN(parsedInt)){
                    service.setErrorMessage(resolver, error);
                }
                else {
                    return parsedInt;
                }
            }
            else {
                service.setErrorMessage(resolver, error);
            }
        },
        getUserIdNumber: function(resolver) {
            return service.getIntFromQueryParams('userid', resolver, 'resolverErrors.userParam');
        },
        getDeviceIdNumber: function(resolver) {
            return service.getIntFromQueryParams('deviceid', resolver, 'resolverErrors.deviceParam');
        },
        httpPOST: function(url, data) {
            return new $http.post(rootURL + url, data, config).success(function(data) {
                return data;
            }).error(function(data) {
                return data;
            });
        },
        httpPUT: function(url, data) {
            return new $http.put(rootURL + url, data, config).success(function(data) {
                return data;
            }).error(function(data) {
                return data;
            });
        },
        httpGET: function(url) {
            console.log(config);
            return new $http.get(rootURL + url, config).success(function(data) {
                return data;
            }).error(function(data) {
                return data;
            });
        },
        queueHttpRequest: function(method, url, entity, description) {
            if(service.hasDevice) {
                var deferred = $q.defer();
                service.deviceInterface().queueHTTPRequest(rootURL + url, method, angular.toJson(entity), description);
                deferred.resolve(true);

                return deferred.promise;
            }
            else {
                switch (method) {
                    case "POST": return service.httpPOST(url, angular.toJson(entity));
                    case "GET": return service.httpGET(url);
                    case "PUT": return service.httpPUT(url, angular.toJson(entity));
                    default: break;
                }
            }
        },
        clearQueryString: function(){
            $location.search('movementid', null);
            $location.search('userid', null);
            $location.search('deviceid', null);
        },
        backToList: function(clearMovementFromList) {
            if(service.hasDevice){
                service.deviceInterface().closeMobilePage(clearMovementFromList);
            }
        },
        orders: function(value){
            var request = "/orders?filter=archived:false&q=number:" +
                encodeURIComponent(value) + "*&limit=8&offset=0&sort=number:asc";
            return service.httpGET(request).then(function(response){
                return response.data.results;
            });
        },
        updateOrder: function(movement){
            if(movement.order && movement.order.id){
                movement.orderId = movement.order.id;
            } else {
                delete movement.orderId;
            }
        }
    };

    return service;
}])

.factory('resolver', ['$location', 'app', function($location, app) {

    var resolverTitle = 'resolverErrors.checkContainerTitle';


    /* Resolver public interface */
    var service = {
        /* Tries to get the user based on the id on the query params, saves it to the app service and returns it. */
        user: function() {
            var userId = app.getUserIdNumber('resolverErrors.userTitle');

            if(userId) {
                app.currentUserId = userId;
                return userId;
            }
            else {
                app.setErrorMessage('resolverErrors.userTitle', 'resolverErrors.userParam');
                return;
            }
        },
        /* Tries to get the device based on the id on the query params, saves it to the app service and returns it. */
        device: function() {
            var deviceId = app.getDeviceIdNumber('resolverErrors.deviceTitle');

            if(deviceId) {
                app.currentDeviceId = deviceId;
                return deviceId;
            }
            else {
                app.setErrorMessage('resolverErrors.deviceTitle', 'resolverErrors.deviceParam');
                return;
            }
        },
        errorMessage: function() {
            return app.getErrorMessage();
        }
    };

    return service;
}]);
