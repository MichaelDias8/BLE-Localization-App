import React, { useEffect, useState } from 'react';
import Mapbox from '@rnmapbox/maps';
import { point, lineString } from '@turf/helpers';
import { getCoords, bearing, destination } from '@turf/turf';
import { rawNodes, rawEdges } from '../../../utilities/nav/navigationUtilities';

const GraphEdges = ({ floor }) => {
  const [lines, setLines] = useState([]);

  useEffect(() => {
    const width = 0.00025; // Adjust width to make the line thicker
    const extensionLength = width / 2.3;
    const newLines = [];

    for (let startNodeId in rawEdges) {
      const startNode = rawNodes[startNodeId];
      if (startNode[2] !== floor) continue; // Skip nodes that are not on the current floor

      rawEdges[startNodeId].forEach(endNodeId => {
        const endNode = rawNodes[endNodeId];
        if (endNode[2] !== floor) return; // Skip edges to nodes that are not on the current floor

        let start = startNode.slice(0, 2);
        let end = endNode.slice(0, 2);

        // Extend the start and end points
        const line = lineString([start, end]);
        const lineBearing = bearing(point(start), point(end));

        start = getCoords(destination(point(start), -extensionLength, lineBearing));
        end = getCoords(destination(point(end), extensionLength, lineBearing));

        const leftStart = getCoords(destination(point(start), width / 2, lineBearing - 90));
        const rightStart = getCoords(destination(point(start), width / 2, lineBearing + 90));
        const leftEnd = getCoords(destination(point(end), width / 2, lineBearing - 90));
        const rightEnd = getCoords(destination(point(end), width / 2, lineBearing + 90));

        newLines.push({
          coordinates: [leftStart, rightStart, rightEnd, leftEnd, leftStart],
          color: '#FF0000' // Default color for edges
        });
      });
    }

    setLines(newLines);
  }, [floor]);

  const featureCollection = {
    type: 'FeatureCollection',
    features: lines.map((line, index) => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [line.coordinates]
      },
      properties: {
        id: `line${index}`,
        color: line.color
      }
    }))
  };

  return (
    <>
      <Mapbox.ShapeSource id="linesSource" shape={featureCollection}>
        <Mapbox.FillExtrusionLayer
          id="linesLayer"
          sourceID="linesSource"
          style={{
            fillExtrusionColor: "#dd0000",
            fillExtrusionOpacity: 1,
            fillExtrusionHeight: 0.1,
            fillExtrusionBase: 0,
          }}
        />
      </Mapbox.ShapeSource>
    </>
  );
};

export default GraphEdges;
