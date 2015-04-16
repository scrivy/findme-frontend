'use strict';

angular.module('findme.map', []).
    controller('mapController', ['$scope', '$cookies', 'ws', 'geoLocate', mapController]).
    directive('map', mapDirective);

function mapController($scope, $cookies, ws, geoLocate) {
    var everyone = {};

    ws.on('allLocations', function(data) {
        if (!geoLocate.position && data.yourLocation) {
            updateMyLocation(data.yourLocation);
            $scope.map.setView(data.yourLocation.latlng);
        }

        data.locations.forEach(updateTheirLocation);

        $cookies.put('id', data.id, {expires: new Date().addHours(1)});
    });

    ws.on('updateLocation', updateTheirLocation);

    ws.on('updateLocationId', function(data) {
        everyone[data.newId] = everyone[data.oldId];
        delete everyone[data.oldId];
    });

    geoLocate.onSuccess(function(position) {
        ws.send('updateLocation', position);
        updateMyLocation(position);

        // error getting thrown when line doesn't exist
        Object.keys(everyone).
          forEach(function(id) {
            everyone[id].line.
              setLatLngs([
                position.latlng,
                everyone[id].marker.getLatLng()
              ])
          })
        ;
    });

    geoLocate.onFirstSuccess(function(position) {
        ws.send('updateLocation', position);
        updateMyLocation(position);
    });

    function updateMyLocation(position) {
        if ($scope.my) {
            $scope.my.marker.setLatLng(position.latlng);
            $scope.my.circle.
                setLatLng(position.latlng).
                setRadius(position.accuracy)
            ;
        } else {
            $scope.my = {
                marker: L.marker(position.latlng, {
                    icon: L.icon({
                        iconUrl: 'images/mymarker.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 40]
                    }),
                    alt: "Me!"
                }).addTo($scope.map),
                circle: L.circle(position.latlng, position.accuracy, {
                    fillOpacity: 0.5
                }).addTo($scope.map)
            };
        }
    }

    function updateTheirLocation(position) {
        var thisGuy;
        if (everyone[position.id]) {
            thisGuy = everyone[position.id];

            thisGuy.marker.
                setLatLng(position.latlng).
                setOpacity(1);

            thisGuy.circle.
                setLatLng(position.latlng).
                setRadius(position.accuracy).
                setStyle({opacity: 0.5});

            thisGuy.trail.
                addLatLng(position.latlng);

            if ($scope.my) {
                if (thisGuy.line) {
                    thisGuy.line.setLatLngs([
                        $scope.my.marker.getLatLng(),
                        position.latlng
                    ]);
                } else {
                    thisGuy.line = L.polyline([$scope.my.marker.getLatLng(), position.latlng]).addTo($scope.map);
                }
            }
        } else {
            thisGuy = everyone[position.id] = {
                marker: L.marker(position.latlng).addTo($scope.map),
                circle: L.circle(position.latlng, position.accuracy).addTo($scope.map),
                trail: L.polyline([position.latlng]).addTo($scope.map),
                line: null,
            };

            if ($scope.my) {
                thisGuy.line = L.polyline([$scope.my.marker.getLatLng(), position.latlng]).addTo($scope.map);
            }

        }
    }

    function redrawLines(id) {
        
    }

    // fade markers
    setInterval(function(everyone) {
        Object.keys(everyone)
            .forEach(function(id) {
                var person = everyone[id],
                    opacity = person.circle.options.opacity;

                if (opacity > 0) {
                    person.circle.setStyle({ opacity: opacity - 0.05});
                    person.marker.setOpacity(person.marker.options.opacity - 0.1)
                } else {
                    $scope.map.removeLayer(person.circle);
                    $scope.map.removeLayer(person.marker);
                    $scope.map.removeLayer(person.line);
                    delete everyone[id];
                }
            })
        ;
    }, 30000, everyone);

    // old jquery code, will convert later
    // modal
    var $modalDiv = $('.ui.modal');
    $('#settings').click(function() {
        $modalDiv.modal('show');
    });

    var fixed = false;
    $('.ui.button').click(function() {
        $(this).toggleClass('active');
        fixed = !fixed;
        ws.send('changeFixedLocationState', fixed);
    });

}

function mapDirective() {
    return {
        restrict: 'E',
        link: function(scope, element) {
            scope.map = L.map(element[0]).setView([37.76, -122.44], 11);

            scope.map.locate({setView: true, maxZoom: 16});

            L.tileLayer('/tiles/{z}/{x}/{y}.png').addTo(scope.map);
        }
    };
}
