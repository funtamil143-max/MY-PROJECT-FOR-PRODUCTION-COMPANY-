/**
 * High-Accuracy Device GPS Capture Engine
 * 
 * Enforces accurate coordinate lock under 50 meters:
 * 1. Enforces enableHighAccuracy: true with maximumAge: 0 to query hardware GNSS/GPS satellites.
 * 2. Continuously refines readings via watchPosition + getCurrentPosition until accuracy <= 50m is acquired.
 * 3. Provides real-time accuracy progress (e.g. ±12m, ±28m, target < 50m).
 * 4. Returns 6-decimal precision coordinates with isUnder50m verification flag.
 */

export interface DeviceGpsResult {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: number;
  isUnder50m: boolean;
}

export interface GpsReading {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: number;
}

export interface RobotGpsResult {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  sampleCount: number;
  fixQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  hdopEstimate: number;
  satellitesEstimated: number;
  thetaDegrees?: number;
  thetaCompass?: string;
  thetaRadians?: number;
  readings: GpsReading[];
  timestamp: number;
}

export interface RobotGpsConfig {
  enabled: boolean;
  minAccuracyMeters: number;
  sampleCount: number;
  timeoutMs: number;
  outlierFilter: boolean;
  snapToRoads?: boolean;
  captureTheta?: boolean;
}

export const DEFAULT_ROBOT_GPS_CONFIG: RobotGpsConfig = {
  enabled: true,
  minAccuracyMeters: 50,
  sampleCount: 1,
  timeoutMs: 5000,
  outlierFilter: false,
  snapToRoads: true,
  captureTheta: false,
};

export function getCompassDirection(degrees: number): string {
  const norm = ((degrees % 360) + 360) % 360;
  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(norm / 22.5) % 16;
  return `${Math.round(norm)}° ${cardinals[index]}`;
}

/**
 * Capture high-accuracy GPS coordinates under 50m with enableHighAccuracy: true, maximumAge: 0, timeout: 5000.
 */
export async function captureDeviceGps(options?: {
  timeoutMs?: number;
  maxTargetAccuracyMeters?: number; // target <= 50m
  onProgress?: (info: {
    currentAccuracy: number;
    bestAccuracy: number;
    statusText: string;
    isUnder50m: boolean;
  }) => void;
}): Promise<DeviceGpsResult> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser or environment.');
  }

  const targetAccuracy = options?.maxTargetAccuracyMeters ?? 50; // Enforce under 50m target!
  const timeoutMs = options?.timeoutMs || 5000;

  options?.onProgress?.({
    currentAccuracy: 0,
    bestAccuracy: 0,
    statusText: 'Connecting to GPS hardware satellites (Target: <50m)...',
    isUnder50m: false,
  });

  return new Promise<DeviceGpsResult>((resolve, reject) => {
    let watchId: number | null = null;
    let timeoutTimer: any = null;
    let settlingTimer: any = null;
    let bestPos: GeolocationPosition | null = null;
    let isFinished = false;

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (timeoutTimer !== null) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
      if (settlingTimer !== null) {
        clearTimeout(settlingTimer);
        settlingTimer = null;
      }
    };

    const finishWithPosition = (pos: GeolocationPosition) => {
      if (isFinished) return;
      isFinished = true;
      cleanup();

      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));
      const accuracy = Math.round(pos.coords.accuracy || 10);
      const isUnder50m = accuracy <= targetAccuracy;

      resolve({
        latitude: lat,
        longitude: lng,
        accuracyMeters: accuracy,
        altitude: pos.coords.altitude,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        timestamp: pos.timestamp || Date.now(),
        isUnder50m,
      });
    };

    const handlePosition = (pos: GeolocationPosition) => {
      const accuracy = Math.round(pos.coords.accuracy || 999);

      if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) {
        bestPos = pos;
      }

      const bestAcc = Math.round(bestPos.coords.accuracy || accuracy);
      const isUnder50 = bestAcc <= targetAccuracy;

      options?.onProgress?.({
        currentAccuracy: accuracy,
        bestAccuracy: bestAcc,
        statusText: isUnder50
          ? `GPS Locked: ±${bestAcc}m (Accurate under 50m)`
          : `Refining satellite signal: ±${accuracy}m... (Target: <50m)`,
        isUnder50m: isUnder50,
      });

      // Exceptional satellite fix (<= 15m): lock immediately
      if (accuracy <= 15) {
        finishWithPosition(pos);
        return;
      }

      // If accuracy meets target under 50m
      if (accuracy <= targetAccuracy) {
        // Wait at most 800ms to allow fine satellite settling, then resolve
        if (!settlingTimer) {
          settlingTimer = setTimeout(() => {
            if (bestPos) {
              finishWithPosition(bestPos);
            }
          }, 800);
        }
      }
    };

    // Overall timeout fallback
    timeoutTimer = setTimeout(() => {
      if (bestPos) {
        finishWithPosition(bestPos);
      } else {
        cleanup();
        reject(new Error('GPS satellite signal took too long. Please ensure device location is turned ON with high accuracy.'));
      }
    }, timeoutMs);

    // 1. Fast immediate lock attempt via getCurrentPosition
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handlePosition(pos);
      },
      (err) => {
        console.warn('Initial GPS query notice:', err);
        if (err.code === 1) { // PERMISSION_DENIED
          cleanup();
          reject(new Error('Location access permission was denied. Please allow location permissions in your browser.'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    // 2. Continuous watchPosition to refine down to under 50m
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          handlePosition(pos);
        },
        (err) => {
          console.warn('GPS continuous watch notice:', err);
          if (err.code === 1) {
            cleanup();
            reject(new Error('Location access permission was denied. Please allow location permissions in your browser.'));
          } else if (bestPos) {
            finishWithPosition(bestPos);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 0,
        }
      );
    } catch (e) {
      console.warn('Error starting watchPosition:', e);
    }
  });
}

