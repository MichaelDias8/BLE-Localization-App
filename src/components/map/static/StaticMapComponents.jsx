import React from 'react';
import Mapbox from '@rnmapbox/maps';
import propel3DFloor1Buildings from '../../../assets/maps/SSB_F1_Buildings.json';
import propel3DFloor0Buildings from '../../../assets/maps/SSB_F0_Buildings.json';
import propel3DFloorNeg1Buildings from '../../../assets/maps/SSB_F0_Buildings.json';
import propel3DFloor1Icons from '../../../assets/maps/SSB_Floor_1_Icons.json';
import MyLabels from './MyLabels';
import MyIcons from './MyIcons';
import StreetLabels from './StreetLabels';
import BuildingExtrusions from './BuildingExtrusions';

const StaticMapComponents = ({ floor, pitch, bearing, zoom, center}) => {
  return (
    <>
      <Mapbox.Light style={{ anchor: 'viewport', intensity: 0.25 }} />
      
      { /* Icon Sources */ }
      <Mapbox.ShapeSource id="propel-3d-floor-1-icons-source" shape={propel3DFloor1Icons} />
      { /* Building Sources */ }
      <Mapbox.ShapeSource id="propel-3d-floor-1-buildings-source" shape={propel3DFloor1Buildings} />
      <Mapbox.ShapeSource id="propel-3d-floor-0-buildings-source" shape={propel3DFloor0Buildings} />
      <Mapbox.ShapeSource id="propel-3d-floor--1-buildings-source" shape={propel3DFloorNeg1Buildings} />


      { /* Icons and Labels */ }
      <MyLabels floor={floor} pitch={pitch} zoom={zoom} />
      {/*<StreetLabels floor={floor} pitch={pitch} bearing={bearing} zoom={zoom} center={center} />*/}
      <MyIcons floor={floor} pitch={pitch} bearing={bearing} zoom={zoom} center={center} />

      {/* Building Extrusions */}
      <BuildingExtrusions floor={floor} />
    </>
  );
};

export default StaticMapComponents;