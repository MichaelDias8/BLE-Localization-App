import React from 'react';
import { Canvas } from '@react-three/fiber';
import { View } from 'react-native';
import { point } from '@turf/helpers';
import { distance, bearing as turfBearing } from '@turf/turf';
import { calculateCameraPosition } from '../utilities/misc/offsetUtils';
import { heightStyles } from '../styles/MBXFloorStyles';

const symbolXY = [-81.276707, 43.008334];

const ThreeJSScene = ({ floor, pitch, zoom, bearing, center }) => {
  // If the zoom, bearing, and center are defined, compute the camera position
  const cameraCoordinates =
    zoom === undefined || bearing === undefined || center === undefined
      ? null
      : calculateCameraPosition(center, zoom, pitch, bearing);

  // If the camera coordinates are null, don't render the scene
  if (cameraCoordinates === null) {
    return null;
  }

  // Get the symbol coordinates in three.js space
  const projectedSymbolCoordinates = [0, heightStyles[floor].floor, 0];

  // Get the camera coordinates in three.js space using relative positions
  const symbolToCamDistance = distance(point([cameraCoordinates.longitude, cameraCoordinates.latitude]), point(symbolXY), {
    units: 'meters',
  });
  const cameraBearing = turfBearing(point(symbolXY), point([cameraCoordinates.longitude, cameraCoordinates.latitude])) * (Math.PI / 180);
  const projectedCameraCoordinates = [
    symbolToCamDistance * Math.sin(cameraBearing),
    cameraCoordinates.altitude,
    -symbolToCamDistance * Math.cos(cameraBearing),
  ];

  // Get the center coordinates in three.js space using relative positions
  const centerToSymbolDistance = distance(point([center[0], center[1]]), point(symbolXY), { units: 'meters' });
  const centerBearing = turfBearing(point(symbolXY), point([center[0], center[1]])) * (Math.PI / 180);
  const projectedCenterCoordinates = [
    centerToSymbolDistance * Math.sin(centerBearing),
    0,
    -centerToSymbolDistance * Math.cos(centerBearing),
  ];

  return (
    <View style={{ flex: 1 }}>
      <Canvas camera={{ position: [90, 120, 90], fov: 67 }}>
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[70, 70]} />
          <meshStandardMaterial color="lightgrey" />
        </mesh>

        {/* Camera Coordinates Cube */}
        {projectedCameraCoordinates && (
          <mesh position={projectedCameraCoordinates}>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="blue" />
          </mesh>
        )}

        {/* Symbol Coordinates Cube */}
        {projectedSymbolCoordinates && (
          <mesh position={projectedSymbolCoordinates}>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="red" />
          </mesh>
        )}

        {/* Center Coordinates Cube */}
        {projectedCenterCoordinates && (
          <mesh position={projectedCenterCoordinates}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="green" />
          </mesh>
        )}
      </Canvas>
    </View>
  );
};

export default ThreeJSScene;
