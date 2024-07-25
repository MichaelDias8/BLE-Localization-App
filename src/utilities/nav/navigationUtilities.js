import { distance } from "mathjs";
import * as turf from "@turf/turf";
const options = { units: 'meters' };      // Options for the turf.distance function

// edges and nodes representing the paths of the map
const rawEdges = {
  'A': ['B'],
  'B': ['A', 'C'],
  'C': ['B', 'D'],
  'D': ['C', 'E'],
  'E': ['D']
};

const rawNodes = {
  'A': [-81.2767507086876, 43.00836611428241,   1],
  'B': [-81.27676274767312, 43.00830924673235,  1],
  'C': [-81.27655981945809, 43.00828065826113,  1],
  'D': [-81.27659406016876, 43.00812846479184,  1],
  'E': [-81.27672566453899, 43.008144545351485, 1]
};

function getNavGraph(rawEdges, rawNodes) {
  const edges = {};
  for (let node in rawEdges) {
    edges[node] = rawEdges[node].map(adjNode => {
      const from = turf.point([rawNodes[node][0], rawNodes[node][1]]);
      const to = turf.point([rawNodes[adjNode][0], rawNodes[adjNode][1]]);
      const distance = turf.distance(from, to, options);
      return [adjNode, distance];
    });
  }

  return { nodes: rawNodes, edges };
}
export const graph = getNavGraph(rawEdges, rawNodes);

export function printGraph(graph) {
  const { nodes, edges } = graph;

  console.log("Nodes:");
  for (let node in nodes) {
      const [x, y, z] = nodes[node];
      console.log(`  ${node}: [x: ${x.toFixed(5)}, y: ${y.toFixed(5)}, z: ${z}]`);
  }

  console.log("\nEdges:");
  for (let node in edges) {
      console.log(`  ${node}:`);
      for (let [adjNode, distance] of edges[node]) {
          console.log(`    -> ${adjNode}: ${distance.toFixed(2)} meters`);
      }
  }
}

export function projectPointOntoLine(px, py, ax, ay, bx, by) {
  let ABx = bx - ax;
  let ABy = by - ay;
  let APx = px - ax;
  let APy = py - ay;
  let AB_AB = ABx * ABx + ABy * ABy;
  if (AB_AB === 0) return { x: ax, y: ay }; 
  let AP_AB = APx * ABx + APy * ABy;
  let t = AP_AB / AB_AB;
  let projX = ax + t * ABx;
  let projY = ay + t * ABy;
  return { x: projX, y: projY, t };
}

export function distanceBetweenPoints(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function findClosestEdge(px, py, edges, nodes) {
  let closestEdge = null;
  let closestPoint = null;
  let minDistance = Infinity;

  for (let node in edges) {
    for (let [adjNode] of edges[node]) {
      const [ax, ay] = nodes[node];
      const [bx, by] = nodes[adjNode];
      const projectedPoint = projectPointOntoLine(px, py, ax, ay, bx, by);
      if (!projectedPoint) continue;

      const distance = distanceBetweenPoints(px, py, projectedPoint.x, projectedPoint.y);

      if (distance < minDistance) {
        minDistance = distance;
        closestEdge = [node, adjNode];
        closestPoint = projectedPoint;
      }
    }
  }

  return { closestEdge, closestPoint };
}

export function calculateUserPositionOnEdge(px, py, edges, nodes) {
  const { closestEdge, closestPoint } = findClosestEdge(px, py, edges, nodes);
  if (!closestEdge) return null;

  const [nodeA, nodeB] = closestEdge;
  const [ax, ay] = nodes[nodeA];
  const [bx, by] = nodes[nodeB];

  const edgeLength = distanceBetweenPoints(ax, ay, bx, by);
  const projectedLength = distanceBetweenPoints(ax, ay, closestPoint.x, closestPoint.y);
  const relativePosition = projectedLength / edgeLength;

  return {
    closestEdge,
    relativePosition,
    coordinates: closestPoint
  };
}