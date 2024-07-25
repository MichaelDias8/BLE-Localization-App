import React from 'react';
import Mapbox from '@rnmapbox/maps';
import { calculateTextOffset, calculateIconTranslation} from '../../../utilities/misc/offsetUtils';
import { heightStyles as MBXHeightStyles } from '../../../styles/MBXFloorStyles';

const StreetLabels = ({ floor, pitch, bearing, zoom, center }) => {
  floor = floor.toString();
  const heightStyles = MBXHeightStyles[floor];

  return (
    <Mapbox.SymbolLayer
      id="street-poi-labels-layer"
      sourceID='composite'
      sourceLayerID='poi_label'
      filter={[
        'all',
        ['<=', ['get', 'filterrank'], ['+', ['step', ['zoom'], 0, 16, 1, 17, 2], 3]],
        ['step', ['pitch'], true, 50, ['<', ['distance-from-center'], 2], 60, ['<', ['distance-from-center'], 2.5], 70, ['<', ['distance-from-center'], 3]]
      ]}
      style={{
        textField: ['coalesce', ['get', 'name_en'], ['get', 'name']],
        textSize: [
          'step', ['zoom'],
          ['step', ['get', 'sizerank'], 25.2, 5, 16.8],
          17,
          ['step', ['get', 'sizerank'], 25.2, 13, 16.8]
        ],
        textAnchor: [
          'step', ['zoom'],
          ['step', ['get', 'sizerank'], 'center', 5, 'top'],
          17,
          ['step', ['get', 'sizerank'], 'center', 13, 'top']
        ],
        textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        textColor: [
          'match', ['get', 'class'],
          'food_and_drink', 'hsl(40, 95%, 43%)',
          'park_like', 'hsl(110, 70%, 28%)',
          'education', 'hsl(30, 50%, 43%)',
          'medical', 'hsl(0, 70%, 58%)',
          'sport_and_leisure', 'hsl(190, 60%, 48%)',
          ['store_like', 'food_and_drink_stores'], 'hsl(210, 70%, 58%)',
          ['commercial_services', 'motorist', 'lodging'], 'hsl(260, 70%, 63%)',
          ['arts_and_entertainment', 'historic', 'landmark'], 'hsl(320, 70%, 63%)',
          'hsl(210, 20%, 46%)'
        ],
        textHaloColor: 'hsl(20, 20%, 100%)',
        textHaloWidth: 0.5,
        textHaloBlur: 0.5,
        textOffset: calculateTextOffset(pitch, zoom, heightStyles.floor),
        iconImage: [
          'case',
          ['has', 'maki_beta'],
          ['coalesce', ['image', ['get', 'maki_beta']], ['image', ['get', 'maki']]],
          ['image', ['get', 'maki']]
        ],
        iconOpacity: [
          'step', ['zoom'],
          ['step', ['get', 'sizerank'], 0, 5, 1],
          17,
          ['step', ['get', 'sizerank'], 0, 13, 1]
        ],
        iconTranslate: calculateIconTranslation(pitch, zoom, heightStyles.floor, bearing, center)
      }}
    />
  );
};

export default StreetLabels;