import * as turf from '@turf/turf';

// 2D Path Restricted Multilateration Function 
// @param - referencePoints: object containing (id, coordinate) key-value pairs of nearby beacons. ex. "275873": [long, lat, z]
// @param -       distances: object containing (id, distance)   key-value pairs of nearby beacons. ex. "275873": 2
export const calculatePosition = (referencePoints, distancesObject, userLine, userCoordinates, userFloor) => {
  const startTime = performance.now();
  // Format input & remove NaN distances
  const { formattedReferencePoints, distances } = formatInput(referencePoints, distancesObject);
  // Return if there are not enough reference points
  if (formattedReferencePoints.length < 3) {
    console.log("Calculate Position: Not enough reference points");
    console.log("Reference Points: ", referencePoints);
    console.log("Distances: ", distancesObject);
    return false;
  }

  // Calculate the intersection of the spheres with the z plane
  const { centers, radii } = intersectSpheresWithPlane(formattedReferencePoints, distances, 0);

  console.log("User Line: ", userLine);
  console.log("Reference Points: ", formattedReferencePoints);
  console.log("Distances: ", distances);
  console.log("Circle Centers: ", centers);
  console.log("Circle Radii: ", radii);

  // Calculate the intersection of the spheres with the user's path
  const intersectionPoints = intersectCirclesWithLine(formattedReferencePoints, distances, userLine, userCoordinates);

  console.log("Intersection Points: ", intersectionPoints);
    
  // Estimate and return position
  const estimatedPosition = estimatePosition(intersectionPoints, userCoordinates);
  
  return estimatedPosition;
}
function estimatePosition(intersectionPoints, userCoordinates) {
  // Calculate the average of the intersection points
  const averagePoint = intersectionPoints.reduce((acc, curr) => [acc[0] + curr[0], acc[1] + curr[1]]).map(coord => coord / intersectionPoints.length);

  return averagePoint;
}
function intersectCirclesWithLine(referencePoints, distances, line, userCoordinates) {
  const intersectionPoints = [];

  for (let i = 0; i < referencePoints.length; i++) {
    const center = referencePoints[i].slice(0, 2); // Get the 2D coordinates
    const radius = distances[i];
    const intersections = findCircleLineIntersections(center, radius, line);

    if (intersections.length > 0) {
      // Find the intersection point closest to the userCoordinates
      const closestPoint = intersections.reduce((prev, curr) => {
        const prevDistance = turf.distance(turf.point(prev), turf.point(userCoordinates));
        const currDistance = turf.distance(turf.point(curr), turf.point(userCoordinates));
        return (prevDistance < currDistance) ? prev : curr;
      });
      intersectionPoints.push(closestPoint);
    } else {
      // If no intersection, find the nearest point on the line from the circle center
      const nearestPoint = turf.nearestPointOnLine(turf.lineString([userCoordinates, [userCoordinates[0] + line[0], userCoordinates[1] + line[1]]]), turf.point(center));
      intersectionPoints.push(nearestPoint.geometry.coordinates);
    }
  }

  return intersectionPoints;
}
function findCircleLineIntersections(center, radius, line) {
  const [cx, cy] = center;
  const [dx, dy] = line;
  
  const a = dx * dx + dy * dy;
  const b = 2 * (dx * (0 - cx) + dy * (0 - cy));
  const c = cx * cx + cy * cy - radius * radius;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return [];
  }

  const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
  const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);

  const intersection1 = [cx + t1 * dx, cy + t1 * dy];
  const intersection2 = [cx + t2 * dx, cy + t2 * dy];

  return [intersection1, intersection2];
}
function intersectSpheresWithPlane(centers, radii, zPlane) {
  const intersectionCenters = [];
  const intersectionRadii = [];

  for (let i = 0; i < centers.length; i++) {
      const [x, y, z] = centers[i];
      const r = radii[i];

      // Calculate the distance from the sphere center to the plane
      const distanceToPlane = Math.abs(z - zPlane);

      // Check if the sphere intersects the plane
      if (distanceToPlane <= r) {
          // The radius of the intersection circle
          const intersectionRadius = Math.sqrt(r * r - distanceToPlane * distanceToPlane);

          // The center of the intersection circle in the xy-plane
          intersectionCenters.push([x, y]);
          intersectionRadii.push(intersectionRadius);
      }
  }

  return {
      centers: intersectionCenters,
      radii: intersectionRadii
  };
}
function formatInput(referencePoints, distancesObject) {
  const filteredEntries = Object.entries(distancesObject).filter(([key, value]) => !isNaN(value));
  const formattedReferencePoints = filteredEntries.map(([key]) => [...referencePoints[key]]);
  const distances = filteredEntries.map(([_, value]) => value);
  
  return { formattedReferencePoints, distances };
}