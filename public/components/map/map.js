'use strict';

angular.module('findme.map', []).

    controller('mapController', ['$scope', '$cookies', 'ws', 'geoLocate', mapController]).

    directive('map', mapDirective)

;

function mapController($scope, $cookies, ws, geoLocate) {
    var everyone = {};

    ws.on('allLocations', function(data) {

        var locations = data.locations;

        Object.keys(locations).
            forEach(function(id) {
                everyone[id] = {
                    marker: L.marker(locations[id].latlng).addTo($scope.map),
                    circle: L.circle(locations[id].latlng, locations[id].accuracy).addTo($scope.map),
                    line: L.polyline([$scope.my.marker.getLatLng(), locations[id].latlng]).addTo($scope.map),
                    trail: L.polyline([locations[id].latlng]).addTo($scope.map)
                };
            })
        ;

        $cookies.put('id', data.id);

        if (!geoLocate.position && data.yourLocation) {
            $scope.my.marker.setLatLng(data.yourLocation.latlng);
            $scope.my.circle.
                setLatLng(data.yourLocation.latlng).
                setRadius(data.yourLocation.accuracy)
            ;
        }
    });

    ws.on('updateLocation', function(location) {

        if (everyone[location.id]) {
            var thisGuy = everyone[location.id];

            thisGuy.marker.
                setLatLng(location.latlng).
                setOpacity(1);

            thisGuy.circle.
                setLatLng(location.latlng).
                setRadius(location.accuracy).
                setStyle({opacity: 0.5});

            thisGuy.line.
                setLatLngs([
                    $scope.my.marker.getLatLng(),
                    location.latlng
                ]);

            thisGuy.trail.
                addLatLng(location.latlng);

        } else {
            everyone[location.id] = {
                marker: L.marker(location.latlng).addTo($scope.map),
                circle: L.circle(location.latlng, location.accuracy).addTo($scope.map),
                line: L.polyline([$scope.my.marker.getLatLng(), location.latlng]).addTo($scope.map),
                trail: L.polyline([location.latlng]).addTo($scope.map)
            };
        }

    });

    ws.on('updateLocationId', function(data) {
        everyone[data.newId] = everyone[data.oldId];

        delete everyone[data.oldId];
    });

    geoLocate.onSuccess(function(position) {

        var data = {
            latlng: [position.coords.latitude, position.coords.longitude],
            accuracy: Math.ceil(position.coords.accuracy)
        };

        ws.send('updateLocation', data);

        $scope.my.marker.setLatLng(data.latlng);
        $scope.my.circle.
            setLatLng(data.latlng).
            setRadius(position.coords.accuracy)
        ;

        Object.keys(everyone).
          forEach(function(id) {
            everyone[id].line.
              setLatLngs([
                data.latlng,
                everyone[id].marker.getLatLng()
              ])
          })
        ;

    });

    // fade markers
    setInterval(function(everyone) {
        Object.keys(everyone)
            .forEach(function(id) {
                var person = everyone[id]
                , opacity = person.circle.options.opacity;

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
    }, 15000, everyone);

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

            scope.my = {
                marker: L.marker([0, 0], {
                    icon: L.icon({
                        iconUrl: 'images/mymarker.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 40]
                    }),
                    alt: "Me!"
                }).addTo(scope.map),
                circle: L.circle([0, 0], 50, {
                    fillOpacity: 0.5
                }).addTo(scope.map)
            };
        }
    };
}