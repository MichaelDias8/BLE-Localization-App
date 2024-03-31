import React, { useMemo } from 'react';
import {Svg, Circle, Path, Text as SvgText} from 'react-native-svg';
import { beaconUUIDs } from './beaconUtilities';
const calculatePath = (coordinates, direction) => {
  // Calculate the angle for the arc from the direction vector
  const angle = Math.atan2(direction.y, direction.x);

  // Constants for arc calculation
  const semiCircleRadius = 8;
  const userRadius = 2; // Space between user and arc

  // Calculate the center point for the arc
  const arcCenterX = coordinates.x + Math.cos(angle) * userRadius;
  const arcCenterY = coordinates.y + Math.sin(angle) * userRadius;

  // Adjust these angles to change the arc span to 1/3 of a circle (60 degrees or pi/3 radians)
  const startAngle = angle - Math.PI / 3; // Start angle adjusted by -60 degrees
  const endAngle = angle + Math.PI / 3; // End angle adjusted by +60 degrees

  // Calculate start and end points for the arc
  const startX = arcCenterX + semiCircleRadius * Math.cos(startAngle);
  const startY = arcCenterY + semiCircleRadius * Math.sin(startAngle);
  const endX = arcCenterX + semiCircleRadius * Math.cos(endAngle);
  const endY = arcCenterY + semiCircleRadius * Math.sin(endAngle);

  // Define the path for the arc, ensure the large-arc-flag is set appropriately
  const largeArcFlag = 0; // This flag should be 0 since the arc is less than 180 degrees
  const sweepFlag = 1; // This flag determines the direction of the arc; 1 for clockwise

  const pathData = `M ${startX} ${startY} A ${semiCircleRadius} ${semiCircleRadius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;

  return pathData;
};

// Building layout lines
const lines = [
  [4.34, 6.39, 4.34, 4.88]
  ,
  [4.2, 1.04, 4.32, 1.04]
  ,
  [4.32, 1.04, 4.32, 3.98]
  ,
  [4.32, 3.98, 4.2, 3.98]
  ,
  [4.2, 3.98, 4.2, 1.04]
  ,
  [4.2, -0.54, 4.32, -0.54]
  ,
  [4.32, -0.54, 4.32, -0.15000000000000036]
  ,
  [4.32, -0.15000000000000036, 4.2, -0.15000000000000036]
  ,
  [4.2, -0.15000000000000036, 4.2, -0.54]
  ,
  [3.3, 5.13, 4.2, 5.13]
  ,
  [4.2, 5.13, 4.2, 6.39]
  ,
  [4.2, 6.39, 3.3, 6.39]
  ,
  [3.3, 6.39, 3.3, 5.13]
  ,
  [3.3, 5.39, 4.2, 5.39]
  ,
  [3.3, 5.64, 4.2, 5.64]
  ,
  [3.3, 5.89, 4.2, 5.89]
  ,
  [3.3, 6.14, 4.2, 6.14]
  ,
  [4.32, 2.8499999999999996, 4.32, 2.05]
  ,
  [4.34, 5.13, 5.15, 5.13]
  ,
  [4.35, 5.38, 5.16, 5.38]
  ,
  [4.34, 5.6342, 5.15, 5.6342]
  ,
  [4.34, 5.8842, 5.15, 5.8842]
  ,
  [4.34, 6.1342, 5.15, 6.1342]
  ,
  [5.15, 4.75, 5.29, 4.75]
  ,
  [5.29, 4.75, 5.29, 6.39]
  ,
  [5.29, 6.39, 5.15, 6.39]
  ,
  [5.15, 6.39, 5.15, 4.75]
  ,
  [4.2, 4.75, 4.34, 4.75]
  ,
  [4.34, 4.75, 4.34, 6.39]
  ,
  [4.34, 6.39, 4.2, 6.39]
  ,
  [4.2, 6.39, 4.2, 4.75]
  ,
  [4.34, 4.88, 5.15, 4.88]
  ,
  [5.15, 4.88, 5.15, 6.39]
  ,
  [5.15, 6.39, 4.34, 6.39]
  ,
  [5.07, -0.04999999999999982, 7.07, -0.04999999999999982]
  ,
  [7.07, -0.04999999999999982, 7.07, 0.8499999999999996]
  ,
  [7.07, 0.8499999999999996, 5.07, 0.8499999999999996]
  ,
  [5.07, 0.8499999999999996, 5.07, -0.04999999999999982]
  ,
  [6.95, 4.37, 6.09, 4.37]
  ,
  [6.95, 1.4500000000000002, 6.95, 4.37]
  ,
  [7.79, 1.4500000000000002, 6.95, 1.4500000000000002]
  ,
  [4.32, 2.05, 5.07, 2.05]
  ,
  [5.07, 2.05, 5.07, 2.8499999999999996]
  ,
  [5.07, 2.8499999999999996, 4.32, 2.8499999999999996]
  ,
  [0.77, 1.2199999999999998, 1.97, 1.2199999999999998]
  ,
  [0.77, 3.62, 1.97, 3.62]
  ,
  [1.07, 3.32, 1.07, 1.5199999999999996]
  ,
  [1.97, 1.5199999999999996, 1.97, 1.2199999999999998]
  ,
  [1.07, 1.5199999999999996, 1.97, 1.5199999999999996]
  ,
  [1.97, 3.32, 1.97, 3.62]
  ,
  [1.07, 3.32, 1.97, 3.32]
  ,
  [1.97, 3.32, 1.97, 1.5199999999999996]
  ,
  [1.97, 2.12, 1.07, 2.12]
  ,
  [1.97, 2.7199999999999998, 1.07, 2.7199999999999998]
  ,
  [3.67, 1.5499999999999998, 4.2, 1.5499999999999998]
  ,
  [4.2, 3.25, 3.67, 3.25]
  ,
  [3.67, 3.25, 3.67, 1.5499999999999998]
  ,
  [3.87, 1.75, 4.07, 1.75]
  ,
  [4.07, 1.75, 4.07, 3.05]
  ,
  [4.07, 3.05, 3.87, 3.05]
  ,
  [3.87, 3.05, 3.87, 1.75]
  ,
  [3.11, -0.5499999999999998, 4.07, -0.5499999999999998]
  ,
  [4.07, -0.5499999999999998, 4.07, -0.20000000000000018]
  ,
  [4.07, -0.20000000000000018, 3.11, -0.20000000000000018]
  ,
  [3.11, -0.20000000000000018, 3.11, -0.5499999999999998]
  ,
  [3.18, 5.13, 3.3, 5.13]
  ,
  [3.3, 5.13, 3.3, 5.54]
  ,
  [3.3, 5.54, 3.18, 5.54]
  ,
  [3.18, 5.54, 3.18, 5.13]
  ,
  [0.77, 5.54, 3.3, 5.54]
  ,
  [3.3, 5.66, 0.77, 5.66]
  ,
  [0.77, 5.66, 0.77, 5.54]
  ,
  [0.65, -0.54, 0.77, -0.54]
  ,
  [0.77, -0.54, 0.77, 5.66]
  ,
  [0.77, 5.66, 0.65, 5.66]
  ,
  [0.65, 5.66, 0.65, -0.54]
  ,
  [0.65, -0.6600000000000001, 7.79, -0.6600000000000001]
  ,
  [7.79, -0.6600000000000001, 7.79, -0.54]
  ,
  [7.79, -0.54, 0.65, -0.54]
  ,
  [0.65, -0.54, 0.65, -0.6600000000000001]
  ,
  [7.79, -0.6600000000000001, 7.91, -0.6600000000000001]
  ,
  [7.91, -0.6600000000000001, 7.91, 4.91]
  ,
  [7.91, 4.91, 7.79, 4.91]
  ,
  [7.79, 4.91, 7.79, -0.6600000000000001]
  ,
  [5.29, 4.91, 7.91, 4.91]
  ,
  [7.91, 4.91, 7.91, 5.03]
  ,
  [7.91, 5.03, 5.29, 5.03]
  ,
  [5.29, 4.109999999999999, 6.09, 4.109999999999999]
  ,
  [6.09, 4.16, 5.29, 4.16]
  ,
  [6.09, 4.87, 6.09, 4.07]
  ,
  [5.29, 4.87, 5.29, 4.07]
  ,
  [1.38, -0.5199999999999996, 2.42, 0.08000000000000007]
  ,
  [0.78, 0.5199999999999996, 1.38, -0.5199999999999996]
  ,
  [0.78, 0.5199999999999996, 1.82, 1.12]
  ,
  [1.45, -0.25, 2.32, 0.25]
  ,
  [1.05, 0.4500000000000002, 1.45, -0.25]
  ,
  [1.05, 0.4500000000000002, 1.92, 0.9500000000000002]
  ,
  [2.42, 0.08000000000000007, 2.32, 0.25]
  ,
  [1.92, 0.9500000000000002, 1.82, 1.12]
  ,
  [1.92, 0.9500000000000002, 2.32, 0.25]
  ,
  [0.77, 5.02, 1.52, 5.02]];

const canvasSize = { width: 300, height: 300 };
const zoomMultiplier = 1.2;
const xOffSet = -5;       // Canvas coordinate offset in pixels
const yOffSet = 25;       // Canvas coordinate offset in pixels
const userXOffSet = 35;   // User position offset in pixels
const userYOffSet = -17;  // User position offset in pixels

const scaleLineFromBeacon = (beaconPosition, userPosition, distance) => {
  const dx = userPosition.x - beaconPosition.x;
  const dy = userPosition.y - beaconPosition.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const unitX = dx / length;
  const unitY = dy / length;
  const scaledLength = distance * canvasSize.width / 10 * zoomMultiplier;
  const scaledX = beaconPosition.x + unitX * scaledLength;
  const scaledY = beaconPosition.y + unitY * scaledLength;
  return { startX: beaconPosition.x, startY: beaconPosition.y, endX: scaledX, endY: scaledY };
}

const scaleToCanvasAndReflect = (coords) => {
  const { x, y } = coords;
  const scale = canvasSize.width / 10 * zoomMultiplier;
  const scaledX = canvasSize.width - (x * scale + xOffSet);
  const scaledY = canvasSize.height - (y * scale + yOffSet);
  return { x: scaledX, y: scaledY };
};

const scaleToCanvas = (coords) => {
  const { x, y } = coords;
  const scale = canvasSize.width / 10 * zoomMultiplier;
  const scaledX = (x * scale + xOffSet + userXOffSet);
  const scaledY = canvasSize.height - (y * scale + yOffSet + userYOffSet);
  return { x: scaledX, y: scaledY };
};

export const SvgCanvas = ({ beaconCoords, beaconDistances, userCoordinates, measurementCoords, userDirection }) => {
  const userPosition = scaleToCanvas(userCoordinates);
  const measurementPosition = scaleToCanvas({ x: measurementCoords[0], y: measurementCoords[1] });
  
  // Calculate the path for the user direction indicator
  const pathData = calculatePath(userPosition, userDirection);

  // Memoize building layout paths
  const buildingLayoutPaths = useMemo(() => (
    lines.map(([x1, y1, x2, y2], index) => {
      const start = scaleToCanvasAndReflect({ x: x1, y: y1 });
      const end = scaleToCanvasAndReflect({ x: x2, y: y2 });
      const pathD = `M${start.x},${start.y} L${end.x},${end.y}`;
      return <Path key={`line-${index}`} d={pathD} stroke="black" strokeWidth="2" />;
    })
  ), []); // Dependency array is empty, so this calculation runs only once

  return (
    <Svg height={canvasSize.height} width={canvasSize.width}>
      
      {/* Render beacons relative to user's position */}
      {beaconCoords.map((coord, index) => {
        const beaconPosition = scaleToCanvas({ x: coord[0], y: coord[1]});
        // Assuming beaconDistances is keyed by the beacon UUIDs
        const distance = beaconDistances[beaconUUIDs[index]]; // Get the correct distance
        const { startX, startY, endX, endY } = scaleLineFromBeacon(beaconPosition, userPosition, distance);

        return (
          <React.Fragment key={`beacon-group-${index}`}>
            <Circle key={`beacon-${index}`} cx={startX} cy={startY} r="4" fill="blue" />
            <SvgText key={`beacon-label-${index}`} x={startX + 15} y={startY + 15} fill="black" fontSize="10">
              B{index + 1}
            </SvgText>
            {/* Draw line from the beacon towards the user for the specified distance */}
            <Path key={`beacon-line-${index}`} d={`M${startX},${startY} L${endX},${endY}`} stroke="black" strokeWidth="1" />
          </React.Fragment>
        );
      })}
      {/* Render building layout from memoized value */}
      {buildingLayoutPaths}

      {/* User position indicator */}
      <Circle cx={userPosition.x} cy={userPosition.y} r="5" fill="red" />

      {/* User position label */}
      <SvgText x={userPosition.x + 15} y={userPosition.y + 15} fill="black" fontSize="10">
        {`(${userCoordinates.x.toFixed(2)}, ${userCoordinates.y.toFixed(2)})`}
      </SvgText>

      {/* User direction indicator */}
      <Path d={pathData} stroke="black" strokeWidth="2" fill="none" />

      {/* Render the measurement position */}
      <Circle cx={measurementPosition.x} cy={measurementPosition.y} r="5" fill="green" />

    </Svg>
  );
}

