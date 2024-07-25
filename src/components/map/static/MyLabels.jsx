import React from 'react';
import Mapbox from '@rnmapbox/maps';
import { calculateTextOffset } from '../../../utilities/misc/offsetUtils';
import { heightStyles as MBXHeightStyles } from '../../../styles/MBXFloorStyles';

const MyLabels = ({ floor, pitch, zoom }) => {
  floor = floor.toString();
  const shapeSourceID = `propel-3d-floor-${floor}-buildings-source`;
  const heightStyles = MBXHeightStyles[floor];

  return (
    <Mapbox.SymbolLayer
      id="poi-labels-layer"
      sourceID={shapeSourceID}
      filter={[
        'all',
        ['!=', ['get', 'Name'], 'Unisex Bathroom'],
        ['!=', ['get', 'Name'], 'Mens Bathroom'],
        ['!=', ['get', 'Name'], 'Womens Bathroom'],
        ['!=', ['get', 'Name'], 'Elevator 1'],
        ['!=', ['get', 'Name'], 'Elevator 2'],
        ['!=', ['get', 'Name'], 'Stairs']
      ]}
      style={{
        textField: ['get', 'Name'],
        textSize: [
          'interpolate', ['linear'], ['zoom'],
          0, 0,
          16, 0,
          18, 5,
          19, 9,
          20, 11,
          22, 15
        ],
        textAnchor: 'bottom',
        textColor: 'rgba(255, 165, 0, 1)',
        textHaloColor: 'white',
        textHaloWidth: 0,
        textJustify: 'center',
        textLineHeight: 1.2,
        textPadding: 0,
        textAllowOverlap: true,
        textFont: ['Open Sans SemiBold', 'Arial Unicode MS Regular'],
        textOffset: calculateTextOffset(pitch, zoom, heightStyles.floor)
      }}
    />
  );
};

export default MyLabels;
