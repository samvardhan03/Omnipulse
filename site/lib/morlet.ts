export interface MorletFilter {
  lambda: number;
  xi: number;
  sigma: number;
  peak: number;
}

export interface MorletBank {
  filters: MorletFilter[];
  j: number;
  q: number;
  pathCount: number;
}

export function buildMorletBank(j: number, q: number, depth: number, jtfs: boolean): MorletBank {
  const filters: MorletFilter[] = [];
  const totalFilters = j * q;

  for (let lambda = 0; lambda < totalFilters; lambda++) {
    const xi = Math.PI * Math.pow(2, -lambda / q);
    const sigma = 0.8 * Math.pow(2, lambda / q);
    const rawPeak = Math.exp(-0.5 * Math.pow(xi * sigma, 2));
    const peak = Math.min(rawPeak * 1.2, 0.98);
    filters.push({ lambda, xi, sigma, peak });
  }

  const pathCount = computePathCount(j, q, depth, jtfs);
  return { filters, j, q, pathCount };
}

function computePathCount(j: number, q: number, depth: number, jtfs: boolean): number {
  const baseFilters = j * q;
  let count = baseFilters;
  if (depth >= 2) count += baseFilters * baseFilters;
  if (depth >= 3) count += baseFilters * baseFilters * baseFilters;
  if (jtfs) count = Math.round(count * 1.5);
  return count;
}

export function morletTimeDomain(filter: MorletFilter, numSamples = 128): Float32Array {
  const out = new Float32Array(numSamples);
  const center = numSamples / 2;
  for (let t = 0; t < numSamples; t++) {
    const x = (t - center) / filter.sigma;
    const gauss = Math.exp(-0.5 * x * x);
    out[t] = gauss * Math.cos(filter.xi * (t - center)) * filter.peak;
  }
  return out;
}

export function morletFreqAmplitude(filter: MorletFilter, numBins = 256): Float32Array {
  const out = new Float32Array(numBins);
  for (let k = 0; k < numBins; k++) {
    const freq = (k / numBins) * Math.PI;
    const shifted = freq - filter.xi;
    out[k] = Math.exp(-0.5 * Math.pow(shifted * filter.sigma, 2)) * filter.peak;
  }
  return out;
}
