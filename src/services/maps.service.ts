import axios from 'axios';

export interface DistanceResult {
  distanceMeters: number;
  distanceKm:     number;
  durationSeconds: number;
  durationText:   string;
  distanceText:   string;
  originAddress:  string;
  destAddress:    string;
}

export async function getDistance(
  originLat: number, originLng: number,
  destLat:   number, destLng:   number
): Promise<DistanceResult> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY tidak dikonfigurasi');

  const { data } = await axios.get(
    'https://maps.googleapis.com/maps/api/distancematrix/json',
    {
      params: {
        origins:      `${originLat},${originLng}`,
        destinations: `${destLat},${destLng}`,
        mode:         'driving',
        region:       'id',
        language:     'id',
        key,
      },
    }
  );

  if (data.status !== 'OK') {
    throw new Error(`Distance Matrix API error: ${data.status}`);
  }

  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK') {
    throw new Error('Rute tidak ditemukan antara dua titik yang diberikan');
  }

  return {
    distanceMeters:  element.distance.value,
    distanceKm:      +(element.distance.value / 1000).toFixed(2),
    durationSeconds: element.duration.value,
    durationText:    element.duration.text,
    distanceText:    element.distance.text,
    originAddress:   data.origin_addresses?.[0] || `${originLat},${originLng}`,
    destAddress:     data.destination_addresses?.[0] || `${destLat},${destLng}`,
  };
}
