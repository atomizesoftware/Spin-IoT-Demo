angular.module('sendTextToRaspberry')

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

    $scope.globalLabelsUpdate();
}])


.controller('MainController',
    ['$scope', '$translate', '$timeout', 'app', 'userId', 'deviceId',
    function ($scope, $translate, $timeout, app, userId, deviceId) {


    console.log("in MainController");

    var init = function() {

        console.log("init inits");
        $scope.updateLanguage();


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

        console.log("init almost");
        app.deviceInterface().hidePageLoader();
        console.log("init ends");
    };

    $scope.updateLanguage = function(){
        $scope.labels = {
            send: $translate('labels.send'),
            typeSomething: $translate('labels.typeSomething')
        };
    };

    $scope.$on('$translateChangeSuccess', function() {
        $scope.updateLanguage();
    });

    $scope.send = function(){
      var movement = {
        id:app.deviceInterface().getNextMovementId(),
        movementTypeCode: "sendTextToRaspberry",
        deviceCode: "raspberryPiLedDisplay",
        createUserId: userId,
        createDateTime: new Date(),
        notes: $scope.textToSend
      };

      var movements = [];
      movements.push(movement);

      if(app.deviceInterface().createMovements(JSON.stringify(movements))){
        $scope.back();
      } else {
        alert($scope.errorMessages.unexpectedError);
      }
    };

    /* Goes back to the movements list. */
    $scope.back = function() {
      app.backToList(false);
    };

    init();
}])

.controller('ErrorController', ['$scope', '$translate', 'app', 'message', function ($scope, $translate, app, errorMessage) {

    /* Checks if there is an error message to display or displays the generic error message. */
    var init = function() {
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

    /* Goes back to the movement list. */
    $scope.back = function() {
        app.backToList(false);
    };

    init();
}]);
