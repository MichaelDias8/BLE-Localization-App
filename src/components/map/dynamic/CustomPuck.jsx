import React from 'react';
import Mapbox from '@rnmapbox/maps';
import { heightStyles } from '../../../styles/MBXFloorStyles';

const generateArrowCoordinates = (center, size, ratio, heading) => {
  const arrowHeadLength = size * 2;
  const arrowShaftLength = size * 1.5;
  const arrowShaftWidth = size * 0.5;
  const arrowHeadWidth = size * 1;


  const coords = [
    [center[0], center[1] + arrowHeadWidth],                        // Arrow head right
    [center[0] + arrowHeadLength, center[1]],                       // Arrow head center
    [center[0], center[1] - arrowHeadWidth],                        // Arrow head left 
    [center[0], center[1] - arrowShaftWidth / 2],                   // Shaft left bottom
    [center[0] - arrowShaftLength, center[1] - arrowShaftWidth / 2],// Shaft bottom left
    [center[0] - arrowShaftLength, center[1] + arrowShaftWidth / 2],// Shaft top left
    [center[0], center[1] + arrowShaftWidth / 2],                   // Shaft right bottom
    [center[0], center[1] + arrowHeadWidth]                         // Closing the polygon
  ];

  // Rotate the coordinates based on the heading
  const radHeading = (heading * Math.PI) / 180;
  const cosHeading = Math.cos(radHeading);
  const sinHeading = Math.sin(radHeading);

  const rotatedCoords = coords.map(coord => {
    const dx = (coord[0] - center[0]) / ratio;
    const dy = coord[1] - center[1];
    const rotatedX = dx * cosHeading - dy * sinHeading;
    const rotatedY = dx * sinHeading + dy * cosHeading;
    return [(rotatedX * ratio) + center[0], rotatedY + center[1]];
  });

  return rotatedCoords;
};

const CustomPuck = ({ floor, userFloor, coordinates, heading }) => {
  const opacity = floor === userFloor ? 1 : 0.5;
  const height = heightStyles[floor.toString()].floor;
  const arrowRadius = 0.000005; // Adjust radius as needed
  const latLonRatio = 1/0.73; // Ratio of latitude to longitude distances
  const arrowCoordinates = generateArrowCoordinates(coordinates, arrowRadius, latLonRatio, -heading + 90);

  const extrusionLayer = {
    id: `user-puck-extrusion`,
    type: 'fill-extrusion',
    source: {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [arrowCoordinates]
            }
          }
        ]
      }
    },
    paint: {
      'fillExtrusionColor': '#ff0000',
      'fillExtrusionHeight': height + 0.1,
      'fillExtrusionBase': height - 0.4,
      'fillExtrusionOpacity': opacity,
    }
  };

  return (
    <Mapbox.ShapeSource id={`source-user-puck`} shape={extrusionLayer.source.data}>
      <Mapbox.FillExtrusionLayer 
        id={extrusionLayer.id} 
        style={extrusionLayer.paint} 
      />
    </Mapbox.ShapeSource>
  );
};

export default CustomPuck;
