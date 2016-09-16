function IoTDashboardController($scope, $filter, $timeout, app, security) {

  var init = function() {
    $scope.textToSend = "";
    $scope.currentTemperature = "...";
    $scope.lastReadingTimestamp = "...";

    setLabels();
    connectMQTTClient();
    $scope.updateDashboard();
  };

  var setLabels = function(){
    $scope.labels = {
      temperatureWidgetLabel: {"en-GB":"Current Temperature", "pt-PT":"Temperatura Atual", "fr-FR":"Température Actuelle"},
      sendText: {"en-GB":"Send the text", "pt-PT":"Enviar o texto", "fr-FR":"Envoyer le texte"},
      triggerAlarm: {"en-GB":"Trigger temperature alarm", "pt-PT":"Activar alarme de temperatura", "fr-FR":"Activer l'alarme de température"},
      sendTextToRaspberry:{"en-GB":"Send text to Raspberry", "pt-PT":"Enviar texto para o Raspberry", "fr-FR":"Envoyer texte à Raspberry"},
      temperatureAlarmSuccess:{
        "en-GB":"Success! A Quality Assessment Order was created and a On-site Inspection request sent to the Android app",
        "pt-PT":"Sucesso! Uma Ordem de Controlo de Qualidade foi criada e um pedido de Inspeção no Local foi enviado para a app Android",
        "fr-FR":"Succès! Un Ordre de Contrôle de Qualité a été créé et une demande d'inspection sur le site a été envoyé à l'application Android"
      },
      temperatureAlarmFailure:{
        "en-GB":"An error occurred and prevented the alarm to be processed.",
        "pt-PT":"Ocorreu um erro que impediu o alarme de ser processado",
        "fr-FR":"Une erreur est survenue qui a empêché l'alarme en cours de traitement"
      },
      closeMessage:{
        "en-GB":"Close this message",
        "pt-PT":"Fechar esta mensagem",
        "fr-FR":"Fermer ce message"
      },
      sendTextSuccess:{
        "en-GB":"Success, the text will appear in the LEDs! Be patient, the video has a delay of around 20 seconds.",
        "pt-PT":"Sucesso, o texto vai aparecer nos LEDS! O vídeo tem um delay de cerca de 20 segundos, pedimos alguma paciência",
        "fr-FR":"Succès, le texte apparaîtra dans LEDS! La vidéo a un délai d'environ 20 secondes, nous demandons un peu de patience"
      },
      sendTextFailure:{
        "en-GB":"An error occurred and prevented the text to be sent",
        "pt-PT":"Ocorreu um erro que impediu o texto de ser enviado",
        "fr-FR":"Une erreur est survenue qui a empêché le texte à envoyer"
      }
    };
  };


  /* Fires when user changes the current language */
  $scope.$on('i18nextLanguageChange', function () {
    setLabels();
  });

  $scope.updateDashboard = function(){
    app.httpGET(app.routes.devices + "?filter=code:raspberryPiTemperatureSensor").then(function(response){
      if(response.data.results && response.data.results.length > 0){
        var sensor = response.data.results[0];
        $scope.currentTemperature = sensor.userDefinedFields.currentTemperature.value;
        $scope.lastReadingTimestamp=sensor.userDefinedFields.lastReadingTimestamp.value;
      }
    }, function(errorResponse){
      console.log(errorResponse);
    });
  };


  $scope.triggerAlarm = function(){
    var movement = {
      movementTypeCode: "temperatureAlarm",
      userDefinedFields: {temperature:{value:$scope.currentTemperature}}
    };
    app.httpPOST(app.routes.movements, angular.toJson(movement)).then(function(response){
      console.log(response);
      $scope.showAlarmMessage = true;
      $scope.alarmMessage = $scope.labels.temperatureAlarmSuccess;
    }, function(errorResponse){
      console.log(errorResponse);
      $scope.showAlarmMessage = true;
      $scope.alarmMessage = $scope.labels.temperatureAlarmFailure;
    });
  };


  $scope.closeAlarmMessage = function(){
    $scope.showAlarmMessage = false;
    $scope.alarmMessage = "";
  };


  $scope.sendTextToRaspberry = function(){
    var movement = {movementTypeCode: "sendTextToRaspberry", deviceCode: "raspberryPiLedDisplay", notes: $scope.textToSend};
    app.httpPOST(app.routes.movements, angular.toJson(movement)).then(function(response){
      console.log(response);
      $scope.showSendTextResultMessage = true;
      $scope.sendTextResultMessage = $scope.labels.sendTextSuccess;
      $scope.textToSend = "";
    }, function(errorResponse){
      console.log(errorResponse);
      $scope.showSendTextResultMessage = true;
      $scope.sendTextResultMessage = $scope.labels.sendTextFailure;
    });
  };


  $scope.closeSendTextResultMessage = function(){
    $scope.showSendTextResultMessage = false;
    $scope.sendTextResultMessage = "";
  };


  /*
  Creates an mqtt client connected to the Spin backend,
  to update the dashboard when needed.
  */
  var mqttClient;
  var noUser = false;

  $scope.$on('userLoggedOut', function(){
    console.log("disconnecting");
    noUser = true;
    mqttClient.disconnect();
  });

  $scope.$on('userChanged', function(newUser){
    console.log("userChanged");
    if(newUser && noUser){
      noUser = false;
      connectMQTTClient();
    }
  });


  var onMessageArrived = function(message) {
    var payload = message.payloadString;
    var payloadArray = payload.split("\n");
    if(payloadArray[0].indexOf("POST /api/sync-movements") !== -1){
      $scope.updateDashboard();
    }
  };


  var onConnectionLost = function(errorResponse){
    if(!noUser){
      console.log("Connection lost to Spin MQTT broker with error " + errorResponse);
      console.log("Will try to reconnect in 10 seconds...");
      $timeout(function(){
        console.log("Retrying...");
        connectMQTTClient();
      }, 10000);
    }
  };

  var connectMQTTClient = function(){
    app.httpGET(app.routes.parameters + app.routes.parameterReq.mqttValues).then(function(response){
      if(response.data){
        var connectionOptions = {};
        for(var i = 0; i < response.data.results.length; i++){
          var parameter = response.data.results[i];
          switch(parameter.code){
            case "MQTT_USER":
            connectionOptions.userName = parameter.value;
            break;
            case "MQTT_PASSWORD":
            connectionOptions.password = parameter.value;
            break;
            case "MQTT_WEBSOCKET_SERVER_PORT":
            connectionOptions.serverPort = parameter.value;
            break;
            case "MQTT_SERVER_ADDRESS":
            connectionOptions.server = parameter.value;
            break;
            case "MQTT_USE_SSL":
            connectionOptions.useSSL = parameter.value === "true";
            break;
            default: break;
          }
        }

        mqttClient = new Paho.MQTT.Client(connectionOptions.server, Number(connectionOptions.serverPort), "back-office-" + Math.floor((Math.random() * 100000) + 1));
        mqttClient.onConnectionLost = onConnectionLost;
        mqttClient.onMessageArrived = onMessageArrived;

        mqttClient.connect({
          timeout: 20,
          onSuccess: function(){
            mqttClient.subscribe("/from-backend");
            console.log("MQTT client connected");
          },
          userName: connectionOptions.userName,
          password: connectionOptions.password,
          onFailure: function(message){ console.log("Failure: " + message.errorMessage); },
          useSSL: connectionOptions.useSSL
        });
      }
    }, function(errorResponse){
      onConnectionLost(errorResponse);
    });
  };


  /* Initialize the dashboard*/
  init();
}
