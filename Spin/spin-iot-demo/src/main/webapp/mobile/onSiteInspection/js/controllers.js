angular.module('onSiteInspection')

/* Filter used to get description for the given language or the first in case the given does not exist. */
.filter('localizedDescription', function(){
    return function(description, lang) {
        if (description) {
            var languages = Object.keys(description);

            if (description[lang]) {
                return description[lang];
            }
            else if (languages.length > 0) {
                return description[languages[0]];
            }
        }
        return "";
    };
})

.controller('DefaultController', ['$scope', '$translate', '$timeout', 'app',
    function ($scope, $translate, $timeout, app) {

    $scope.lang = "en-GB";

    $scope.globalLabelsUpdate = function() {
        $scope.globalLabels = {
            Confirm: $translate('globalLabels.confirm'),
            Next: $translate('globalLabels.next'),
            Back: $translate('globalLabels.back'),
            Scan: $translate('globalLabels.scan'),
            OK: $translate('globalLabels.ok')
        };
    };

    $scope.$on('$translateChangeSuccess', function() {
        $scope.lang = $translate.uses();
        $scope.globalLabelsUpdate();
    });

    $scope.takePhoto = function(photos){
        app.deviceInterface().takePicture();
    };

    $scope.globalLabelsUpdate();
}])

.controller('MainController',
    ['$scope', '$translate', '$timeout', 'app', 'userId', 'deviceId',
    function ($scope, $translate, $timeout, app, userId, deviceId) {

    var spinEventId = app.getQueryString("eventid");

    var initController = function() {
        $scope.photos = [];
        $scope.updateLanguage();

        if(spinEventId){
            app.httpGET("/events/" + spinEventId + "?include=eventstatus,order").then(function(response){
                $scope.spinEvent = response.data;
                app.deviceInterface().hidePageLoader();
                app.deviceInterface().changePageTitle($scope.spinEvent.order.number + " : " + $scope.labels.Title);
                app.httpPUT("/events/" + spinEventId, angular.toJson($scope.spinEvent)).then(function(response){
                    console.log("event locked");
                }, function(error){
                    console.log(error);
                });
            });
        } else {
            $scope.spinEvent = {
                spinEventTypeCode:"onSiteInspection"
            };
            app.deviceInterface().changePageTitle($scope.labels.Title);
            app.deviceInterface().hidePageLoader();
        }

        /** Regular keyboard handling **/
        angular.element(window).on('keyboardopen', function(e) {
            var data = JSON.parse(e.detail);
            var activeInput = document.activeElement;

            if(activeInput) {
                if($scope.previousInputId !== activeInput.id) {
                    $scope.previousScrollTop = 0;
                    $scope.previousInputId = activeInput.id;
                }

                if(document.body.scrollTop !== 0) {
                    $scope.previousScrollTop = document.body.scrollTop;
                    document.body.scrollTop = 0;
                }

                angular.element(document.body).css("margin-top", "0");
                var bounds = activeInput.getBoundingClientRect();
                var bottom = bounds.top + bounds.height;
                var actualAvailableHeight = (window.innerHeight * data.availableHeight) / data.pageHeight;

                if(bottom > actualAvailableHeight) {
                    var marginTop = bottom - actualAvailableHeight;

                    if(marginTop < bounds.top) {
                        marginTop = marginTop + 5;
                    }
                    else {
                        marginTop = bounds.top - 5;
                    }
                    angular.element(document.body).css("margin-top", "-" + marginTop+ "px");
                }
            }
        });

        angular.element(window).on('keyboardclose', function(e) {
            angular.element(document.body).css("margin-top", "0");
            document.body.scrollTop = $scope.previousScrollTop;
        });

        /** Custom handlers **/
        angular.element(window).on('backbuttonpressed', function(e) {
            $scope.back();
            $scope.$apply();
        });

        angular.element(window).on('picturetaken', function(e) {
            var picture = JSON.parse(e.detail);
            $scope.photos.push(picture);
            $scope.$apply();
        });
    };

    $scope.updateLanguage = function(){
        $scope.labels = {
            Title: $translate('labels.title'),
            Notes: $translate('labels.notes'),
            Photos: $translate('labels.photos'),
            Done: $translate('labels.done'),
            Cancel: $translate('labels.cancel')
        };

        $scope.errorMessages = {
            UnableToSave: $translate('messages.unableToSave')
        };
    };

    $scope.$on('$translateChangeSuccess', function() {
      console.log("translateChangeSuccess in MainController");
        $scope.updateLanguage();
    });

    var saveEvent = function(spinEvent){
        spinEvent.deviceId = deviceId;
        app.updateOrder(spinEvent);
        spinEvent.destinationLocationId = spinEvent.order.originLocationId;
        spinEvent.createLocationId = spinEvent.order.originLocationId;

        var add = false;
        var nextEventId = app.deviceInterface().getNextEventId();

        if(!spinEvent.id){
            add = true;
            spinEvent.id = nextEventId;
        }

        var documents = [];
        var photoDocumentType = JSON.parse(app.deviceInterface().getDocumentTypeWithCode("PHOTO"));
        if($scope.photos && photoDocumentType){
            for(var i = 0; i < $scope.photos.length; i++){
                var doc = {};
                doc.userId = userId;
                doc.documentTypeId = photoDocumentType.id;
                doc.fileName = $scope.photos[i].fileName;
                doc.date = new Date();
                doc.localPath = $scope.photos[i].original;
                doc.spinEventId = spinEvent.id;
                documents.push(doc);
            }
        }

        var spinEvents = [];

        if(add){
            spinEvent.createUserId = userId;
            spinEvent.createDateTime = new Date();
            spinEvents.push(spinEvent);
            if(app.deviceInterface().createEvents(JSON.stringify(spinEvents), JSON.stringify(documents))){
                $scope.back();
            } else {
                alert($scope.errorMessages.UnableToSave);
            }
        } else {
            console.log("SPIN EVENT");
            console.log(angular.toJson(spinEvent));
            app.queueHttpRequest("PUT", "/events/" + spinEvent.id, spinEvent).then(function(){
                if (app.deviceInterface().createEvents(JSON.stringify(spinEvents), JSON.stringify(documents))){
                    $scope.back();
                } else {
                    alert($scope.errorMessages.UnableToSave);
                }
            });
        }
    };

    /* Goes back to the spinEvents list. */
    $scope.back = function() {
      app.backToList(false);
    };

    $scope.done = function(spinEvent){
      console.log("DONE");
        delete spinEvent.eventStatusId;
        spinEvent.eventStatusCode = "Done";
        saveEvent(spinEvent);
    };

    $scope.cancel = function(spinEvent){
        delete spinEvent.eventStatusId;
        spinEvent.eventStatusCode = "Cancelled";
        saveEvent(spinEvent);
    };

    initController();
}])

