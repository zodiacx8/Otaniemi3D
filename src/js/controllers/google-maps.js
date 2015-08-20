'use strict';

/**
 * @ngdoc function
 * @name otaniemi3dApp.controller:GoogleMapsCtrl
 * @description
 * # GoogleMapsCtrl
 * Controller of the otaniemi3dApp
 */
angular.module('otaniemi3dApp')
  .controller('GoogleMapsCtrl', function ($scope, $timeout, buildingData, $state, $compile) {

    //If code in this controller becomes too big google maps code
    //should be moved into its own directive.
    var mapOptions = {
      zoom: 16,
      center: {lat: 60.1866142, lng: 24.830513},
      mapTypeId: google.maps.MapTypeId.TERRAIN,
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: google.maps.ControlPosition.LEFT_BOTTOM
      }
    };

    var map = new google.maps
      .Map($('#google-map')[0], mapOptions);

    //var infoContent = ;

    var buildingParam = $state.params.building;
    var infoWindow = new google.maps.InfoWindow();
    var infoContent = [
      '<div class="info-window">',
        '<h4>',
          '{{::App.building.name}}',
        '</h4>',
        '<ul>',
          '<li ng-repeat="nav in App.navigation">',
            '<a class="btn btn-default"',
                'ui-sref="{{nav.state}}({building: App.building.id,',
                  'floor: App.building.floorplans[0].floor})">',
              '{{nav.name}}',
            '</a>',
          '</li>',
        '</ul>',
      '</div>'
    ].join('');

    if (buildingParam && buildingParam.length) {
      var current;
      for (var i = 0; i < buildingData.buildings.length; i++) {
        if (buildingData.buildings[i].id === buildingParam) {
          current = buildingData.buildings[i];
          break;
        }
      }
      if (current) {
        buildingData.currentBuilding = current;
        infoWindow.setPosition(getCenter(current));
        infoWindow.setContent($compile(infoContent)($scope)[0]);
        infoWindow.open(map);
      } else {
        buildingData.currentBuilding = null;
        $state.go('not-found');
        return;
      }
    }

    var selected = '#FF0000';
    var unselected = '#808080';

    function getCenter (building) {
      var bounds = new google.maps.LatLngBounds();

      for (var i = 0; i < building.coords.length; i++) {
        var coord = building.coords[i];

        bounds.extend(new google.maps.LatLng(
          coord.lat, coord.lng
        ));
      }

      return bounds.getCenter();
    }

    function initializeMap (map, buildings) {
      angular.forEach(buildings, function (building) {
        var aaltoBuilding = new google.maps.Polygon({
          paths: building.coords,
          strokeColor: selected,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: unselected,
          fillOpacity: 0.35
        });

        aaltoBuilding.setMap(map);
        building.polygon = aaltoBuilding;

        if (buildingData.currentBuilding &&
            buildingData.currentBuilding.name === building.name) {
          aaltoBuilding.setOptions({fillColor: selected});
        }

        google.maps.event
          .addListener(aaltoBuilding, 'click', function (event) {
            $scope.$apply(function () {
              aaltoBuilding.setOptions({fillColor: selected});
              infoWindow.setPosition(event.latLng);
              infoWindow.setContent($compile(infoContent)($scope)[0]);
              infoWindow.open(map);

              buildingData.currentBuilding = building;
              angular.forEach(buildings, function (_building) {
                if (aaltoBuilding !== _building.polygon) {
                  _building.polygon.setOptions({fillColor: unselected});
                }
              });
            });
          });

        google.maps.event
          .addListener(aaltoBuilding, 'mouseover', function () {
            $scope.$apply(function () {
              aaltoBuilding.setOptions({strokeWeight: 4});
            });
          });

        google.maps.event
          .addListener(aaltoBuilding, 'mouseout', function () {
            $scope.$apply(function () {
              aaltoBuilding.setOptions({strokeWeight: 2});
            });
          });
      });

      google.maps.event
        .addListener(map, 'click', function () {
          $scope.$apply(function () {
            angular.forEach(buildings, function (building) {
              building.polygon.setOptions({fillColor: unselected});
            });

            infoWindow.close();

            buildingData.currentBuilding = null;
          });
        });

        google.maps.event
          .addListener(infoWindow, 'closeclick', function () {
            $scope.$apply(function () {
              angular.forEach(buildings, function (building) {
                building.polygon.setOptions({fillColor: unselected});
              });
              buildingData.currentBuilding = null;
            });
          });
    }

    initializeMap(map, buildingData.buildings);

    //Trigger resize event so that map will be fully visible.
    $timeout(function () {
      var center = map.getCenter();
      google.maps.event.trigger(map, 'resize');
      map.setCenter(center);
    });

    $scope.App.resetPosition = function () {
      map.setCenter({lat: 60.1866142, lng: 24.830513});
      map.setZoom(16);
    };

    //When current building changes update URL
    $scope.$watch('App.building', function (building, oldBuilding) {
      //if it's already transitioning then there's no reason to transition again
      if (!$state.transition && building !== oldBuilding) {
        if (building) {
          infoWindow.setPosition(getCenter(building));
          infoWindow.setContent($compile(infoContent)($scope)[0]);
          infoWindow.open(map);

          $state.go('google-maps', {building: building.id}, {notify: false});
        } else {
          $state.go('google-maps', {building: ''}, {notify: false});
        }
      }
    });

    $scope.$on('destroy', function () {
      $scope.$apply(function () {
        angular.forEach(buildingData.buildings, function (building) {
          google.maps.event.removeInstanceListeners(building.polygon);
        });
        google.maps.event.clearListeners(map, 'click');
        google.maps.event.clearListeners(infoWindow, 'closeclick');
        infoWindow.close();
      });
    });

  });
