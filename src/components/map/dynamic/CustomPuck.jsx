import React from 'react';
import Mapbox from '@rnmapbox/maps';
import { heightStyles } from '../../../styles/MBXFloorStyles';

const generateArrowCoordinates = (center, size, ratio, heading) => {
  const arrowBottomIndent = size / 6;
  const arrowLength = size;
  const arrowWidth = size / 4;

  const coords = [
    [center[0], center[1]],                                   // Arrow middle                    
    [center[0] - arrowBottomIndent, center[1] - arrowWidth],  // Arrow bottom left 
    [center[0] + arrowLength, center[1]],                     // Arrow tip
    [center[0] - arrowBottomIndent, center[1] + arrowWidth],  // Arrow bottom right
    [center[0], center[1]],                                   // Closing the polygon
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
  const opacity = floor === userFloor ? 1 : 0.35;
  const height = heightStyles[floor.toString()].floor;
  const arrowRadius = 0.00002; // Arrow size
  const latLonRatio = 1/0.73;   // Ratio of latitude to longitude distances
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
      'fillExtrusionColor': '#067EE5',
      'fillExtrusionHeight': height + 1,
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
