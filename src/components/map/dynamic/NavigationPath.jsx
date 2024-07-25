import React from 'react';
import Mapbox from '@rnmapbox/maps';
import { point, lineString } from '@turf/helpers';
import { getCoords, bearing, destination } from '@turf/turf';
import { heightStyles } from '../../../styles/MBXFloorStyles';

const NavigationPath = ({ navigationPath, floor }) => {

  const height = heightStyles[floor].floor;
  if (navigationPath.length < 2) return null;

  const width = 0.0004; // Adjust width to make the line thicker
  const extensionLength = width / 2;
  const extrusionPolygons = [];

  for (let i = 0; i < navigationPath.length - 1; i++) {
    let start = navigationPath[i].coordinates;
    let end = navigationPath[i + 1].coordinates;

    // Extend the start and end points
    const line = lineString([start, end]);
    const lineBearing = bearing(point(start), point(end));

    start = getCoords(destination(point(start), -extensionLength, lineBearing));
    end = getCoords(destination(point(end), extensionLength, lineBearing));

    const leftStart = getCoords(destination(point(start), width / 2, lineBearing - 90));
    const rightStart = getCoords(destination(point(start), width / 2, lineBearing + 90));
    const leftEnd = getCoords(destination(point(end), width / 2, lineBearing - 90));
    const rightEnd = getCoords(destination(point(end), width / 2, lineBearing + 90));

    extrusionPolygons.push([
      leftStart,
      rightStart,
      rightEnd,
      leftEnd,
      leftStart
    ]);
  }

  const featureCollection = {
    type: 'FeatureCollection',
    features: extrusionPolygons.map((polygon, index) => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [polygon]
      },
      properties: {
        id: `polygon${index}`
      }
    }))
  };

  return (
    <>
      <Mapbox.ShapeSource id="extrusionSource" shape={featureCollection}>
        <Mapbox.FillExtrusionLayer
          id="extrusionLayer"
          sourceID="extrusionSource"
          style={{
            fillExtrusionColor: '#2505FF',
            fillExtrusionOpacity: 0.5,
            fillExtrusionHeight: height + 0.6,
            fillExtrusionBase: height + 0.25,
          }}
        />
      </Mapbox.ShapeSource>
    </>
  );
};

export default NavigationPath;
