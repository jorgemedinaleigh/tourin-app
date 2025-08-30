import * as Location from "expo-location"
import { useEffect, useState } from "react"
import { MapView, Camera, UserLocation } from "@maplibre/maplibre-react-native"
import ThemedView from "../../components/ThemedView"
import mapStyle from "../../constants/positronTourin.json"

const mapa = () => {

  const [coord, setCoord] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const last = await Location.getLastKnownPositionAsync();
        if (last) setCoord([last.coords.longitude, last.coords.latitude]);
      }
    })();
  }, []);

  return (
    <ThemedView style={{ flex: 1 }} safe>
      <MapView 
        style={{ flex: 1 }}
        mapStyle={mapStyle}
        onMapReady={() => console.log("Map is ready")}
        onDidFinishLoadingStyle={() => console.log("Style loaded")}
      >
        <UserLocation visible />
        <Camera 
          centerCoordinate={coord ?? [-70.6506, -33.4372]} 
          zoomLevel={coord ? 14 : 3} 
        />
      </MapView>
    </ThemedView>
  )
}

export default mapa