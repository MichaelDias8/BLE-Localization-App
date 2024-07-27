import * as turf from "@turf/turf";

// edges and nodes representing the paths of the map
const rawEdges = {
  '1A': ['1B'],
  '1B': ['1A', '1C'],
  '1C': ['1B', '1D'],
  '1D': ['1C', '1E', '1G'],
  '1E': ['1D', '1F', '1H'],
  '1F': ['1E'],
  '1G': ['1D'],
  '1H': ['1E', '1I'],
  '1I': ['1H', '0F'], 
  '0F': ['1I', '0D'],
  '0D': ['0F', '0E', '0G', '0B'],
  '0E': ['0D'],
  '0G': ['0D'],
  '0B': ['0D', '0C', '0H', '0A'],
  '0C': ['0B'],
  '0H': ['0B'],
  '0A': ['0B'],

  '-1A': ['-1B'],
  '-1B': ['-1A', '-1C', '-1D'],
  '-1C': ['-1B'],
  '-1D': ['-1B', '-1E'],
  '-1E': ['-1D'],
};

export const rawNodes = {
  '1A': [-81.27675070868760, 43.00836611428241, 1],
  '1B': [-81.27676274767312, 43.00830924673235, 1],
  '1C': [-81.27655981945809, 43.00828065826113, 1],
  '1D': [-81.27657947430961, 43.00819524947337, 1],
  '1E': [-81.27659406016876, 43.00812846479184, 1],
  '1F': [-81.27672566453899, 43.00814454535148, 1],
  '1G': [-81.27652649223558, 43.00818869917694, 1],
  '1H': [-81.27657285190436, 43.00812675629294, 1],
  '1I': [-81.27658139721412, 43.00808979599580, 1],
  
  '0F': [-81.27658170475998, 43.00809294293299, 0],
  '0C': [-81.27642741890580, 43.00826073041082, 0],
  '0B': [-81.27653008496200, 43.00827711199176, 0],
  '0H': [-81.27676262374979, 43.00830888482454, 0],
  '0A': [-81.27650310715596, 43.00839074225075, 0],
  '0D': [-81.27657200094637, 43.00812546309180, 0],
  '0E': [-81.27645091484118, 43.00811033944728, 0],
  '0G': [-81.27672207023912, 43.00814558378130, 0],

  '-1A': [-81.31247564073526, 43.01424355221721, -1],       // A -- B -- C
  '-1B': [-81.31241947591816, 43.01424961079752, -1],       //      |     
  '-1C': [-81.31236436141768, 43.01423399050978, -1],       // E -- D
  '-1D': [-81.31239652159375, 43.01416244915117, -1],       
  '-1E': [-81.31244855912128, 43.01415746239405, -1],
};

const nodeNames = {
  'Propel': '1G',
}

function getNavGraph(rawEdges, rawNodes) {
  const edges = {};
  for (let node in rawEdges) {
    edges[node] = rawEdges[node].map(adjNode => {
      const from = turf.point([rawNodes[node][0], rawNodes[node][1]]);
      const to = turf.point([rawNodes[adjNode][0], rawNodes[adjNode][1]]);
      const distance = turf.distance(from, to, { units: 'meters' });
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