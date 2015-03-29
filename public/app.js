'use strict';

angular.module('findme',[
        'ngRoute',
        'ngCookies',
        'findme.map'
    ]).

    config(['$routeProvider', configRoutes]).

    factory('geoLocate', [geoLocateService]).
    factory('ws', [wsService])
;

function configRoutes ($routeProvider) {
    $routeProvider.
        when('/', {
            templateUrl: 'components/map/map.html',
            controller: 'mapController'
        })
    ;
}

function geoLocateService() {
    var onSuccessFns = [];

    window.navigator.geolocation.watchPosition(geo_success, geo_error, {enableHighAccuracy: true});

    function geo_success(position) {
        onSuccessFns.
            forEach(function(fn) {
                fn(position);
            })
        ;
    }

    function geo_error() {
    	console.log('geolocation error');
    }

    return {
        onSuccess: function(fn) {
            onSuccessFns.push(fn);
        }
    };
}

function wsService() {
    var ws = new WebSocket('ws://' + window.location.host + '/ws'),
        handlers = {};

    ws.onopen = function() {
        console.log('webSocket opened');
    };

    ws.onmessage = function(event) {
        try {
            var message = JSON.parse(event.data);
        } catch(e) {
            console.error(e.message);
            console.error('raw message: ');
            console.error(event);
            return;
        }
        console.log('webSocket message: ', message);

        if (!message.action || !message.data) return console.error('ws: no action or data property from incoming message');

        if (handlers[message.action]) {
            handlers[message.action].forEach(function(fn) {
                fn(message.data);
            });
        } else {
            console.error('ws: no handlers for action: ' + message.action);
        }

    };

    ws.onerror = ws.onclose = function() {
        console.error('websocket something bad happened with the connection');
    };

    return {

        on: function(name, fn) {
            if (!name || !fn) return console.error("ws.on('name', function(data) {}): something's missing...");

            if (!handlers[name]) {
                handlers[name] = [];
            }

            handlers[name].push(fn);
        },

        send: function(action, data) {
            if (ws.readyState === 1) {
                try {
                    ws.send(JSON.stringify({ action: action, data: data}));
                } catch(e) {
                    console.log('caught exception', e);
                };

            } else {
                console.error('ws sockets screwy');
            }
        },

        _ws: ws

    };

}