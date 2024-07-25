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

const getNumbersFromFloat = (floatNum) => floatNum.toString().split('.')[1]?.substring(2, 5) || '';

const MyIcons = ({ floor, pitch, zoom, bearing, center }) => {
  floor = floor.toString();
  const shapeSourceID = `propel-3d-floor-1-icons-source`;
  const heightStyles = MBXHeightStyles[floor];

  const cameraCoordinates = useMemo(() => {
    const coordinates = calculateCameraPosition(center, zoom, pitch, bearing);
    return coordinates;
  }, [center, zoom, pitch]);

  const cameraPolygon = useMemo(() => ({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [cameraCoordinates.longitude - 0.000015, cameraCoordinates.latitude - 0.00001],
            [cameraCoordinates.longitude + 0.000015, cameraCoordinates.latitude - 0.00001],
            [cameraCoordinates.longitude + 0.000015, cameraCoordinates.latitude + 0.00001],
            [cameraCoordinates.longitude - 0.000015, cameraCoordinates.latitude + 0.00001],
            [cameraCoordinates.longitude - 0.000015, cameraCoordinates.latitude - 0.00001]
          ]]
        },
        properties: {}
      }
    ]
  }), [cameraCoordinates]);

  return (
    <>
      <Images images={{ unisexRestroomIcon, mensRestroomIcon, womensRestroomIcon, elevatorIcon, staircaseIcon }} />

      {iconData.features.map((feature, index) => {
        const { Name } = feature.properties;
        const symbolCoordinates = {
          altitude: heightStyles.floor,
          longitude: feature.geometry.coordinates[0],
          latitude: feature.geometry.coordinates[1]
        };

        const iconImage = iconImages[Name];

        const symbolPolygon = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [symbolCoordinates.longitude - 0.00001, symbolCoordinates.latitude - 0.00001],
                  [symbolCoordinates.longitude + 0.00001, symbolCoordinates.latitude - 0.00001],
                  [symbolCoordinates.longitude + 0.00001, symbolCoordinates.latitude + 0.00001],
                  [symbolCoordinates.longitude - 0.00001, symbolCoordinates.latitude + 0.00001],
                  [symbolCoordinates.longitude - 0.00001, symbolCoordinates.latitude - 0.00001]
                ]]
              },
              properties: {}
            }
          ]
        };

        return (
          <React.Fragment key={index}>
            <Mapbox.SymbolLayer
              id={`${Name.toLowerCase().replace(/\s/g, '-')}-icon-layer-${index}`}
              sourceID={shapeSourceID}
              filter={['==', ['get', 'Name'], Name]}
              style={{
                iconImage: iconImage,
                iconAnchor: 'bottom',
                iconTranslateAnchor: 'map',
                iconTranslate: calculateIconTranslation(zoom, pitch, cameraCoordinates, symbolCoordinates),
                iconSize: iconSizeOptions
              }}
            />
            <Mapbox.ShapeSource id={`symbol-polygon-source-${index}`} shape={symbolPolygon}>
              <Mapbox.FillExtrusionLayer
                id={`symbol-polygon-layer-${index}`}
                style={{
                  fillExtrusionColor: 'blue',
                  fillExtrusionHeight: symbolCoordinates.altitude,
                  fillExtrusionBase: 0,
                  fillExtrusionOpacity: 0.5
                }}
              />
            </Mapbox.ShapeSource>
          </React.Fragment>
        );
      })}

      <Mapbox.ShapeSource id="camera-position-source" shape={cameraPolygon}>
        <Mapbox.FillExtrusionLayer
          id="camera-position-layer"
          style={{
            fillExtrusionColor: 'red',
            fillExtrusionHeight: cameraCoordinates.altitude + 2,
            fillExtrusionBase: cameraCoordinates.altitude - 2,
            fillExtrusionOpacity: 0.5
          }}
        />
      </Mapbox.ShapeSource>
    </>
  );
};

export default MyIcons;
