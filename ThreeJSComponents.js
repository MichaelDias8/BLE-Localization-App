import React, { useState, useEffect, useRef, useLayoutEffect, useMemo} from 'react';
import { Asset } from 'expo-asset';
import * as THREE from "three";
import gridImage from './grid.png';
import { Plane } from '@react-three/drei';
import { useThree, useFrame, Canvas, useUpdate } from '@react-three/fiber'

const cameraPosition = [1, 1, 1]; // Original camera position

//@param rotation - quaternion representing the phones rotation. - { x: 0, y: 0, z: 0, w: 0 }
export const PhoneDirectionCanvas = ({ position, rotation }) => {
  // Convert rotation to format expected by Three.js
  rotation = {x: rotation.x, y: rotation.z, z: rotation.y, w: rotation.w};
  
  // Compute the forward, right, and down directions as Vector3d using the rotation quaternion
  var outDirection = new THREE.Vector3(0, 0, -1);
  var upDirection = new THREE.Vector3(0, 1, 0);

  outDirection = outDirection.applyQuaternion(rotation);
  upDirection = upDirection.applyQuaternion(rotation);
  
  return (
    <>
    <Canvas> 
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <CameraController />
      <ThreePlanes />
      <PhoneRectangle position={position} rotation={rotation} />
      <ArrowHelper dir={outDirection} origin={position} length={1} color={'red'} />
      <ArrowHelper dir={upDirection} origin={position} length={1} color={'green'} />
    </Canvas>
    </>
  );
};

export const PhoneRectangle = ({ position, rotation }) => {
  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.quaternion.copy(rotation);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.66, 1, 0.1]} />
      <meshStandardMaterial color={'#CCCCCC'} />
    </mesh>
  );
};

export function CameraController() {
  const { camera, scene } = useThree();

  useEffect(() => {
    // Angle of rotation in radians (90 degrees converted to radians)
    const angle = Math.PI / 2;

    // Original camera position
    const originalPosition = new THREE.Vector3(...cameraPosition);

    // Calculate new camera position after rotation
    const newPosition = new THREE.Vector3(
      originalPosition.x * Math.cos(angle) - originalPosition.z * Math.sin(angle),
      originalPosition.y, // Keep the same height
      originalPosition.x * Math.sin(angle) + originalPosition.z * Math.cos(angle)
    );

    // Apply new position to camera
    camera.position.set(newPosition.x, newPosition.y, newPosition.z);

    // Assuming the PhoneRectangle is at the origin or its position is stored in `position`
    // If the PhoneRectangle is not at the origin, replace `scene.position` with its position
    camera.lookAt(scene.position); 

    // This will re-render the scene from the new camera perspective
  }, [camera, scene]);

  return null; // This component does not render anything itself
}

export function ThreePlanes() {
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    const loadTextureAsync = async () => {
      const asset = Asset.fromModule(gridImage);
      await asset.downloadAsync(); // Ensures the image is downloaded

      const loader = new THREE.TextureLoader();
      const loadedTexture = loader.load(asset.localUri); // Uses the localUri from the downloaded asset
      loadedTexture.wrapS = THREE.RepeatWrapping;
      loadedTexture.wrapT = THREE.RepeatWrapping;
      loadedTexture.repeat.set(4, 4); 
      setTexture(loadedTexture); // Update the state with the loaded texture
    };

    loadTextureAsync();
  }, []);

  if (!texture) return null; // If the texture is not loaded, do not render anything

  return (
    <>
      {/* Right Plane */}
      <Plane args={[2, 2]} position={[0, 0, -1]}>
        <meshStandardMaterial attach="material" map={texture} side={THREE.DoubleSide} />
      </Plane>
      {/* Left Plane */}
      <Plane args={[2, 2]} rotation={[0, Math.PI / 2, 0]} position={[1, 0, 0]}>
        <meshStandardMaterial attach="material" map={texture} side={THREE.DoubleSide} />
      </Plane>
      {/* Bottom Plane */}
      <Plane args={[2, 2]} rotation={[Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <meshStandardMaterial attach="material" map={texture} side={THREE.DoubleSide} />
      </Plane>
    </>
  );
}

const ArrowHelper = ({ dir, origin, length, color }) => {
  const { scene } = useThree(); // Access the Three.js scene object

  // useMemo hook to create the arrow helper only when necessary
  const arrowHelper = useMemo(() => {
    const direction = new THREE.Vector3(dir.x, dir.y, dir.z); // Ensure dir is a Vector3
    const originVector = new THREE.Vector3(origin.x, origin.y, origin.z); // Ensure origin is a Vector3
    const arrowColor = new THREE.Color(color); // Color can be a string or a Three.js Color
    const arrow = new THREE.ArrowHelper(direction.normalize(), originVector, length, arrowColor);
    return arrow;
  }, [dir, origin, length, color]); // Recreate the arrow helper if any of these props change

  // useEffect hook to add the arrow helper to the scene when component mounts and remove it on unmount
  useEffect(() => {
    scene.add(arrowHelper); // Add the arrow helper to the scene
    return () => {
      scene.remove(arrowHelper); // Remove the arrow helper from the scene on component unmount
    };
  }, [arrowHelper, scene]); // Depend on arrowHelper and scene to manage the lifecycle

  return null; // This component does not render JSX elements directly
};

const DataPointVisualizer = ({ dataPoints }) => {
  // Scale each data point to fit within the scene
  dataPoints.forEach(point => {
    point.x *= 0.5;
    point.y *= 0.5;
    point.z *= 0.5;
  });

  const { scene } = useThree(); // Use the Three.js scene from React Three Fiber

  // This effect will run whenever the dataPoints array changes
  React.useEffect(() => {
    // First, clear existing datapoints to avoid duplicates
    // This simplistic approach might not be the most efficient for large datasets or dynamic updates
    scene.children = scene.children.filter(child => child.name !== 'datapoint');

    dataPoints.forEach(point => {
      // Create a geometry and material for each point
      const geometry = new THREE.SphereGeometry(0.05, 32, 32);
      const material = new THREE.MeshBasicMaterial({ color: new THREE.Color('skyblue') });
      const mesh = new THREE.Mesh(geometry, material);
      
      // Set the position of the mesh based on the data point
      mesh.position.set(point.x, point.y, point.z);
      mesh.name = 'datapoint'; // Naming the mesh for easy identification

      // Add the mesh to the scene
      scene.add(mesh);
    });

    // This cleanup function is called when the component unmounts or before the effect runs again
    return () => {
      // Remove the datapoint meshes from the scene
      scene.children = scene.children.filter(child => child.name !== 'datapoint');
    };
  }, [dataPoints, scene]);

  return null; // This component does not render anything directly
};