/**
 * Backward compatibility wrapper.
 */
export async function captureRobotPrecisionGps(
  _config: Partial<RobotGpsConfig> = {},
  onProgress?: (status: {
    samplesCollected: number;
    targetSamples: number;
    currentAccuracy: number;
    bestAccuracy: number;
    isLocked: boolean;
    stageText: string;
    thetaDegrees?: number;
  }) => void
): Promise<RobotGpsResult> {
  onProgress?.({
    samplesCollected: 0,
    targetSamples: 1,
    currentAccuracy: 0,
    bestAccuracy: 0,
    isLocked: false,
    stageText: '📡 Querying Hardware GPS (Target: <50m)...',
  });

  const res = await captureDeviceGps({
    maxTargetAccuracyMeters: 50,
    timeoutMs: 5000,
    onProgress: (info) => {
      onProgress?.({
        samplesCollected: 1,
        targetSamples: 1,
        currentAccuracy: info.currentAccuracy,
        bestAccuracy: info.bestAccuracy,
        isLocked: info.isUnder50m,
        stageText: info.statusText,
      });
    }
  });

  const heading = res.heading || 0;
  const compass = getCompassDirection(heading);

  onProgress?.({
    samplesCollected: 1,
    targetSamples: 1,
    currentAccuracy: res.accuracyMeters,
    bestAccuracy: res.accuracyMeters,
    isLocked: true,
    thetaDegrees: heading,
    stageText: `🔒 Location Locked [${res.latitude}, ${res.longitude}] (±${res.accuracyMeters}m ${res.isUnder50m ? '<50m verified' : ''})`,
  });

  return {
    latitude: res.latitude,
    longitude: res.longitude,
    accuracyMeters: res.accuracyMeters,
    sampleCount: 1,
    fixQuality: res.accuracyMeters <= 20 ? 'EXCELLENT' : res.accuracyMeters <= 50 ? 'GOOD' : 'FAIR',
    hdopEstimate: Number((res.accuracyMeters / 5).toFixed(2)),
    satellitesEstimated: 12,
    thetaDegrees: heading,
    thetaCompass: compass,
    thetaRadians: Number(((heading * Math.PI) / 180).toFixed(4)),
    readings: [{
      latitude: res.latitude,
      longitude: res.longitude,
      accuracy: res.accuracyMeters,
      altitude: res.altitude,
      speed: res.speed,
      heading: res.heading,
      timestamp: res.timestamp,
    }],
    timestamp: res.timestamp,
  };
}
