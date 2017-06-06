var maps = (function () {
  // TODO: save data in localstorage
  var Model = function (locations) {
    this.locations = locations;
  };

  var ListViewModel = function (data) {
    var self = this;
    this.listeners = {
        change: [],
        selection: [],
        addListener: function (type, listener) {
          this[type].push(listener);
        }
    };
    this.locations = ko.observableArray(data);
    this.searchLocation = ko.observable("");

    this.addChangeListener = function (listener) {
      self.listeners.addListener("change", listener);
    };

    this.addSelectionListener = function (listener) {
      self.listeners.addListener("selection", listener);
    };

    this.fireChangeEvent = function () {
      var listeners = self.listeners.change;
      for (var i = 0; i < listeners.length; i++) {
        listeners[i]();
      }
    };

    this.fireSelectionEvent = function (location) {
      var listeners = self.listeners.selection;
      for (var i = 0; i < listeners.length; i++) {
        listeners[i](location);
      }
    };

    function matchCriteria(word, searchText) {
      return word.toUpperCase().search(searchText.toUpperCase()) >= 0;
    }

    this.applyFilters = function () {
      var locations = self.locations();
      var searchText = self.searchLocation();

      var isFilterEmpty = searchText.length === 0;

      for (var i = 0; i < locations.length; i++) {
        locations[i].visible = isFilterEmpty || matchCriteria(locations[i].title, searchText);
      }
      self.fireChangeEvent();
    };

    this.filterLocations = ko.computed(function () {
      self.applyFilters();

      return self.locations().filter(function (location) {
        return location.visible;
      });
    });

    this.selectLocation = function () {
      self.fireSelectionEvent(this);
    };

    this.init = function () {
      ko.applyBindings(self);
      self.applyFilters();
    };
  };

  var MapsView = function (locations, controller) {
    var self = this;
    var STREET_VIEW_RADIUS = 50;

    this.map = undefined;
    this.infowindow = undefined;
    this.defaultIcon = undefined;
    this.highlightedIcon = undefined;
    this.markers = [];
    this.controller = undefined;
    this.infowindowView = undefined;

    this.closeInfowindow = function () {
      // clear a infowindow content if it's still opened
      if (self.infowindow && self.infowindow.marker) {
        self.infowindow.setContent('');
        self.infowindow.marker.setAnimation(null);
        self.infowindow.marker = null;
      }
    };

    this.makeInfoWindow = function () {
      var infowindow = new google.maps.InfoWindow();

      infowindow.addListener('closeclick', function() {
        self.closeInfowindow();
      });

      return infowindow;
    };

    this.makeMarkerIcon = function (markerColor) {
      var markerwidth = 25;
      var markerheight = 40;

      var markerImage = new google.maps.MarkerImage(
        'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor + '|40|_|%E2%80%A2',
        new google.maps.Size(markerwidth, markerheight),
        new google.maps.Point(0, 0),
        new google.maps.Point(markerwidth / 2, markerheight),
        new google.maps.Size(markerwidth, markerheight)
      );

      return markerImage;
    };

    function InfoWindowView (marker) {
      this.marker = marker;
      this.temperature = null;
      this.panorama = null;

      this.render = function () {
        var content = '';
        content += '<div class="mdl-card infowindow">';
        content += '  <div class="mdl-card__title"><h2 class="mdl-card__title-text">' + this.marker.title + '</h2></div>';
        content += '  <div class="mdl-card__actions content">';
        content += '    <div class="panorama">' + this.panorama + '</div>';
        content += '    <div class="temp">' + this.temperature + '</div>';
        content += '  </div>';
        content += '</div>';
        self.infowindow.setContent(content);
      };

      this.setPanorama = function (hasPanorama) {
        if (hasPanorama) {
          this.panorama = '<div id="pano"></div>';
        } else {
          this.panorama = '<div class="error-msg">No Street View Found</div>';
        }
      };

      this.setTemperature = function(forecast) {
        var header = '<h4 class="title">Temperature</h4>';
        var currentTemp = '<div class="current">' + forecast.temp + ' F°</div>';
        var minTemp = '<div class="min">Min: ' + forecast.temp_min + ' F°</div>';
        var maxTemp = '<div class="max">Max: ' + forecast.temp_max +' F°</div>';
        var credits = '<div class="credits">Power by <a href="https://openweathermap.org/">Open Weather Map</a></div>';
        this.temperature = header + currentTemp + minTemp + maxTemp + credits;
      };

      this.setTemperatureError = function(message) {
        this.temperature = '<div class="error-msg">"' + message + "</div>";
      };

    }

    function getStreetView (data, status) {
      if (status == google.maps.StreetViewStatus.OK) {
        var nearStreetViewLocation = data.location.latLng;
        var heading = google.maps.geometry.spherical.computeHeading(
          nearStreetViewLocation,
          self.infowindowView.marker.position
        );

        self.infowindowView.setPanorama(true);
        self.infowindowView.render();

        var panorama = new google.maps.StreetViewPanorama(
          document.getElementById('pano'),
          {
            position: nearStreetViewLocation,
            pov: {
              heading: heading,
              pitch: 30
            }
          }
        );

      } else {
        self.infowindowView.setPanorama(false);
        self.infowindowView.render();
      }
    }

    this.populateInfoWindow = function (marker) {
      if (self.infowindow.marker != marker) {
        self.closeInfowindow();
        self.infowindow.marker = marker;

        var streetViewService = new google.maps.StreetViewService();
        self.infowindowView = new InfoWindowView(marker);
        self.infowindow.open(self.map, marker);

        self.controller.getForecast(marker.position)
          .then(function(forecast) {
            self.infowindowView.setTemperature(forecast);
          })
          .fail(function() {
            self.infowindowView.setTemperatureError('Could not load forecast data.');
          })
          .done(function() {
            streetViewService.getPanoramaByLocation(marker.position, STREET_VIEW_RADIUS, getStreetView);
          });
      }
    };

    this.openMarker = function (toogleDrawer){
      if (toogleDrawer) {
        var layout = document.querySelector('.mdl-layout');
        layout.MaterialLayout.toggleDrawer();
      }

      self.closeInfowindow();
      self.setCenter(this.position);
      this.setAnimation(google.maps.Animation.BOUNCE);
      self.populateInfoWindow(this);
    };

    this.makeMarkers = function (locations) {
      for (var i = 0; i < locations.length; i++) {
        var marker = new google.maps.Marker({
          position: locations[i].location,
          title: locations[i].title,
          icon: self.defaultIcon,
          id: i,
          map: self.map
        });

        marker.addListener('click', function() {
          self.openMarker.apply(this);
        });
        marker.addListener('mouseover', function() {
          this.setIcon(self.highlightedIcon);
        });
        marker.addListener('mouseout', function() {
          this.setIcon(self.defaultIcon);
        });

        self.markers.push(marker);
      }
    };

    this.refreshMarkers = function (KOLocations) {
      var locations = KOLocations();
      for (var i = 0; i < locations.length; i++) {
        self.markers[i].setVisible(locations[i].visible);
      }
    };

    this.setCenter = function (location) {
      self.map.setCenter(location);
    };

    this.findMakerByLocation = function (location) {
      for (var i = 0; i < self.markers.length; i++) {
        var currentMarker = self.markers[i];
        if (currentMarker.title === location.title) {
          return currentMarker;
        }
      }
    };

    this.init = function (options) {
      self.controller = controller;
      self.infowindow = self.makeInfoWindow();
      self.defaultIcon = self.makeMarkerIcon('0091ff');
      self.highlightedIcon = self.makeMarkerIcon('FFFF24');

      self.map = new google.maps.Map(document.getElementById('map'), options);
      self.makeMarkers(locations);
      self.map.addListener('click', function(position) {
        // remove marker animation
        // if infowindow was opened without using our markers (i.e., place)
        if (self.infowindow && self.infowindow.marker) {
          self.infowindow.marker.setAnimation(null);
        }
      });
    };

    return {
      "init": this.init,
      "refreshMarkers": this.refreshMarkers,
      "setCenter": this.setCenter,
      "openMarker": this.openMarker,
      "findMakerByLocation": this.findMakerByLocation
    };
  };

  var Controller = (function () {
    var self = this;
    var WEATHER_API = "http://api.openweathermap.org/data/2.5";
    var WEATHER_API_KEY = "WEATHER_API_KEY";

    this.model = undefined;
    this.mapsView = undefined;
    this.listViewModel = undefined;

    this.listViewChangeListener = function () {
      mapsView.refreshMarkers(listViewModel.locations);
    };

    this.listViewSelectionListener = function (location) {
      var marker = mapsView.findMakerByLocation(location);
      if (marker) {
        mapsView.openMarker.apply(marker, [true]);
      }
    };

    this.getForecast = function (location) {
      var data = {
        "lat": location.lat(),
        "lon": location.lng(),
        "units": "imperial",
        "apiKey": WEATHER_API_KEY
      };

      return $.getJSON(WEATHER_API + "/weather", data)
        .then(function(response) {
          return response.main;
        });
    };

    this.getLocations = function () {
      // TODO: extract locations data from NPS Data API (currently, doesn't support CORS)
      return $.getJSON("data/locations.json")
        .fail(function () {
          alert('Locations could not be loaded.');
        });
    };

    this.init = function () {
      getLocations().then(function (locations) {
        // create model
        model = new Model(locations);

        // create view
        mapsView = new MapsView(model.locations, self);
        mapsView.init({
          zoom: 7,
          mapTypeControl: false
        });
        mapsView.setCenter(locations[0].location);

        // create view model
        listViewModel = new ListViewModel(model.locations);
        listViewModel.addChangeListener(listViewChangeListener);
        listViewModel.addSelectionListener(listViewSelectionListener);
        listViewModel.init();
      });
    };

    return {
      "init": this.init
    };
  })();

  return Controller;

})();
