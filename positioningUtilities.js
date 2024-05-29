const projectionCenter = [-81.2764349, 43.0083786];   // Center for the mercator projection
const coordScaleRatio = 4656312;                      // Scale ratio for the mercator projection

const userZ = 0;                                      // The z-coordinate of the user

// 2D Multilateration function 
// @param referencePoints: an array of arrays containing the coordinates of the reference points
// @param distances: an array of distances from the target to each reference point
export const calculatePosition = (referencePoints, distancesObject) => {
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

  // Convert reference points to Mercator projection
  const projectedReferencePoints = formattedReferencePoints.map(point => mercatorProjection(projectionCenter, point));
  //console.log("Reference Points: ", projectedReferencePoints);


  // Calculate the intersection of the spheres with the xy-plane
  const { centers, radii } = intersectSpheresWithPlane(projectedReferencePoints, distances, userZ);
  //console.log("Centers: ", centers);

  // Return if there are not enough intersections
  if (centers.length < 2) {
    console.log("Calculate Position: Not enough circles");
    return false;
  }
    
  //Estimate & return the intersection point
  const projectedIntersectionPoint = estimateIntersectionPoint(centers, radii);  
  return inverseMercatorProjection(projectionCenter, projectedIntersectionPoint);
}

function formatInput(referencePoints, distancesObject) {
  const filteredEntries = Object.entries(distancesObject).filter(([key, value]) => !isNaN(value));
  const formattedReferencePoints = filteredEntries.map(([key]) => [...referencePoints[key]]);
  const distances = filteredEntries.map(([_, value]) => value);
  
  return { formattedReferencePoints, distances };
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
function estimateIntersectionPoint(centers, radii) {
  const n = centers.length;

  if (n < 2) {
      throw new Error("At least two circles are required to find an intersection point.");
  }

  // Use least squares to estimate the intersection point
  let sumX = 0;
  let sumY = 0;
  let sumWeights = 0;

  for (let i = 0; i < n; i++) {
      const [x, y] = centers[i];
      const r = radii[i];

      // Weights can be inversely proportional to the radius
      const weight = 1 / r;
      sumX += weight * x;
      sumY += weight * y;
      sumWeights += weight;
  }

  const estimatedX = sumX / sumWeights;
  const estimatedY = sumY / sumWeights;

  return [estimatedX, estimatedY];
}
function mercatorProjection(center, point) {
  const [lon0, lat0] = center;
  const [lon, lat, z] = point;

  const x = degreesToRadians(lon - lon0);
  const y = Math.log(Math.tan(Math.PI / 4 + degreesToRadians(lat) / 2)) -
            Math.log(Math.tan(Math.PI / 4 + degreesToRadians(lat0) / 2));

  return [x * coordScaleRatio, y * coordScaleRatio, z];
}
function inverseMercatorProjection(center, point) {
  const [lon0, lat0] = center;
  var [x, y] = point;
  x /= coordScaleRatio;
  y /= coordScaleRatio;

  const lon = radiansToDegrees(x) + lon0;
  const lat = radiansToDegrees(2 * (Math.atan(Math.exp(y + Math.log(Math.tan(Math.PI / 4 + degreesToRadians(lat0) / 2)))) - Math.PI / 4));

  return [lon, lat];
}
function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}
function radiansToDegrees(radians) {
  return radians * (180 / Math.PI);
}