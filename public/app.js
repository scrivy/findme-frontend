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
    var lastConnectingAttempt,
        handlers = {},
        onOpenFns = [],
        that = this;

    tryConnecting.call(this);
    setInterval(checkConnection.bind(this), 5000);

    function checkConnection() {
        if (this.ws.readyState > 1) {
            console.log('webSocket closed: attempting another connection');
            tryConnecting.call(this);
        }
    }

    function tryConnecting() {
        lastConnectingAttempt = Date.now();
        this.ws = new WebSocket('ws://' + window.location.host + '/ws');

        this.ws.onopen = function() {
            console.log('webSocket opened');
            while (onOpenFns.length) {
                var fn = opOpenFns.pop();
                fn();
                console.log('webSocket: onOpen, dequeued fn');
            }
            onOpenFns.forEach(function(fn) {
                obj.fn();
            })
        };

        this.ws.onmessage = function(event) {
            try {
                var message = JSON.parse(event.data);
            } catch(e) {
                console.error(e.message);
                console.error('raw message: ');
                console.error(event);
                return;
            }
            console.log('webSocket message: ', message);

            if (!message.action || !message.data) return console.error('webSocket error: no action or data property from incoming message');

            if (handlers[message.action]) {
                handlers[message.action].forEach(function(fn) {
                    fn(message.data);
                });
            } else {
                console.error('webSocket error: no handlers for action: ' + message.action);
            }

        };

        this.ws.onerror = function() {
            console.error('webSocket error: onerror cb');
        };

        this.ws.onclose = function() {
            console.error('webSocket error: onclose cb');
        };
    }

    return {

        on: function(name, fn) {
            if (!name || !fn) return console.error("webSocket error: ws.on('name', function(data) {}): something's missing...");

            if (!handlers[name]) {
                handlers[name] = [];
            }

            handlers[name].push(fn);
        },

        send: function(action, data) {
            var message;
            try {
                message = JSON.stringify({ action: action, data: data});
            } catch(e) {
                console.log('webSocket error: json stringify error on send :',e);
                return;
            };

            switch (that.ws.readyState) {
                case 0: // connecting
                    console.log('webSocket: connecting');
                    onOpenFns.push(ws.send.bind(undefined, message));
                    break;
                case 1: // open
                    that.ws.send(message);
                    break;
                case 2: // closing
                case 3: // closed
                    console.error('webSocket: closing or closed');
                    onOpenFns.push(that.ws.send.bind(undefined, message));
                    break;
            };

        }

    };

}