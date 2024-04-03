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
  [-3.58, 5.28, -3.44, 5.28],
[-3.44, 5.28, -3.44, 6.92],
[-3.44, 6.92, -3.58, 6.92],
[-3.58, 6.92, -3.58, 5.28],
[-3.44, 5.41, -2.63, 5.41],
[-2.63, 5.41, -2.63, 6.92],
[-2.63, 6.92, -3.44, 6.92],
[-3.44, 6.92, -3.44, 5.41],
[-3.58, 1.57, -3.46, 1.57],
[-3.46, 1.57, -3.46, 4.51],
[-3.46, 4.51, -3.58, 4.51],
[-3.58, 4.51, -3.58, 1.57],
[-3.58, -0.01, -3.46, -0.01],
[-3.46, -0.01, -3.46, 0.38],
[-3.46, 0.38, -3.58, 0.38],
[-3.58, 0.38, -3.58, -0.01],


[-4.48, 5.66, -3.58, 5.66],
[-3.58, 5.66, -3.58, 6.92],
[-3.58, 6.92, -4.48, 6.92],
[-4.48, 6.92, -4.48, 5.66],
[-4.48, 5.92, -3.58, 5.92],
[-4.48, 6.17, -3.58, 6.17],
[-4.48, 6.42, -3.58, 6.42],
[-4.48, 6.67, -3.58, 6.67],
[-3.46, 2.58, -2.71, 2.58],
[-2.71, 2.58, -2.71, 3.38],
[-2.71, 3.38, -3.46, 3.38],
[-3.46, 3.38, -3.46, 2.58],
[-3.44, 5.66, -2.63, 5.66],
[-3.43, 5.91, -2.62, 5.91],
[-3.44, 6.164200000000001, -2.63, 6.164200000000001],
[-3.44, 6.414200000000001, -2.63, 6.414200000000001],
[-3.44, 6.664200000000001, -2.63, 6.664200000000001],
[-2.63, 5.28, -2.49, 5.28],
[-2.49, 5.28, -2.49, 6.92],
[-2.49, 6.92, -2.63, 6.92],
[-2.63, 6.92, -2.63, 5.28],

[0.01, -0.01, 0.01, 5.44],
[-7.01, 6.07, -7.01, -0.01],
[-4.48, 6.07, -7.01, 6.07],
[-2.71, 0.48, -0.71, 0.48],
[-0.71, 0.48, -0.71, 1.38],
[-0.71, 1.38, -2.71, 1.38],
[-2.71, 1.38, -2.71, 0.48],
[-0.83, 5.32, -1.82, 5.32],
[-0.83, 1.98, -0.83, 5.32],
[0.01, 1.98, -0.83, 1.98],
[-7.01, 1.75, -5.81, 1.75],
[-7.01, 4.15, -5.81, 4.15],
[-6.71, 3.85, -6.71, 2.05],
[-5.81, 2.05, -5.81, 1.75],
[-6.71, 2.05, -5.81, 2.05],
[-5.81, 3.85, -5.81, 4.15],
[-6.71, 3.85, -5.81, 3.85],
[-5.81, 3.85, -5.81, 2.05],
[-5.81, 2.65, -6.71, 2.65],
[-5.81, 3.25, -6.71, 3.25],
[-4.11, 2.08, -3.58, 2.08],
[-3.58, 2.08, -3.58, 3.78],
[-3.58, 3.78, -4.11, 3.78],
[-4.11, 3.78, -4.11, 2.08],
[-3.91, 2.28, -3.71, 2.28],
[-3.71, 2.28, -3.71, 3.58],
[-3.71, 3.58, -3.91, 3.58],
[-3.91, 3.58, -3.91, 2.28],
[-4.67, -0.02, -3.71, -0.02],
[-3.71, -0.02, -3.71, 0.33],
[-3.71, 0.33, -4.67, 0.33],
[-4.67, 0.33, -4.67, -0.02],
[-4.6, 5.66, -4.48, 5.66],
[-4.48, 5.66, -4.48, 6.07],
[-4.48, 6.07, -4.6, 6.07],
[-4.6, 6.07, -4.6, 5.66],
[-7.01, 6.07, -4.48, 6.07],
[-4.48, 6.07, -4.48, 6.19],
[-4.48, 6.19, -7.01, 6.19],
[-7.01, 6.19, -7.01, 6.07],
[-7.13, -0.01, -7.01, -0.01],
[-7.01, -0.01, -7.01, 6.19],
[-7.01, 6.19, -7.13, 6.19],
[-7.13, 6.19, -7.13, -0.01],
[-7.13, -0.13, 0.01, -0.13],
[0.01, -0.13, 0.01, -0.01],
[0.01, -0.01, -7.13, -0.01],
[-7.13, -0.01, -7.13, -0.13],
[0.01, -0.13, 0.13, -0.13],
[0.13, -0.13, 0.13, 6.06],
[0.13, 6.06, 0.01, 6.06],
[0.01, 6.06, 0.01, -0.13],
[-2.49, 6.05, 0.13, 6.05],
[0.13, 6.05, 0.13, 6.17],
[0.13, 6.17, -2.49, 6.17],
[-2.49, 6.17, -2.49, 6.05],

// Chair 
[-6.42, 0.03, -5.38, 0.63],
[-7.02, 1.0699999999999998, -6.42, 0.03],
[-7.02, 1.0699999999999998, -5.9799999999999995, 1.67],
[-6.35, 0.3, -5.4799999999999995, 0.8],
[-6.75, 1.0, -6.35, 0.3],
[-6.75, 1.0, -5.88, 1.5],
[-5.38, 0.63, -5.4799999999999995, 0.8],
[-5.88, 1.5, -5.9799999999999995, 1.67],
[-5.88, 1.5, -5.4799999999999995, 0.8],

// Stove
[-2.49, 5.3, -1.73, 5.3],
[-1.73, 5.35, -2.49, 5.35],
[-2.49, 5.35, -2.49, 5.3],
[-1.73, 6.05, -1.73, 5.3],

];

const canvasSize = { width: 300, height: 300 };
const zoomMultiplier = 1.2;
const buildingOffsetX = 265;       // Canvas coordinate offset in pixels
const buildingOffsetY = 25;       // Canvas coordinate offset in pixels
const userXOffSet = 38;   // User position offset in pixels
const userYOffSet = 28;  // User position offset in pixels

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
  const scaledX = canvasSize.width - (x * scale + buildingOffsetX);
  const scaledY = canvasSize.height - (y * scale + buildingOffsetY);
  return { x: scaledX, y: scaledY };
};

const scaleToCanvas = (coords) => {
  const { x, y } = coords;
  const scale = canvasSize.width / 10 * zoomMultiplier;
  const scaledX = (x * scale + userXOffSet);
  const scaledY = canvasSize.height - (y * scale + userYOffSet);
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
            <SvgText key={`beacon-label-${index}`} x={startX + 2} y={startY - 15} fill="black" fontSize="10">
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

      {/* User direction indicator */}
      <Path d={pathData} stroke="black" strokeWidth="2" fill="none" />

      {/* Render the measurement position */}
      <Circle cx={measurementPosition.x} cy={measurementPosition.y} r="5" fill="green" />

    </Svg>
  );
}

