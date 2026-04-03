# PulmoVox v3 — Voice Acoustic Capture Research Protocol

Research-grade browser-based protocol for **comparable laptop and mobile** voice recordings. Aligns with PulmoVox v3 behaviour: HTTPS deployment, calibration, passage-based recording, YIN pitch tracking, jitter/shimmer/HNR/MFCC processing, and heuristic lung mapping.

**Version the app** using the **Build ID** shown in the app header for every study cohort.

---

## 1. Aim and study design

- **Aim:** Obtain traceable voice audio and derived acoustic features across devices for validation against a **pre-specified reference** (e.g. spirometry, clinical classification, another instrument).
- **Design:** State explicitly (prospective, cross-sectional, longitudinal, etc.).
- **Population:** Define inclusion/exclusion criteria per your clinical or methodological question.
- **Sample size:** Justify separately (power for correlation, AUC, agreement, etc.).

---

## 2. Platform and version control

- Use only **HTTPS**; microphone access requires a **secure context**.
- Record the app **Build ID** (header line) for every session. **Do not mix app versions** within one primary analysis cohort without a documented sensitivity analysis.
- Document **browser name/version** and **OS**; CSV export includes device-oriented fields where implemented.
- Either **allowlist** supported browsers or record the actual user agent per participant.

---

## 3. Environment and hardware

- **Room:** Quiet; minimise fans, open windows, overlapping speech.
- **Geometry:** Mouth-to-microphone **20–30 cm**; keep **consistent angle** (document left / right / front).
- **Phone:** Do **not** cover the microphone; note case/cover if it may muffle audio.
- **Laptop:** Standardise **built-in vs external USB microphone** per cohort; record which was used.
- **Headsets:** Avoid mixing headset mics and phone mics unless one headset model is standardised across sites.

---

## 4. Subject preparation

- **Voice / rest:** Pre-specify (e.g. no shouting “warm-up”, or a standardised short rest before first capture).
- **Language:** Select **one app language** per visit unless a multilingual design is pre-specified.
- **Order:** **Calibration first**, then recording task(s). Do not reorder ad hoc.

---

## 5. Calibration (mandatory)

Calibration estimates **noise floor** and **reference phonation level** for gain normalisation and adaptive voice-activity behaviour. Skipping calibration increases failed runs and unstable scores.

| Step | Instruction |
|------|-------------|
| **Silence** | Participant fully silent; minimal movement until the app completes the step. |
| **Sustained /a/** | Comfortable pitch and loudness, **steady** “ahhh” — **not whisper**; avoid pitch glides and broken phonation. |

**QC (recommended):**

- Calibration **completed** (not skipped).
- Optional: minimum **SNR / environment quality** band; **exclude or flag** poor environments per your statistical plan.

---

## 6. Recording tasks (in-app passages)

Pre-specify which **passage** each participant performs. Match task to endpoint:

| App task | Acoustic focus | Notes |
|----------|----------------|--------|
| **Sustained Vowel + Counting** (Protocol A) | Dense **F0** track; **jitter / shimmer** | **Primary** for perturbation-style validation — emphasise **long steady “ahhh”** before counting / pa-ta-ka. |
| **Rainbow / read-aloud** | Connected speech, timing | Often **thinner pitch track**; weaker for cycle-level jitter/shimmer. |
| **Breath capacity passage** | Breath grouping | Interpret carefully vs lung-volume claims. |

**Example scripted cue:** *“Take a deep breath, then say ‘ahhh’ in one steady tone at a comfortable loudness until the app moves on.”*

- Start recording only after **calibration is complete** and the participant understands the **current** task.
- **Stop** when the **full scripted task** is finished.
- Pre-define **maximum repeats** and whether the **first valid** or **median** run is the primary endpoint.

---

## 7. Quality control and analysis sets

Mobile browser audio has **higher variance** than typical laptop capture. Pre-specify **objective QC** using metrics the app exposes (UI and/or CSV), for example:

- **Minimum voiced frames** (pitch-track count), e.g. ≥50 exploratory, ≥100 confirmatory — **justify after pilot**.
- **Minimum task duration**; exclude truncated recordings.
- **Exclude** simulated / microphone-unavailable mode from acoustic validation.
- **Analysis sets:** report **ITT** and **acoustic-evaluable (per-protocol)** cohorts if your venue or registry requires it.

---

## 8. Outcomes (tiered)

1. **Tier 1 (preferred for validation):** Duration, sample rate, voiced-frame count, exported low-level acoustic features.
2. **Tier 2:** Composite **acoustic score** / risk band — useful for screening-style narratives.
3. **Tier 3:** Heuristic **lung pattern** and predicted spirometry-style numbers — **exploratory** until validated against a reference. **Indeterminate / low-confidence** runs must not be interpreted as definitive obstruction or restriction.

---

## 9. Data management

- **Export CSV** per session; retain **Build ID**, **device metadata**, **calibration summary**, **passage name**, **language**.
- Use **study IDs** in filenames and storage paths; align with **consent** for retention and multicentre transfer.

---

## 10. Statistical analysis and ethics (outline)

- **Pre-specify** primary endpoint vs reference and the **statistical approach** (correlation, Bland–Altman, AUC, kappa, etc.).
- **Stratify or adjust** for device class (mobile vs laptop); run **sensitivity analyses** on high voiced-frame subsets.
- **Consent:** voice recording, automated processing, storage, multicentre use; state **investigational / non-diagnostic** status unless the tool is used as a regulated device.

---

## Investigator one-page checklist

1. Quiet room; same **HTTPS link** and same **app build** for everyone in a cohort.  
2. **Calibrate:** silence, then **loud steady ahhh**.  
3. Use **Sustained Vowel** task when jitter/shimmer and pitch density are primary.  
4. **20–30 cm**, mic uncovered; keep device/mic strategy consistent.  
5. **Export CSV**; save diagnostic screenshot if QC fails.  
6. Apply **pre-registered voiced-frame** (and other) rules before primary analysis.

---

## Related files in this repository

| File | Purpose |
|------|---------|
| `index.html` | PulmoVox v3 web application |
| `PulmoVox_v3_Research_Protocol.pdf` | PDF version of this protocol (regenerate via `scripts/build_protocol_pdf.py`) |
| `scripts/build_protocol_pdf.py` | Builds the PDF from structured content |

---

*This document describes operational and scientific good practice for studies using PulmoVox v3. It does not replace institutional IRB/ethics review, registry entries, or clinical standard-of-care.*
