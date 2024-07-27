import { point } from '@turf/helpers';
import { getCoords, destination, distance, bearing as turfBearing } from '@turf/turf';

export const calculateIconTranslation = (zoom, pitch, cameraCoordinates, symbolCoordinates) => {
  if (typeof cameraCoordinates !== 'object' || typeof symbolCoordinates !== 'object') return [0, 0];
  
  const cameraDistance = zoomToDistance(zoom);
  const offsetMultiplier = 64 / cameraDistance;

  // Create 2D points for camera and symbol
  const cameraPoint = point([cameraCoordinates.longitude, cameraCoordinates.latitude]);
  const symbolPoint = point([symbolCoordinates.longitude, symbolCoordinates.latitude]);

  // Calculate distance between camera and symbol
  const symbolToCamDistance = distance(cameraPoint, symbolPoint, { units: 'meters' });

  // Calculate the slope angle
  const rise = cameraCoordinates.altitude - symbolCoordinates.altitude;
  const run = symbolToCamDistance;
  const slope = Math.atan2(rise, run) * (180 / Math.PI); // slope in degrees

  // Calculate the vertical and horizontal distances between the symbol
  const verticalDistance = cameraCoordinates.altitude - symbolCoordinates.altitude;
  const horizontalDistance = symbolToCamDistance * Math.cos(slope * Math.PI / 180);

  // Calculate alpha
  const alpha = Math.atan2(verticalDistance, horizontalDistance) * (180 / Math.PI);

  // Calculate the offset factor using the method to find d
  const theta = pitch;
  var d = Math.sqrt(horizontalDistance**2 + verticalDistance**2) * Math.tan(theta * Math.PI / 180);

  //console.log("Slope: ", slope);
  //console.log("Offset Magnitude: ", d);

  // Cap the magnitude of the offset based on the symbol altitude and pitch
  var maxOffset = symbolCoordinates.altitude * 10;
  if (pitch > 45) {
    maxOffset *= (pitch - 35) / 12;
  }
  d = Math.min(d, maxOffset);

  // Calculate translation based on bearing and distance
  const bearing = turfBearing(cameraPoint, symbolPoint);
  const bearingRad = (bearing * Math.PI) / 180;
  const xTranslation = d * offsetMultiplier * Math.sin(bearingRad);
  const yTranslation = -d * offsetMultiplier * Math.cos(bearingRad);

  return [xTranslation, yTranslation];
};


export const calculateCameraPosition = (center, zoom, pitch, bearing) => {
  // Convert pitch and bearing to radians
  const pitchRad = (pitch * Math.PI) / 180;

  var distance = zoomToDistance(zoom);

  // Calculate the altitude component
  var altitude = distance * Math.cos(pitchRad);

  // Calculate the horizontal component
  const horizontalDistance = distance * Math.sin(pitchRad);

  const cameraXY = getCoords(destination(point(center), horizontalDistance/1000, bearing + 180));

  return {
    longitude: cameraXY[0],
    latitude: cameraXY[1],
    altitude: altitude
  };
};

function zoomToDistance(zoom) {
  if (zoom < 0 || zoom > 22) {
    throw new Error("Zoom level must be between 0 and 22 inclusive");
  }
  
  const baseZoomLevel = 6;
  let distance;
  
  if (zoom >= baseZoomLevel) {
    distance = 1126400 / Math.pow(2, zoom - baseZoomLevel);
  } else {
    // For zoom levels less than baseZoomLevel, increase the distance by scaling up
    distance = 1126400 * Math.pow(2, baseZoomLevel - zoom);
  }
  
  return distance;
}

function calculateTriangleAltitude(base, height) {
  console.log("Slope: ", height / base);
  // Step 1: Calculate the hypotenuse using the Pythagorean theorem
  const hypotenuse = Math.sqrt(Math.pow(base, 2) + Math.pow(height, 2));

  // Step 2: Calculate the area of the triangle
  const area = (base * height) / 2;

  // Step 3: Calculate the altitude (perpendicular distance from the right-angled vertex to the hypotenuse)
  const altitude = (2 * area) / hypotenuse;

  return altitude;
}

export const calculateTextOffset = (pitch, zoom, height) => {
  let offsetFactor = pitch / 10;
  let heightFactor = height * 1.1;
  offsetFactor += heightFactor;
  
  let maxOffset = (height * 1.6) - ((85 - pitch) / 10) + (zoom - 17) * 0.9;
  offsetFactor = Math.min(offsetFactor, maxOffset);
  offsetFactor *= -0.8;
  
  return [0, offsetFactor];
};