.controller('ErrorController', ['$scope', '$translate', 'app', 'message',
  function ($scope, $translate, app, errorMessage) {

    /* Checks if there is an error message to display or displays the generic error message. */
    $scope.initController = function() {
        $scope.errorLanguageUpdate();

        if(errorMessage.title && errorMessage.text) {
            if(angular.isObject(errorMessage.text)) {
                $scope.message = {
                    title: errorMessage.title,
                    text: errorMessage.text[$translate.uses()]
                };
            }
            else {
                $scope.message = errorMessage;
            }
        }
        else {
            $scope.message = {
                title: ((errorMessage.title) ? errorMessage.title : $scope.errorLabels.Title),
                text: ((errorMessage.text) ? errorMessage.text: $scope.errorLabels.Message)
            };
        }

        if(app.hasDevice) {
            app.deviceInterface().hidePageLoader();
        }
    };

    $scope.$on('$translateChangeSuccess', function() {
        $scope.initController();
    });

    $scope.errorLanguageUpdate = function() {
        $scope.errorLabels = {
            Title: 'errorLabels.title',
            Message: 'globalErrorMessages.unexpectedError'
        };
    };

    /* Goes back to the spinEvent list. */
    $scope.back = function() {
        app.backToList(false);
    };

    $scope.initController();
}]);
