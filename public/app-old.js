var map = L.map('map').setView([38.55, -121.74], 13);

L.tileLayer('/tiles/{z}/{x}/{y}.png').addTo(map);

map.locate({setView: true, maxZoom: 18});

var mymarker = L.marker([0, 0], {
  icon: L.icon({
    iconUrl: 'images/mymarker.png',
    iconSize: [25, 41],
    iconAnchor: [12, 40]
  }),
  alt: "Me!"
}).addTo(map)
  , mycircle = L.circle([0, 0], 50, {
    fillOpacity: 0.5
  }).addTo(map);

var everyone = {};

function fadeOutOldMarkers(everyone) {
  Object.keys(everyone)
    .forEach(function(id) {
      var person = everyone[id]
        , opacity = person.circle.options.opacity;

      if (opacity > 0) {
        person.circle.setStyle({ opacity: opacity - 0.05});
        person.marker.setOpacity(person.marker.options.opacity - 0.1)
      } else {
        map.removeLayer(person.circle);
        map.removeLayer(person.marker);
        map.removeLayer(person.line);
        delete everyone[id];
      }
    })
   ;
}

setInterval(fadeOutOldMarkers, 30000, everyone);

var ws = null,
	wsAttemptInterval;
function wsInit(position) {
	var connectionAttempt = 0;

	connect();

	function connect() {
		if (!wsAttemptInterval) {

			wsAttemptInterval = setInterval(attempt.bind(this), 5000);
			attempt.call(this);

			function attempt() {
				console.log('ws connection attempt: ',connectionAttempt++);
				ws = new WebSocket('ws://' + window.location.host + '/ws');
				if (ws.readyState > 1) return;
				console.log('ws connected');
				clearInterval(wsAttemptInterval);
				wsAttemptInterval = null;
				init();
			}
		}
	}

	function init() {
		ws.onopen = function() {
			console.log('opened');
			geo_success(position);
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
		    console.log(message);

		  switch(message.action) {
		    case 'allLocations':
		      var locations = message.data.locations;

		      Object.keys(locations)
		        .forEach(function(id) {
		          everyone[id] = {
		            marker: L.marker(locations[id].latlng).addTo(map),
		            circle: L.circle(locations[id].latlng, locations[id].accuracy).addTo(map),
		            line: L.polyline([mymarker.getLatLng(), locations[id].latlng]).addTo(map),
		            trail: L.polyline([locations[id].latlng]).addTo(map)
		          };
		        })
		      ;

		      document.cookie = 'id=' + message.data.id;

		      break;
		    case 'updateLocation':
		      var location = message.data;
		      if (everyone[location.id]) {
		      	var thisGuy = everyone[location.id];

		        thisGuy.marker
		          .setLatLng(location.latlng)
		          .setOpacity(1);
		        thisGuy.circle
		          .setLatLng(location.latlng)
		          .setRadius(location.accuracy)
		          .setStyle({opacity: 0.5});
		        thisGuy.line
		          .setLatLngs([
		            mymarker.getLatLng(),
		            location.latlng
		          ]);
		        thisGuy.trail
		        	.addLatLng(location.latlng);
		      } else {
		        everyone[location.id] = {
		          marker: L.marker(location.latlng).addTo(map),
		          circle: L.circle(location.latlng, location.accuracy).addTo(map),
		          line: L.polyline([mymarker.getLatLng(), location.latlng]).addTo(map),
		          trail: L.polyline([location.latlng]).addTo(map)
		        };
		      }

		      break;
		  }
		};

		ws.onerror = ws.onclose = connect;
	}
}

navigator.geolocation.watchPosition(geo_success, geo_error, {enableHighAccuracy: true});

function geo_success(position) {
	if (ws && ws.readyState) {
		console.log('got a fix');

		var data = {
			latlng: [position.coords.latitude, position.coords.longitude],
			accuracy: Math.ceil(position.coords.accuracy)
		};

		try {
			ws.send(JSON.stringify({ action: 'updateLocation', data: data}));
		} catch (e) {
			console.log('caught exception', e);
		};
		

		mymarker.setLatLng(data.latlng);
		mycircle
			.setLatLng(data.latlng)
			.setRadius(position.coords.accuracy)
		;

		Object.keys(everyone)
		  .forEach(function(id) {
		    everyone[id].line
		      .setLatLngs([
		        data.latlng,
		        everyone[id].marker.getLatLng()
		      ])
		  })
		;
	} else if (!ws) {
		console.log('got initial fix, initializing websockets');
		wsInit(position);
	}
}

function geo_error() {
	console.log('geolocation error');
}

// modal
var $modalDiv = $('.ui.modal');
$('#settings').click(function() {
    $modalDiv.modal('show');
});

var fixed = false;
$('.ui.button').click(function() {
    $(this).toggleClass('active');
    fixed = !fixed;
    ws.send(JSON.stringify({ action: 'changeFixedLocationState', data: fixed}));
});