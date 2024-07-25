import React from 'react';
import Mapbox from '@rnmapbox/maps';
import { heightStyles as MBXHeightStyles } from '../../../styles/MBXFloorStyles';

const BuildingExtrusions = ({ floor }) => {
  // Determine the shapeSourceID based on the floor
  floor = floor.toString();
  let shapeSourceID = `propel-3d-floor-${floor}-buildings-source`;
  let heightStyles = MBXHeightStyles[floor];

  return (
    <>
      {/* Building Extrusion Layers */}
      <Mapbox.FillExtrusionLayer
        id="indoor-walls-extrusion"
        sourceID={shapeSourceID}
        belowLayerID='poi-labels-layer'
        filter={['any', ['==', ['get', 'Type'], 'Indoor Wall'], ['==', ['get', 'Type'], 'Inaccessible']]}
        style={{
          'fillExtrusionColor': 'hsl(41, 36%, 91%)',
          'fillExtrusionHeight': heightStyles.indoorWalls,
          'fillExtrusionBase': heightStyles.base,
          'fillExtrusionOpacity': 0.93
        }}
      />
      <Mapbox.FillExtrusionLayer
        id="street-buildings-3d"
        sourceID='composite'
        belowLayerID='indoor-walls-extrusion'
        sourceLayerID='building'
        style={{
          'fillExtrusionColor': 'hsl(41, 36%, 91%)',
          'fillExtrusionHeight': heightStyles.streetBuildings,
          'fillExtrusionBase': heightStyles.base,
          'fillExtrusionOpacity': 1
        }}
      />
      <Mapbox.FillExtrusionLayer
        id="glass-walls-extrusion"
        sourceID={shapeSourceID}
        belowLayerID='indoor-walls-extrusion'
        filter={['==', ['get', 'Type'], 'Glass Wall']}
        style={{
          'fillExtrusionColor': 'hsl(174, 100%, 88%)',
          'fillExtrusionHeight': heightStyles.indoorWalls,
          'fillExtrusionBase': heightStyles.base,
          'fillExtrusionOpacity': 0.7
        }}
      />
      <Mapbox.FillExtrusionLayer
        id="stairwell-extrusion"
        sourceID={shapeSourceID}
        belowLayerID='indoor-walls-extrusion'
        filter={['match', ['get', 'Type'], ['Stairwell'], true, false]}
        style={{
          'fillExtrusionColor': 'hsl(116, 21%, 50%)',
          'fillExtrusionHeight': heightStyles.roomFloor,
          'fillExtrusionBase': heightStyles.base,
          'fillExtrusionOpacity': 0.91
        }}
      />
      <Mapbox.FillExtrusionLayer
        id="elevator-extrusion"
        sourceID={shapeSourceID}
        belowLayerID='stairwell-extrusion'
        filter={['match', ['get', 'Type'], ['Elevator'], true, false]}
        style={{
          'fillExtrusionColor': 'hsl(319, 77%, 1%)',
          'fillExtrusionHeight': heightStyles.indoorWalls + 0.1,
          'fillExtrusionBase': heightStyles.base,
          'fillExtrusionOpacity': 0.80
        }}
      />
      <Mapbox.FillExtrusionLayer
        id="bathroom-extrusion"
        sourceID={shapeSourceID}
        belowLayerID='elevator-extrusion'
        filter={['match', ['get', 'Type'], ['Bathroom'], true, false]}
        style={{
          'fillExtrusionColor': 'hsl(182, 68%, 46%)',
          'fillExtrusionHeight': heightStyles.roomFloor,
          'fillExtrusionBase': heightStyles.base
        }}
      />
      <Mapbox.FillExtrusionLayer
        id="my-rooms-extrusion"
        sourceID={shapeSourceID}
        belowLayerID='bathroom-extrusion'
        filter={['match', ['get', 'Type'], ['Room'], true, false]}
        style={{
          'fillExtrusionColor': 'hsl(34, 27%, 81%)',
          'fillExtrusionHeight': heightStyles.roomFloor,
          'fillExtrusionBase': heightStyles.base
        }}
      />
      <Mapbox.FillExtrusionLayer
        id="open-rooms-extrusion"
        sourceID={shapeSourceID}
        belowLayerID='poi-labels-layer'
        filter={['match', ['get', 'Type'], ['Open Room'], true, false]}
        style={{
          'fillExtrusionColor': 'hsl(318, 13%, 58%)',
          'fillExtrusionHeight': heightStyles.openRoomFloor,
          'fillExtrusionOpacity': 0.86,
          'fillExtrusionBase': heightStyles.base,
        }}
      />
      <Mapbox.FillExtrusionLayer
        id="outer-walls-extrusion"
        sourceID={shapeSourceID}
        belowLayerID='open-rooms-extrusion'
        filter={['match', ['get', 'Type'], ['Outer Wall'], true, false]}
        style={{
          'fillExtrusionColor': 'hsl(41, 36%, 91%)',
          'fillExtrusionHeight': heightStyles.outerWalls,
          'fillExtrusionBase': heightStyles.base,
        }}
      />
    </>
  );
};

export default BuildingExtrusions;
