'use strict';

/**
 * @ngdoc function
 * @name otaniemi3dApp.controller:HeatMapCtrl
 * @description
 * # HeatMapCtrl
 * Controller of the otaniemi3dApp
 */
angular.module('otaniemi3dApp')
  .controller('HeatMapCtrl', function ($scope, floorplanStorage, dataStorage,
    heatmapService, $modal, $interval, $state) {

    var self = this;

    $scope.floor = Number($state.params.floorNum);

    if (!$scope.floor) {
      $state.go('heat-map', {floorNum: 1}, {notify: false});
      $scope.floor = 1;
    }

    $scope.sensorData = dataStorage.sensors;
    $scope.searchString = '';
    $scope.highlightedRoom = null;
    $scope.floorplans = floorplanStorage.list;
    $scope.selectedRoom = null;
    $scope.resetView = null;
    $scope.svgSupport = Modernizr.svg;
    self.isFloorplanLoaded = false;

    //Select current floorplan
    for (var i = 0; i < $scope.floorplans.length; i++) {
      if (i === $scope.floor - 1) {
        $scope.floorplans[i].isSelected = true;
      } else {
        $scope.floorplans[i].isSelected = false;
      }
    }

    $scope.floorplan = $scope.floorplans[$scope.floor-1];

    $scope.sensorTypes = [
      { text: 'Temperature',
        name: 'temperature',
        icon: 'images/temperature.svg' },

      { text: 'CO2',
        name: 'co2',
        icon: 'images/co2.svg' },

      { text: 'Humidity',
        name: 'humidity',
        icon: 'images/humidity.svg' },

      { text: 'Light',
        name: 'light',
        icon: 'images/light.svg' },

      { text: 'Occupancy',
        name: 'pir',
        icon: 'images/pir.svg' }
    ];

    var day, week, month, year;
    day = week = month = year = new Date();

    day.setDate(day.getDate() - 1);
    week.setDate(week.getDate() - 7);
    month.setMonth(month.getMonth() - 1);
    year.setYear(year.getYear() - 1);

    $scope.timeFrames = [
      { text: 'Current',
        icon: 'images/latest.svg',
        params: {}, },

      { text: 'Last Week',
        icon: 'images/week.svg',
        params: { begin: week.toISOString() } },

      { text: 'Last Month',
        icon: 'images/month.svg',
        params: { begin: month.toISOString() } },

      { text: 'Last Year',
        icon: 'images/year.svg',
        params: { begin: year.toISOString() } },

      { text: 'Select range',
        //icon: 'images/time-range.svg',
        params: { begin: null, end: null } }
    ];

    $scope.sensorType = $scope.sensorTypes[0];
    $scope.timeFrame = $scope.timeFrames[0];

    $scope.$on('sensordata-update', function (_, data) {
      $scope.sensorData = data.dict;
    });

    $scope.selectSensorType = function (sensor) {
      $scope.sensorType = sensor;
    };

    $scope.selectTimeFrame = function (timeFrame) {
      $scope.timeFrame = timeFrame;
    };

    $scope.showGradient = function () {
      return $scope.sensorType.name.toLowerCase() !== 'pir' &&
             $scope.sensorType.name.toLowerCase() !== 'occupancy';
    };

    /*
     * Toggle fullscreen button. It broadcasts to parent scope to change the view
     * to fullscreen which in turn hides the footer and header. Also it changes
     * the fullscreen button glyphicon.
     */
    $scope.toggleFullscreen = function (){
      $scope.App.fullscreen = !$scope.App.fullscreen;
    };

    $scope.nextFloor = function () {
      $state.go('heat-map', {floorNum: $scope.floor + 1});
    };

    $scope.prevFloor = function () {
      $state.go('heat-map', {floorNum: $scope.floor - 1});
    };


    $scope.highlightRoom = function(item) {
      if ($scope.highlightedRoom) {
        $interval.cancel($scope.highlightedRoom.pulse);
      }
      if (typeof item.floor === 'number' && !isNaN(item.floor)) {
        $scope.highlightedRoom = item;
        $scope.floor = item.floor;
        $state.go('heat-map', {floorNum: $scope.floor});
      }
    };

    $scope.onSelect = function(item) {
      $scope.highlightRoom(item);
    };

    $scope.onSearch = function(searchString) {
      //If the room is once selected from the dropdown(typeahead), the
      //searchString will actually be the room object.
      if (searchString.name) {
        $scope.highlightRoom(searchString);
      } else {
        var selected;
        var keys = Object.keys(Rooms.dict);
        for (var i = 0; i < keys.length; i++) {
          var room = Rooms.dict[keys[i]];

          if (room.name.toLowerCase() === searchString.toLowerCase()) {
            selected = room;
            break;
          }
        }
        if (selected) {
          $scope.highlightRoom(selected);
        }
      }
    };

    $scope.resetZoom = function() {
      if ($scope.resetView === null) {
        $scope.resetView = false;
      }
      $scope.resetView = !$scope.resetView;
    };


     /*Create a new modal pass timeFrame and sensorType variables into it
        Also parse the return values to aforementioned variables*/
    $scope.open = function () {

      self.modalInstance = $modal.open({
        templateUrl: 'sensor-options.html',
        controller: 'ModalCtrl',
        controllerAs: 'modal',
        resolve: {
          params: function () {
            return {
              sensorTypes: $scope.sensorTypes,
              sensorType: $scope.sensorType,
              timeFrames: $scope.timeFrames,
              timeFrame: $scope.timeFrame
            };
          }
        }
      });

      self.modalInstance.result.then(function (params) {
        $scope.timeFrame = params.timeFrame;
        $scope.sensorType = params.sensorType;
        $scope.refreshRoomColor($scope.sensorType);
      });
    };

    $scope.$on('floorplan-loaded', function () {
      self.isFloorplanLoaded = true;
    });

    $scope.$on('$destroy', function () {
      if (self.modalInstance) {
        self.modalInstance.dismiss();
      }
    });

});
