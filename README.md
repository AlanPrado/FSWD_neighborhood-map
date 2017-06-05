# Project: Neighborhood Map

`Neighborhood Map` is a project that show markers associated with locations in list view.
The markers represents U.S. parks and when it's clicked show up weather and google street view information.

Data from file [locations.json](https://github.com/AlanPrado/neighborhood-map/blob/master/data/locations.json) are hard-coded and were extracted from [NPS](https://www.nps.gov/subjects/digital/nps-data-api.htm).

This projects also includes [Knockout JS](knockoutjs.com) to bind list view with its model and third party [Weather API](https://openweathermap.org/api).

## Quick Start

- Download and install [Node JS](https://nodejs.org/en/);
- Clone the repo: `https://github.com/AlanPrado/neighborhood-map/`;
- Generate your [Google Maps API key](https://developers.google.com/maps/documentation/javascript/get-api-key);
- Replace `GOOGLE_MAPS_API_KEY` for your Google Maps API key at [index.html](https://github.com/AlanPrado/neighborhood-map/blob/master/index.html) file;
- Generate your [Weather API key](https://openweathermap.org/api)
- Replace the string value `"WEATHER_API_KEY"` for your Weather API key at [/js/maps.js](https://github.com/AlanPrado/neighborhood-map/blob/master/js/maps.js) file;
- Run: `npm run serve`

## Copyright and license
Code and documentation copyright 2017-2017 Code released under the [MIT License](https://github.com/AlanPrado/neighborhood-map/blob/master/LICENSE)

## Authors

#### Original Author and Development Lead

- Alan Thiago do Prado (aprado.cnsp@gmail.com)
