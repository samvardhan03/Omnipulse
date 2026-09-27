// SPDX-License-Identifier: AGPL-3.0-or-later
//! omnipulse-fp -- compare two audio files using the WST scattering engine.
//!
//! Decodes, resamples to 22,050 Hz mono, fingerprints with the selected
//! backend, and prints the SW1 distance between the two fingerprints.
//!
//! The distance is a raw number with no verdict attached. The platform's
//! calibrated thresholds that map a distance to Exact / Perceptual / Miss
//! are not public. A small distance means the signals are similar under the
//! WST metric; it does not constitute a copyright determination.

use anyhow::{bail, Context, Result};
use clap::Parser;
use omni_backend::{select_backend, BackendKind, BackendSelection, WstParams};
use std::path::PathBuf;
use symphonia::core::audio::{AudioBufferRef, Signal};
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::errors::Error as SymphErr;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::{MediaSourceStream, MediaSourceStreamOptions};
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;

const TARGET_HZ: u32 = 22_050;

#[derive(Parser)]
#[command(
    name = "omnipulse-fp",
    about = "Compare two audio files with the OmniPulse WST engine. Prints SW1 distance, not a verdict."
)]
struct Cli {
    /// First audio file (WAV, FLAC, MP3, M4A).
    file_a: PathBuf,
    /// Second audio file (WAV, FLAC, MP3, M4A).
    file_b: PathBuf,
    /// Backend to use: cpu (default) or metal (macOS, requires --features metal).
    #[arg(long, default_value = "cpu")]
    backend: String,
    /// Number of octaves J for the scattering cascade.
    #[arg(long, default_value_t = 6)]
    j: u32,
    /// Wavelets per octave Q.
    #[arg(long, default_value_t = 8)]
    q: u32,
    /// Scattering depth.
    #[arg(long, default_value_t = 2)]
    depth: u32,
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    let params = WstParams {
        j: cli.j,
        q: cli.q,
        depth: cli.depth,
        config_version: "op-wst-audio-2".to_string(),
    };

    let kind: BackendKind = cli
        .backend
        .parse()
        .map_err(|e: omni_backend::BackendError| anyhow::anyhow!("{e}"))?;

    if kind == BackendKind::Cuda {
        bail!("CUDA backend is not included in the public engine");
    }

    let backend = select_backend(BackendSelection::Explicit(kind))
        .map_err(|e| anyhow::anyhow!("backend unavailable: {e}"))?;

    let (samples_a, rate_a) = decode_audio(&cli.file_a)?;
    let (samples_b, rate_b) = decode_audio(&cli.file_b)?;

    let resampled_a = resample_to(&samples_a, rate_a, TARGET_HZ);
    let resampled_b = resample_to(&samples_b, rate_b, TARGET_HZ);

    eprintln!(
        "file A: {} samples at {} Hz -> {} at {} Hz (backend={})",
        samples_a.len(),
        rate_a,
        resampled_a.len(),
        TARGET_HZ,
        backend.name()
    );
    eprintln!(
        "file B: {} samples at {} Hz -> {} at {} Hz",
        samples_b.len(),
        rate_b,
        resampled_b.len(),
        TARGET_HZ,
    );

    let fp_a = backend
        .fingerprint_audio(&resampled_a, TARGET_HZ, &params)
        .context("fingerprint A failed")?;
    let fp_b = backend
        .fingerprint_audio(&resampled_b, TARGET_HZ, &params)
        .context("fingerprint B failed")?;

    eprintln!(
        "fingerprint A: {} coefficients  digest={}",
        fp_a.coefficients.len(),
        &fp_a.digest[..16]
    );
    eprintln!(
        "fingerprint B: {} coefficients  digest={}",
        fp_b.coefficients.len(),
        &fp_b.digest[..16]
    );

    let dist = sw1_distance(&fp_a.coefficients, &fp_b.coefficients);

    println!("sw1_distance: {:.6}", dist);
    println!(
        "note: this is a raw SW1 distance, not a verdict. The platform's calibrated \
         thresholds that map a distance to Exact / Perceptual / Miss are not public."
    );

    Ok(())
}

// ---------------------------------------------------------------------------
// Audio decoding (symphonia, mono mix, f32 output)
// ---------------------------------------------------------------------------

fn decode_audio(path: &PathBuf) -> Result<(Vec<f32>, u32)> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let bytes = std::fs::read(path)
        .with_context(|| format!("cannot read {}", path.display()))?;

    let mut hint = Hint::new();
    hint.with_extension(&ext);

    let cursor = std::io::Cursor::new(bytes);
    let mss = MediaSourceStream::new(Box::new(cursor), MediaSourceStreamOptions::default());

    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &FormatOptions::default(), &MetadataOptions::default())
        .with_context(|| format!("could not probe {}", path.display()))?;

    let mut format = probed.format;
    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .context("no audio track found")?;

    let track_id = track.id;
    let sample_rate = track
        .codec_params
        .sample_rate
        .context("track has no sample rate")?;

    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())
        .context("decoder init failed")?;

    let mut samples: Vec<f32> = Vec::new();
    loop {
        let packet = match format.next_packet() {
            Ok(p) => p,
            Err(SymphErr::IoError(e)) if e.kind() == std::io::ErrorKind::UnexpectedEof => break,
            Err(SymphErr::ResetRequired) => break,
            Err(e) => bail!("packet error: {e}"),
        };
        if packet.track_id() != track_id {
            continue;
        }
        match decoder.decode(&packet) {
            Ok(decoded) => append_mono_f32(&decoded, &mut samples),
            Err(SymphErr::DecodeError(_)) => continue,
            Err(e) => bail!("decode error: {e}"),
        }
    }

    if samples.is_empty() {
        bail!("no audio samples decoded from {}", path.display());
    }
    Ok((samples, sample_rate))
}

