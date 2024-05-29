// Paths that the user can follow
export const paths = [
  [[-81.3123682192823, 43.01419929845659], [-81.312444, 43.014186]],
  [[-81.312444, 43.014186], [-81.31243791826907, 43.01415781458815]],
  [[-81.31243791826907, 43.01415781458815], [-81.31241271939096, 43.01415373377921]],
  [[-81.31241271939096, 43.01415373377921], [-81.31239060315819, 43.014166226487916]],
  [[-81.31239060315819, 43.014166226487916], [-81.31239915262962, 43.01419455826084]],

  [[-81.3124229332917, 43.01423058090725],  [-81.31241478734464, 43.014189636652794]],

  [[-81.312464, 43.014208], [-81.312376, 43.014219]],

  [[-81.312473, 43.014239], [-81.312442, 43.014242]],
  [[-81.312442, 43.014242], [-81.312438, 43.014211]]
  

]

// 1D Kalman Filter variables
export const processNoise = 0.5;  

// 2D Kalman Filter variables
export const KFFrequency = 0.5;                             // Time step in seconds
const processNoise2D = 1;                                   // Process noise for the 2D Kalman Filter

const BLEPosVariance = 4;                                   // Variance of the BLE position measurements
const APIPosVariance = 4;                                   // Variance of the API position measurements

const BLEVelVariance = KFFrequency ** 2 * BLEPosVariance;   // Variance of the BLE velocity measurements
const APIVelVariance = KFFrequency ** 2 * APIPosVariance;   // Variance of the API velocity measurements

export const ConstPosKFOptions = {
  dynamic: {
    init: {
      mean: [0, 0],
      covariance: [huge, huge],
    },
    transition: [
      [1, 0],
      [0, 1],
    ],
    covariance: [processNoise2D * KFFrequency, processNoise2D * KFFrequency]
  },
  observation: {
    dimension: 2,
    stateProjection: [
      [1, 0],
      [0, 1],
    ],
    covariance: [ APIPosVariance, APIPosVariance]
  }
};

// INITIAL COVARIANCES
const huge = 100;
export const ConstPosKFInitCov = [
  [huge, 0],
  [0, huge]
];
export const ConstVelKFInitCov = [
  [huge, 0, 0, 0],
  [0, huge, 0, 0],
  [0, 0, huge, 0],
  [0, 0, 0, huge]
];

// HELPERS
export function projectPointOntoLine(px, py, ax, ay, bx, by) {
  // Vector from A to B
  let ABx = bx - ax;
  let ABy = by - ay;

  // Vector from A to P
  let APx = px - ax;
  let APy = py - ay;

  // Calculate the projection scalar
  let AB_AB = ABx * ABx + ABy * ABy;
  if (AB_AB === 0) return { x: ax, y: ay }; // Avoid division by zero

  let AP_AB = APx * ABx + APy * ABy;
  let t = AP_AB / AB_AB;

  // Calculate the projected point
  let projX = ax + t * ABx;
  let projY = ay + t * ABy;

  return { x: projX, y: projY };
}
export function distanceBetweenPoints(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
export function findClosestIntersection(px, py, intersections) {
  let closestIntersection = null;
  let minDistance = Infinity;

  intersections.forEach(intersection => {
    const distance = distanceBetweenPoints(px, py, intersection.x, intersection.y);
    if (distance < minDistance) {
      minDistance = distance;
      closestIntersection = intersection;
    }
  });

  return closestIntersection;
}
export function findClosestPath(px, py, paths) {
  let closestPath = null;
  let closestPoint = null;
  let minDistance = Infinity;

  for (let i = 0; i < paths.length; i++) {
    const [ax, ay] = paths[i][0];
    const [bx, by] = paths[i][1];
    const projectedPoint = projectPointOntoLine(px, py, ax, ay, bx, by);
    
    if (!projectedPoint) continue;

    const distance = distanceBetweenPoints(px, py, projectedPoint.x, projectedPoint.y);

    if (distance < minDistance) {
      minDistance = distance;
      closestPath = paths[i];
      closestPoint = projectedPoint;
    }
  }

  return closestPath || paths[0]; // Return a default path if none found
}
export function findAllIntersections(paths) {
  const intersections = [];
  for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
          const intersection = findIntersection(paths[i], paths[j]);
          if (intersection) {
              intersections.push(intersection);
          }
      }
  }
  return intersections;
}
function findIntersection(line1, line2, tolerance = 1e-10) {
  const [x1, y1] = line1[0];
  const [x2, y2] = line1[1];
  const [x3, y3] = line2[0];
  const [x4, y4] = line2[1];

  // Check if they share a common coordinate
  if (
    (Math.abs(x1 - x3) <= tolerance && Math.abs(y1 - y3) <= tolerance) ||
    (Math.abs(x1 - x4) <= tolerance && Math.abs(y1 - y4) <= tolerance) ||
    (Math.abs(x2 - x3) <= tolerance && Math.abs(y2 - y3) <= tolerance) ||
    (Math.abs(x2 - x4) <= tolerance && Math.abs(y2 - y4) <= tolerance)
  ) {
    if (Math.abs(x1 - x3) <= tolerance && Math.abs(y1 - y3) <= tolerance) return { x: x1, y: y1, path1: line1, path2: line2};
    
    if (Math.abs(x1 - x4) <= tolerance && Math.abs(y1 - y4) <= tolerance) return { x: x1, y: y1, path1: line1, path2: line2};
    
    if (Math.abs(x2 - x3) <= tolerance && Math.abs(y2 - y3) <= tolerance) return { x: x2, y: y2, path1: line1, path2: line2};
    
    if (Math.abs(x2 - x4) <= tolerance && Math.abs(y2 - y4) <= tolerance) return { x: x2, y: y2, path1: line1, path2: line2};
    
  }

  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denominator === 0) return null; // Lines are parallel

  const x = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denominator;
  const y = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denominator;

  console.log(`Intersection: (${x}, ${y})`);

  return { x, y, path1: line1, path2: line2};
}
function scalarMultiply2DArray(matrix, scalar) {
  // Iterate through each row of the matrix
  for (let i = 0; i < matrix.length; i++) {
      // Iterate through each column in the current row
      for (let j = 0; j < matrix[i].length; j++) {
          // Multiply the current element by the scalar and update the element
          matrix[i][j] *= scalar;
      }
  }
  return matrix;
}