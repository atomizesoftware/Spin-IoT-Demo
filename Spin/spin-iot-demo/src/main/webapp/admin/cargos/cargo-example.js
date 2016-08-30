function PluginController($scope, app){

    /** Saves the items that were selected before the plugin was opened. */
    var selectedItems = app.getSelectedItems();

    /** Tells the application the plugin has finished what it needed to do. */
    $scope.actionCompleted = function(){
        $scope.$close();
    };
}