fn append_mono_f32(buf: &AudioBufferRef, out: &mut Vec<f32>) {
    use symphonia::core::conv::FromSample;
    match buf {
        AudioBufferRef::F32(b) => {
            let ch = b.spec().channels.count();
            for frame in 0..b.frames() {
                let mut s = 0.0f32;
                for c in 0..ch {
                    s += b.chan(c)[frame];
                }
                out.push(s / ch as f32);
            }
        }
        AudioBufferRef::S16(b) => {
            let ch = b.spec().channels.count();
            for frame in 0..b.frames() {
                let mut s = 0.0f32;
                for c in 0..ch {
                    s += b.chan(c)[frame] as f32 / i16::MAX as f32;
                }
                out.push(s / ch as f32);
            }
        }
        AudioBufferRef::S32(b) => {
            let ch = b.spec().channels.count();
            for frame in 0..b.frames() {
                let mut s = 0.0f32;
                for c in 0..ch {
                    s += b.chan(c)[frame] as f32 / i32::MAX as f32;
                }
                out.push(s / ch as f32);
            }
        }
        AudioBufferRef::F64(b) => {
            let ch = b.spec().channels.count();
            for frame in 0..b.frames() {
                let mut s = 0.0f32;
                for c in 0..ch {
                    s += f32::from_sample(b.chan(c)[frame]);
                }
                out.push(s / ch as f32);
            }
        }
        _ => { /* exotic formats skipped */ }
    }
}

// ---------------------------------------------------------------------------
// Linear resampler: arbitrary rational conversion via linear interpolation.
// ---------------------------------------------------------------------------

fn resample_to(samples: &[f32], from_hz: u32, to_hz: u32) -> Vec<f32> {
    if from_hz == to_hz || samples.is_empty() {
        return samples.to_vec();
    }
    let ratio = from_hz as f64 / to_hz as f64;
    let out_len = ((samples.len() as f64) / ratio).ceil() as usize;
    let mut out = Vec::with_capacity(out_len);
    for i in 0..out_len {
        let pos = i as f64 * ratio;
        let lo = pos.floor() as usize;
        let frac = (pos - pos.floor()) as f32;
        let lo_val = samples[lo.min(samples.len() - 1)];
        let hi_val = if lo + 1 < samples.len() { samples[lo + 1] } else { lo_val };
        out.push(lo_val + frac * (hi_val - lo_val));
    }
    out
}

// ---------------------------------------------------------------------------
// SW1 distance (dim=1: each coefficient is a 1-D point).
//
// sliced-wasserstein 0.1.x is not yet published to crates.io; this is a
// direct implementation of the dim=1 case. With dim=1, all random unit-vector
// projections collapse to the same axis, so SW1 reduces to the standard 1-D
// Wasserstein distance W1: sort both arrays, interpolate to a common length,
// and take the mean absolute difference of the sorted values. This matches the
// behaviour of SlicedWasserstein::distance at dim=1 in the private crate.
// ---------------------------------------------------------------------------

fn sw1_distance(a: &[f32], b: &[f32]) -> f64 {
    if a.is_empty() || b.is_empty() {
        return 0.0;
    }
    let mut sa: Vec<f32> = a.to_vec();
    let mut sb: Vec<f32> = b.to_vec();
    sa.sort_unstable_by(|x, y| x.partial_cmp(y).unwrap_or(std::cmp::Ordering::Equal));
    sb.sort_unstable_by(|x, y| x.partial_cmp(y).unwrap_or(std::cmp::Ordering::Equal));

    let n = sa.len().max(sb.len());
    let mut dist = 0.0f64;
    for i in 0..n {
        let va = quantile_interp(&sa, i, n);
        let vb = quantile_interp(&sb, i, n);
        dist += (va - vb).abs() as f64;
    }
    dist / n as f64
}

#[inline]
fn quantile_interp(v: &[f32], i: usize, n: usize) -> f32 {
    if v.len() == n {
        return v[i];
    }
    let pos = i as f64 * (v.len() - 1) as f64 / (n - 1).max(1) as f64;
    let lo = pos.floor() as usize;
    let frac = (pos - pos.floor()) as f32;
    let lo_val = v[lo.min(v.len() - 1)];
    let hi_val = if lo + 1 < v.len() { v[lo + 1] } else { lo_val };
    lo_val + frac * (hi_val - lo_val)
}
