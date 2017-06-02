var MAPS = (function () {
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

      return ko.utils.arrayFilter(self.locations(), function (location) {
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

  var MapsView = function (locations) {
    var self = this;
    this.map = undefined;
    this.infowindow = undefined;
    this.defaultIcon = undefined;
    this.highlightedIcon = undefined;
    this.allMarkers = [];
    this.markers = [];

    this.closeInfowindow = function () {
      // clear a infowindow content if it's still opened
      if (self.infowindow && self.infowindow.marker) {
        self.infowindow.setContent('');
        self.infowindow.marker.setAnimation(null);
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

    this.populateInfoWindow = function (marker) {
      if (self.infowindow.marker != marker) {
        self.closeInfowindow();
        self.infowindow.marker = marker;

        function getStreetView (data, status) {
          if (status == google.maps.StreetViewStatus.OK) {
            var nearStreetViewLocation = data.location.latLng;
            var heading = google.maps.geometry.spherical.computeHeading(
              nearStreetViewLocation,
              marker.position
            );
            self.infowindow.setContent('<div>' + marker.title + '</div><div id="pano"></div>');

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
            self.infowindow.setContent('<div>' + marker.title + '</div>' +
              '<div>No Street View Found</div>');
          }
        }

        var streetViewService = new google.maps.StreetViewService();
        var radius = 50;
        streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
        self.infowindow.open(self.map, marker);
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
          animation: google.maps.Animation.DROP,
          icon: self.defaultIcon,
          id: i
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

        self.allMarkers.push(marker);
      }
    };

    this.refreshMarkers = function (KOLocations) {
      self.markers = [];

      var locations = KOLocations();
      for (var i = 0; i < locations.length; i++) {
        if (locations[i].visible) {
          self.allMarkers[i].setMap(self.map);
          self.markers.push(self.allMarkers[i]);
        } else {
          self.allMarkers[i].setMap(null);
        }
      }
    };

    this.setCenter = function (location) {
      self.map.setCenter(location);
    };

    this.findMakerByLocation = function (location) {
      for (var i = 0; i < self.allMarkers.length; i++) {
        var currentMarker = self.allMarkers[i];
        if (currentMarker.title === location.title) {
          return currentMarker;
        }
      }
    };

    this.init = function (options) {
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

    this.getLocations = function () {
      return $.getJSON('data/locations.json')
        .then(function (data) {
          return data;
        })
        .fail(function () {
          alert('Locations could not be loaded.')
        });
    };

    this.init = function () {
      getLocations().then(function (locations) {
        // create model
        model = new Model(locations);

        // create view
        mapsView = new MapsView(model.locations);
        mapsView.init({
          zoom: 6,
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
