import React, { useMemo } from 'react';
import Mapbox, { Images } from '@rnmapbox/maps';
import { calculateIconTranslation, calculateCameraPosition } from '../../../utilities/misc/offsetUtils';
import unisexRestroomIcon from '../../../assets/icons/unisex-restroom-icon.png';
import mensRestroomIcon from '../../../assets/icons/mens-restroom-icon.png';
import womensRestroomIcon from '../../../assets/icons/womens-restroom-icon.png';
import elevatorIcon from '../../../assets/icons/elevator-icon.png';
import staircaseIcon from '../../../assets/icons/stairs-icon.png';
import { heightStyles as MBXHeightStyles } from '../../../styles/MBXFloorStyles';
import iconData from '../../../assets/maps/SSB_Floor_1_Icons.json';

const iconSizeOptions = [
  'interpolate', ['exponential', 10], ['zoom'],
  0, 0,
  16, 0.005,
  17, 0.01,
  18, 0.02,
  19, 0.04,
  20, 0.08,
  21, 0.16,
  22, 0.32
];

const iconImages = {
  'Unisex Bathroom': 'unisexRestroomIcon',
  'Mens Bathroom': 'mensRestroomIcon',
  'Womens Bathroom': 'womensRestroomIcon',
  'Elevator': 'elevatorIcon',
  'Stairs': 'staircaseIcon'
};

const MyIcons = ({ floor, pitch, zoom, bearing, center }) => {
  floor = floor.toString();
  const shapeSourceID = `propel-3d-floor-1-icons-source`;
  const heightStyles = MBXHeightStyles[floor];

  const cameraCoordinates = useMemo(() => {
    const coordinates = calculateCameraPosition(center, zoom, pitch, bearing);
    return coordinates;
  }, [center, zoom, pitch]);

  return (
    <>
      <Images images={{ unisexRestroomIcon, mensRestroomIcon, womensRestroomIcon, elevatorIcon, staircaseIcon }} />

      {iconData.features.map((feature, index) => {
        const { Name, Long, Lat } = feature.properties;
        const symbolCoordinates = {
          altitude: heightStyles.floor,
          longitude: Long,
          latitude: Lat
        };

        const iconImage = iconImages[Name];

        return (
          <React.Fragment key={index}>
            <Mapbox.SymbolLayer
              id={`${Name.toLowerCase().replace(/\s/g, '-')}-icon-layer-${index}`}
              sourceID={shapeSourceID}
              filter={['all', 
                ['==', ['get', 'Name'], Name], 
                ['==', ['get', 'Long'], Long],
                ['==', ['get', 'Lat'], Lat]
              ]}
              style={{
                iconImage: iconImage,
                iconAnchor: 'bottom',
                iconTranslateAnchor: 'map',
                iconTranslate: calculateIconTranslation(zoom, pitch, cameraCoordinates, symbolCoordinates),
                iconSize: iconSizeOptions
              }}
            />
          </React.Fragment>
        );
      })}
    </>
  );
};

export default MyIcons;
