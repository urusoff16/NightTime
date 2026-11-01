import { oklabToSrgb, srgbToOklab } from '../color/oklab';
import type { ColorCluster, ColorValue, OklabColor, SemanticRole } from '../types';

const LAB_CELL_SIZE = 0.06;
const ALPHA_CELL_SIZE = 0.18;
const MAX_CLUSTER_DISTANCE = 0.055;

interface ColorObservation {
  color: ColorValue;
  role: SemanticRole;
  area: number;
}

interface MutableCluster {
  color: ColorValue;
  center: OklabColor;
  alphaTotal: number;
  sampleCount: number;
  sampledArea: number;
  roles: Partial<Record<SemanticRole, number>>;
  bucket: string;
}

function bucketFor(center: OklabColor, alpha: number): string {
  return [center.l, center.a, center.b]
    .map((value) => Math.floor(value / LAB_CELL_SIZE))
    .concat(Math.floor(alpha / ALPHA_CELL_SIZE))
    .join(':');
}

function distance(first: OklabColor, firstAlpha: number, second: OklabColor, secondAlpha: number): number {
  return Math.hypot(
    first.l - second.l,
    first.a - second.a,
    first.b - second.b,
    (firstAlpha - secondAlpha) * 0.25,
  );
}

/** Groups nearby colors with a bounded neighboring-cell search and weighted OKLab centers. */
export function clusterColors(observations: ColorObservation[]): ColorCluster[] {
  const buckets = new Map<string, MutableCluster[]>();
  const clusters: MutableCluster[] = [];

  const orderedObservations = [...observations].sort(
    (first, second) =>
      second.area - first.area ||
      first.color.r - second.color.r ||
      first.color.g - second.color.g ||
      first.color.b - second.color.b ||
      first.color.a - second.color.a ||
      first.role.localeCompare(second.role),
  );
  for (const observation of orderedObservations) {
    const center = srgbToOklab(observation.color);
    const baseLabCell = [center.l, center.a, center.b].map((value) =>
      Math.floor(value / LAB_CELL_SIZE),
    );
    const baseAlphaCell = Math.floor(observation.color.a / ALPHA_CELL_SIZE);
    let nearest: MutableCluster | null = null;
    let nearestDistance = MAX_CLUSTER_DISTANCE;

    for (let l = -1; l <= 1; l += 1) {
      for (let a = -1; a <= 1; a += 1) {
        for (let b = -1; b <= 1; b += 1) {
          for (let alpha = -1; alpha <= 1; alpha += 1) {
            const key = [
              baseLabCell[0]! + l,
              baseLabCell[1]! + a,
              baseLabCell[2]! + b,
              baseAlphaCell + alpha,
            ].join(':');
            for (const candidate of buckets.get(key) ?? []) {
              const candidateDistance = distance(
                center,
                observation.color.a,
                candidate.center,
                candidate.color.a,
              );
              if (candidateDistance < nearestDistance) {
                nearest = candidate;
                nearestDistance = candidateDistance;
              }
            }
          }
        }
      }
    }

    const weight = Math.max(1, observation.area);
    if (!nearest) {
      const bucket = bucketFor(center, observation.color.a);
      const cluster: MutableCluster = {
        color: { ...observation.color },
        center,
        alphaTotal: observation.color.a * weight,
        sampleCount: 1,
        sampledArea: weight,
        roles: { [observation.role]: 1 },
        bucket,
      };
      const entries = buckets.get(bucket) ?? [];
      entries.push(cluster);
      buckets.set(bucket, entries);
      clusters.push(cluster);
      continue;
    }

    const previousBucket = nearest.bucket;
    const totalArea = nearest.sampledArea + weight;
    nearest.center = {
      l: (nearest.center.l * nearest.sampledArea + center.l * weight) / totalArea,
      a: (nearest.center.a * nearest.sampledArea + center.a * weight) / totalArea,
      b: (nearest.center.b * nearest.sampledArea + center.b * weight) / totalArea,
    };
    nearest.alphaTotal += observation.color.a * weight;
    nearest.sampledArea = totalArea;
    nearest.sampleCount += 1;
    nearest.roles[observation.role] = (nearest.roles[observation.role] ?? 0) + 1;
    nearest.color = oklabToSrgb(nearest.center, nearest.alphaTotal / totalArea);

    const nextBucket = bucketFor(nearest.center, nearest.color.a);
    if (nextBucket !== previousBucket) {
      const previousEntries = buckets.get(previousBucket);
      if (previousEntries) {
        const index = previousEntries.indexOf(nearest);
        if (index >= 0) previousEntries.splice(index, 1);
        if (previousEntries.length === 0) buckets.delete(previousBucket);
      }
      const nextEntries = buckets.get(nextBucket) ?? [];
      nextEntries.push(nearest);
      buckets.set(nextBucket, nextEntries);
      nearest.bucket = nextBucket;
    }
  }

  return clusters
    .sort(
      (first, second) =>
        second.sampledArea - first.sampledArea ||
        first.color.r - second.color.r ||
        first.color.g - second.color.g ||
        first.color.b - second.color.b,
    )
    .map(({ color, sampleCount, sampledArea, roles }) => ({
      color,
      sampleCount,
      sampledArea,
      roles,
    }));
}
