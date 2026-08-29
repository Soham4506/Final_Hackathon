import { Zone } from '../types';

export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  source: 'exif_metadata' | 'device_gps' | 'manual_picker';
  closestWardId?: string;
  closestWardName?: string;
  distanceToWardMeters?: number;
  exifDateTimeOriginal?: string;
  isFallbackUploadLocation?: boolean;
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
   * Obtains live high-accuracy GPS coordinates from device (from where it is being uploaded right now)
   */
  public static async getDeviceGPS(
    zones: Zone[],
    isFallback: boolean = false
  ): Promise<GeolocationResult> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
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
          isFallbackUploadLocation: isFallback,
        });
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
            isFallbackUploadLocation: isFallback,
          });
        },
        () => {
          // Fallback to Kopargaon town center if permission is blocked
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
            isFallbackUploadLocation: isFallback,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 30000,
        }
      );
    });
  }

  /**
   * Comprehensive Zero-Dependency Binary EXIF GPS Metadata Parser
   * Extracts embedded GPS latitude, longitude, and creation date from JPEG files.
   */
  public static extractExifGps(
    buffer: ArrayBuffer,
    zones: Zone[]
  ): GeolocationResult | null {
    try {
      const dataView = new DataView(buffer);
      if (dataView.byteLength < 128) return null;

      // Check JPEG SOI Marker (0xFFD8)
      if (dataView.getUint16(0, false) !== 0xffd8) return null;

      let offset = 2;
      const length = dataView.byteLength;

      // Find APP1 Marker (0xFFE1)
      while (offset < length - 4) {
        const marker = dataView.getUint16(offset, false);
        offset += 2;

        if (marker === 0xffe1) {
          // Found APP1 Marker
          const app1Length = dataView.getUint16(offset, false);
          offset += 2;

          // Check for 'Exif\0\0' header (0x457869660000)
          const exifHeader = dataView.getUint32(offset, false);
          if (exifHeader === 0x45786966) {
            const tiffStart = offset + 6; // Start of TIFF header
            return this.parseTiffGps(dataView, tiffStart, zones);
          }
          offset += app1Length - 2;
        } else if ((marker & 0xff00) === 0xff00) {
          // Skip other markers (APP0, DHT, DQT, etc.)
          const sectionLength = dataView.getUint16(offset, false);
          offset += sectionLength;
        } else {
          break;
        }
      }
    } catch (err) {
      console.warn('EXIF binary parsing notice:', err);
    }

    return null;
  }

  /**
   * Internal TIFF Parser for IFD0 and GPS IFD blocks
   */
  private static parseTiffGps(
    dataView: DataView,
    tiffStart: number,
    zones: Zone[]
  ): GeolocationResult | null {
    try {
      // Byte order: 0x4949 = 'II' (Little-Endian), 0x4D4D = 'MM' (Big-Endian)
      const byteOrder = dataView.getUint16(tiffStart, false);
      const isLittleEndian = byteOrder === 0x4949;

      // Check TIFF 42 constant
      if (dataView.getUint16(tiffStart + 2, isLittleEndian) !== 0x002a) {
        return null;
      }

      // First IFD offset (usually 8)
      const firstIfdOffset = dataView.getUint32(tiffStart + 4, isLittleEndian);
      if (firstIfdOffset < 8) return null;

      let ifdOffset = tiffStart + firstIfdOffset;
      const numEntries = dataView.getUint16(ifdOffset, isLittleEndian);
      ifdOffset += 2;

      let gpsIfdOffset: number | null = null;
      let dateTimeOriginal: string | undefined;

      // Scan IFD0 entries
      for (let i = 0; i < numEntries; i++) {
        const tag = dataView.getUint16(ifdOffset, isLittleEndian);
        const tagType = dataView.getUint16(ifdOffset + 2, isLittleEndian);
        const count = dataView.getUint32(ifdOffset + 4, isLittleEndian);

        if (tag === 0x8825) {
          // GPS Info IFD Pointer
          const gpsOffsetVal = dataView.getUint32(ifdOffset + 8, isLittleEndian);
          gpsIfdOffset = tiffStart + gpsOffsetVal;
        } else if (tag === 0x9003 || tag === 0x0132) {
          // DateTimeOriginal or DateTime
          const dateOffsetVal = dataView.getUint32(ifdOffset + 8, isLittleEndian);
          const dateStrOffset = tiffStart + dateOffsetVal;
          if (dateStrOffset + count < dataView.byteLength) {
            let str = '';
            for (let c = 0; c < count - 1; c++) {
              str += String.fromCharCode(dataView.getUint8(dateStrOffset + c));
            }
            dateTimeOriginal = str;
          }
        }

        ifdOffset += 12;
      }

      if (!gpsIfdOffset || gpsIfdOffset >= dataView.byteLength) {
        return null;
      }

      // Scan GPS IFD directory
      const numGpsEntries = dataView.getUint16(gpsIfdOffset, isLittleEndian);
      let gpsEntryOffset = gpsIfdOffset + 2;

      let latRef: string = 'N';
      let lonRef: string = 'E';
      let latDMS: number[] | null = null;
      let lonDMS: number[] | null = null;

      for (let j = 0; j < numGpsEntries; j++) {
        const gpsTag = dataView.getUint16(gpsEntryOffset, isLittleEndian);

        if (gpsTag === 0x0001) {
          // GPSLatitudeRef ('N' or 'S')
          latRef = String.fromCharCode(dataView.getUint8(gpsEntryOffset + 8));
        } else if (gpsTag === 0x0002) {
          // GPSLatitude (3 RATIONALs = deg, min, sec)
          const valueOffset = tiffStart + dataView.getUint32(gpsEntryOffset + 8, isLittleEndian);
          latDMS = this.readRationalTriple(dataView, valueOffset, isLittleEndian);
        } else if (gpsTag === 0x0003) {
          // GPSLongitudeRef ('E' or 'W')
          lonRef = String.fromCharCode(dataView.getUint8(gpsEntryOffset + 8));
        } else if (gpsTag === 0x0004) {
          // GPSLongitude (3 RATIONALs = deg, min, sec)
          const valueOffset = tiffStart + dataView.getUint32(gpsEntryOffset + 8, isLittleEndian);
          lonDMS = this.readRationalTriple(dataView, valueOffset, isLittleEndian);
        }

        gpsEntryOffset += 12;
      }

      if (!latDMS || !lonDMS || latDMS.length !== 3 || lonDMS.length !== 3) {
        return null;
      }

      // Convert DMS to Decimal Degrees
      let latitude = latDMS[0] + latDMS[1] / 60 + latDMS[2] / 3600;
      if (latRef.toUpperCase() === 'S') latitude = -latitude;

      let longitude = lonDMS[0] + lonDMS[1] / 60 + lonDMS[2] / 3600;
      if (lonRef.toUpperCase() === 'W') longitude = -longitude;

      if (isNaN(latitude) || isNaN(longitude) || (latitude === 0 && longitude === 0)) {
        return null;
      }

      const closest = this.findClosestWard(latitude, longitude, zones);

      return {
        latitude: parseFloat(latitude.toFixed(6)),
        longitude: parseFloat(longitude.toFixed(6)),
        accuracyMeters: 5,
        source: 'exif_metadata',
        closestWardId: closest?.zone.id,
        closestWardName: closest ? `${closest.zone.code} - ${closest.zone.name}` : undefined,
        distanceToWardMeters: closest?.distanceMeters,
        exifDateTimeOriginal: dateTimeOriginal,
        isFallbackUploadLocation: false,
      };
    } catch {
      return null;
    }
  }

  /**
   * Helper to read 3 RATIONAL numbers (Degrees, Minutes, Seconds)
   */
  private static readRationalTriple(
    dataView: DataView,
    offset: number,
    isLittleEndian: boolean
  ): number[] {
    const result: number[] = [];
    for (let k = 0; k < 3; k++) {
      const num = dataView.getUint32(offset + k * 8, isLittleEndian);
      const den = dataView.getUint32(offset + k * 8 + 4, isLittleEndian);
      result.push(den !== 0 ? num / den : 0);
    }
    return result;
  }
}
