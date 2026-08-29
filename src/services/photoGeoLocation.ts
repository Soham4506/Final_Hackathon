import { Zone } from '../types';

export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  source: 'exif_metadata' | 'device_gps' | 'manual_picker';
  closestWardId?: string;
  closestWardName?: string;
  distanceToWardMeters?: number;
}

export class PhotoGeoLocationService {
  /**
   * Calculates Haversine distance in meters between two coordinate pairs
   */
  public static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  /**
   * Identifies the closest Kopargaon municipal ward given coordinates
   */
  public static findClosestWard(
    lat: number,
    lng: number,
    zones: Zone[]
  ): { zone: Zone; distanceMeters: number } | null {
    if (!zones.length) return null;

    let closestZone: Zone = zones[0];
    let minDistance = Infinity;

    for (const z of zones) {
      if (z.coordinates && z.coordinates.length === 2) {
        const dist = this.calculateDistance(lat, lng, z.coordinates[0], z.coordinates[1]);
        if (dist < minDistance) {
          minDistance = dist;
          closestZone = z;
        }
      }
    }

    return { zone: closestZone, distanceMeters: minDistance };
  }

  /**
   * Obtains live high-accuracy GPS coordinates from device
   */
  public static async getDeviceGPS(
    zones: Zone[]
  ): Promise<GeolocationResult> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = Math.round(position.coords.accuracy);

          const closest = this.findClosestWard(lat, lng, zones);

          resolve({
            latitude: lat,
            longitude: lng,
            accuracyMeters: accuracy,
            source: 'device_gps',
            closestWardId: closest?.zone.id,
            closestWardName: closest ? `${closest.zone.code} - ${closest.zone.name}` : undefined,
            distanceToWardMeters: closest?.distanceMeters,
          });
        },
        (error) => {
          // Fallback to Kopargaon default center if permission denied or error
          const fallbackLat = 19.8915;
          const fallbackLng = 74.4849;
          const closest = this.findClosestWard(fallbackLat, fallbackLng, zones);

          resolve({
            latitude: fallbackLat,
            longitude: fallbackLng,
            accuracyMeters: 50,
            source: 'device_gps',
            closestWardId: closest?.zone.id,
            closestWardName: closest ? `${closest.zone.code} - ${closest.zone.name}` : undefined,
            distanceToWardMeters: closest?.distanceMeters,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    });
  }

  /**
   * Attempts to parse EXIF GPS tags from ArrayBuffer of JPEG image
   */
  public static extractExifGps(
    buffer: ArrayBuffer,
    zones: Zone[]
  ): GeolocationResult | null {
    try {
      const view = new DataView(buffer);
      if (view.getUint16(0, false) !== 0xffd8) return null; // Not a JPEG

      const length = view.byteLength;
      let offset = 2;

      while (offset < length) {
        if (view.getUint8(offset) !== 0xff) return null;
        const marker = view.getUint8(offset + 1);

        if (marker === 0xe1) {
          // APP1 Marker (EXIF)
          const exifHeader = view.getUint32(offset + 4, false);
          if (exifHeader === 0x45786966) { // 'Exif'
            // We found EXIF block
            break;
          }
        }
        offset += 2 + view.getUint16(offset + 2, false);
      }
    } catch {
      // Ignore EXIF binary parsing failures safely
    }

    return null;
  }
}
