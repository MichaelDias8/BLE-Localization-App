import React, { useEffect, useState } from 'react';
import Mapbox from '@rnmapbox/maps';
import { point, lineString } from '@turf/helpers';
import { getCoords, bearing, destination } from '@turf/turf';
import { heightStyles } from '../../../styles/MBXFloorStyles';

const NavigationPath = ({ navigationPath, floor, nextNode, userCoordinates }) => {
  const [extrusionPolygons, setExtrusionPolygons] = useState([]);
  const height = heightStyles[floor].floor;

  useEffect(() => {
    if (navigationPath.length < 2) return;

    const width = 0.00025; // Adjust width to make the line thicker
    const extensionLength = width / 2.3;
    const newExtrusionPolygons = [];
    const nextNodeIndex = navigationPath.findIndex(node => node.id === nextNode);

    // Ensure the nextNode is valid and not the first node
    if (nextNodeIndex <= 0) return;

    // Insert the user coordinates into the path
    const insertedPoint = userCoordinates;

    // Create a new path including the inserted point
    const updatedPath = [
      ...navigationPath.slice(0, nextNodeIndex),
      { id: `${floor}User`, coordinates: insertedPoint },
      ...navigationPath.slice(nextNodeIndex)
    ];

    // Generate extrusion polygons
    for (let i = 0; i < updatedPath.length - 1; i++) {
      const startNode = updatedPath[i];
      const endNode = updatedPath[i + 1];

      // Check if both nodes in the line have an id that starts with the same number as the floor
      if (startNode.id.startsWith(floor) && endNode.id.startsWith(floor)) {
        let start = startNode.coordinates;
        let end = endNode.coordinates;

        // Extend the start and end points
        const line = lineString([start, end]);
        const lineBearing = bearing(point(start), point(end));

        start = getCoords(destination(point(start), -extensionLength, lineBearing));
        end = getCoords(destination(point(end), extensionLength, lineBearing));

        const leftStart = getCoords(destination(point(start), width / 2, lineBearing - 90));
        const rightStart = getCoords(destination(point(start), width / 2, lineBearing + 90));
        const leftEnd = getCoords(destination(point(end), width / 2, lineBearing - 90));
        const rightEnd = getCoords(destination(point(end), width / 2, lineBearing + 90));

        newExtrusionPolygons.push({
          coordinates: [leftStart, rightStart, rightEnd, leftEnd, leftStart],
          color: i < nextNodeIndex ? '#BBA9C8' : '#2505FF' // Different colors
        });
      }
    }

    setExtrusionPolygons(newExtrusionPolygons);
  }, [navigationPath, floor, nextNode, userCoordinates]);

  const featureCollection = {
    type: 'FeatureCollection',
    features: extrusionPolygons.map((polygon, index) => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [polygon.coordinates]
      },
      properties: {
        id: `polygon${index}`,
        color: polygon.color
      }
    }))
  };

  if (navigationPath.length < 2) return null;

  return (
    <>
      <Mapbox.ShapeSource id="extrusionSource" shape={featureCollection}>
        <Mapbox.FillExtrusionLayer
          id="extrusionLayer"
          sourceID="extrusionSource"
          style={{
            fillExtrusionColor: ['get', 'color'],
            fillExtrusionOpacity: 1,
            fillExtrusionHeight: height + 0.5,
            fillExtrusionBase: height + 0.25,
          }}
        />
      </Mapbox.ShapeSource>
    </>
  );
};

export default NavigationPath;