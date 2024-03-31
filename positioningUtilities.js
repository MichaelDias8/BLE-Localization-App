// This file implements the trilateration algorithm to compute the least squares estimate 
// of a targets position based on distances from reference points with known coordinates.
// The algorithm can be found at:
// http://vigir.missouri.edu/~gdesouza/Research/Conference_CDs/IEEE_IROS_2009/papers/0978.pdf

import { dot, qr, add, subtract, transpose, multiply, zeros, divide, identity} from 'mathjs'
import * as Location from 'expo-location';

const I = identity(3);

// Multilateration function 
// @param referencePoints: an array of arrays containing the coordinates of the reference points
// @param distances: an array of distances from the target to each reference point
export const calculatePosition = (referencePoints, distancesObject) => {
  const startTime = performance.now();
  // Convert distances to a 2D array
  let distances = [];
  for (let distance in distancesObject) {
    distances.push(distancesObject[distance]);
  }
  //log the input data
  //console.log("Reference Points: ", referencePoints);
  //console.log("Distances: ", distances);

  // Calculate a, B, c, D, f, q*qT, H, f' and H', Q and U

  // Calculate a
  let sum = zeros(referencePoints[0].length, 1);
  referencePoints.forEach((pT, index) => {
    pT = [pT];
    let p = transpose(pT);
    let temp = subtract(multiply(multiply(p, pT), p), multiply(distances[index]**2, p));
    sum = add(sum, temp)
  }) 
  const a = divide(sum, referencePoints.length);
  //console.log("a: ", a);

  // Calculate B
  sum = zeros(referencePoints[0].length, referencePoints[0].length);
  referencePoints.forEach((pT, index) => {
    pT = [pT];
    let p = transpose(pT);
    let temp = add(subtract(multiply(-2, multiply(p, pT)), multiply(multiply(pT, p)[0][0], I)), multiply(distances[index]**2, I));
    sum = add(sum, temp);
  }) 
  const B = divide(sum, referencePoints.length);
  //console.log("B: ", B);

  // Calculate c
  sum = zeros(referencePoints[0].length, 1);
  referencePoints.forEach((pT, index) => {
    pT = [pT];
    sum = add(sum, transpose(pT));
  })
  const c = divide(sum, referencePoints.length);
  //console.log("c: ", c);

  // Calculate D
  const cT = transpose(c);
  let temp = add(B, multiply(2, multiply(c, cT)));
  const D = add(add(B, multiply(2, multiply(c, cT))), multiply(multiply(cT, c).get([0, 0]), I));
  //console.log("D: ", D);

  // Calculate f
  const f = add(add(a, multiply(B, c)), multiply(multiply(multiply(2, c), cT), c));
  //console.log("f: ", f);

  // Calculate qT*q
  sum = 0;
  let sum2 = 0;

  referencePoints.forEach((pT, index) => {
    pT = [pT];
    let p = transpose(pT);
    let temp = multiply(pT, p);
    let temp2 = add(distances[index]**2, multiply(cT, c));
    sum = add(sum, temp);
    sum2 = add(sum2, temp2);
  })

  const qTq = add(multiply(-1, divide(sum, referencePoints.length)), divide(sum2, referencePoints.length)).get([0,0]);
  //console.log("qTq: ", qTq);

  // Calculate H 
  const H = subtract(D, multiply(qTq, I));
  //console.log("H: ", H);

  // Calculate f'
  const fPrime = zeros(referencePoints[0].length-1, 1);
  f.forEach((val, index) => {
    if (index[0] === f.size()[0]-1) return;
    //subtract last element of f from each of the other elements
    fPrime.set([index[0], 0], val - f.get([f.size()[0]-1, 0]));
  })
  //console.log("f': ", fPrime);

  // Calculate H'
  const HPrime = zeros(referencePoints[0].length-1, referencePoints[0].length);
  H.forEach((val, index) => {
    if (index[0] === H.size()[0]-1) return;
    //subtract the corresponding element from the last row of H from each of the other elements
    HPrime.set([index[0], index[1]], val - H.get([H.size()[0]-1, index[1]]));
  })
  //console.log("H': ", HPrime);

  // Using QR decomposition find Q and U where H' = QU

  let QR = qr(HPrime);
  let Q = QR.Q;
  let U = QR.R.toArray();

  //console.log("Q: ", Q);
  //console.log("U: ", U);

  // Calculate V = QTf'
  const V = multiply(transpose(Q), fPrime).toArray();
  //console.log("V: ", V);

  // Calculate q₃ where [g + hq₃]² + [i + jq₃]² + q₃² = qTq
  const g = subtract(divide(multiply(U[0][1], V[1]), multiply(U[0][0], U[1][1])), divide(V[0], U[0][0]))[0];
  const h = subtract(divide(multiply(U[0][1], U[1][2]), multiply(U[0][0], U[1][1])), divide(U[0][2], U[0][0]));
  const i = divide(V[1], U[1][1])[0];
  const j = divide(U[1][2], U[1][1]);

  //console.log("g: ", g);
  //console.log("h: ", h);
  //console.log("i: ", i);
  //console.log("j: ", j);

  // Calculate k, l, and m where kq₃² + lq₃ + m = 0
  const k = 1 + h**2 + j**2;
  const l = 2*g*h + 2*i*j;
  const m = g**2 + i**2 - qTq;

  //console.log("k: ", k);
  //console.log("l: ", l);
  //console.log("m: ", m);

  // Solve for both solutions of q₃
  let discriminant = l**2 - 4*k*m;
  let realPart = -l / (2*k);
  let imaginaryPart;
  let q3first;
  let q3second;

  if (discriminant >= 0) {
    // Real solutions
    let sqrtDiscriminant = Math.sqrt(discriminant);
    q3first = (realPart + sqrtDiscriminant / (2*k));
    q3second = (realPart - sqrtDiscriminant / (2*k));
  } else {
    // Imaginary solutions
    imaginaryPart = Math.sqrt(-discriminant) / (2*k);
    q3first = realPart + imaginaryPart;
    q3second = realPart - imaginaryPart;
    //console.log("Solutions for q₃ real part: ", realPart);
    //console.log("Solutions for q₃ imaginary part: ", imaginaryPart);
  }

  //console.log("First Solution for q₃: ", q3first.toFixed(4));
  //console.log("Second Solution for q₃: ", q3second.toFixed(4));

  // Calculate both solutions for q₁ and q₂ using the solutions found for q₃
  const q1first = g + h*q3first;
  const q1second = g + h*q3second;
  const q2first = -i - j*q3first;
  const q2second = -i - j*q3second;

  // Return the two solutions for the target position
  const q = [q1first + c.get([0,0]), q2first + c.get([1,0]), q3first + c.get([2,0])];
  //console.log("First Solution: ", q.map((val) => val.toFixed(4)));
  const q2 = [q1second + c.get([0,0]), q2second + c.get([1,0]), q3second + c.get([2,0])];
  //console.log("Second Solution: ", q2.map((val) => val.toFixed(4)));

  const endTime = performance.now();
  const timeTaken = endTime - startTime;

  //console.log(`Trilateration Completed in ${timeTaken.toFixed(0)}ms`);

  return [q, q2];
}

// Function to reduce the array of 3D positions to a single 2D position
export const reduceTo2D = (positions) => {
  // Return the x and y coordinates of the position that has a positive z value
  if(positions[0][2] > 0) {
    return [positions[0][0], positions[0][1]];
  } else {
    return [positions[1][0], positions[1][1]];
  }
}

export async function getCurrentGPSLocation(setGPSCoordinates) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status === 'granted') {
    const location = await Location.getCurrentPositionAsync({});
    setGPSCoordinates(location);
  }
}

const bounds = [0, 0, 10, 10];

export const clampUserPosition = (x, y) => {
  let minX = bounds[0];
  let minY = bounds[1];
  let maxX = bounds[2];
  let maxY = bounds[3];
  x = Math.min(Math.max(x, minX), maxX);
  y = Math.min(Math.max(y, minY), maxY);
  return [x, y];
}