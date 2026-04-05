#!/usr/bin/env python3
"""Generate PulmoVox v3 acoustic research protocol PDF. Run from repo root:
   PYTHONPATH=./.pdfdeps python3 scripts/build_protocol_pdf.py
"""
import os
import sys

# Local fpdf2 install (pip install -t .pdfdeps)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, ".pdfdeps"))

from fpdf import FPDF  # noqa: E402


class PDF(FPDF):
    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 6, f"Page {self.page_no()}", align="C")


def w(pdf):
    return pdf.epw


def add_title(pdf, text):
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(20, 40, 60)
    pdf.multi_cell(w(pdf), 8, text)
    pdf.ln(2)


def add_h1(pdf, text):
    pdf.ln(3)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(0, 80, 120)
    pdf.multi_cell(w(pdf), 6, text)
    pdf.ln(1)


def add_body(pdf, text):
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(w(pdf), 5, text)
    pdf.ln(1)


def add_bullets(pdf, items):
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(40, 40, 40)
    for it in items:
        pdf.multi_cell(w(pdf), 5, "- " + it)
    pdf.ln(1)


def main():
    pdf = PDF()
    pdf.set_margins(18, 18, 18)
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    add_title(pdf, "PulmoVox v3 - Voice Acoustic Capture Protocol")
    add_body(
        pdf,
        "Research-grade browser-based protocol for comparable laptop and mobile recordings. "
        "Aligns with in-app flow: HTTPS, calibration, passage-based recording, YIN pitch track, "
        "jitter/shimmer/HNR/MFCC, and heuristic lung mapping. Version the app via Build ID in the header.",
    )

    add_h1(pdf, "1. Aim and design")
    add_body(
        pdf,
        "Aim: obtain traceable voice audio and derived acoustic features across devices for validation "
        "against a pre-specified reference (e.g. spirometry, clinical classification). "
        "Design: state prospective/cross-sectional/longitudinal; define population and sample size separately.",
    )

    add_h1(pdf, "2. Platform and version control")
    add_bullets(
        pdf,
        [
            "Use only HTTPS deployment; microphone requires a secure context.",
            "Record the app Build ID (header) for every session; do not mix app versions within one primary cohort without sensitivity analysis.",
            "Document browser name/version and OS; export CSV includes device-oriented fields where available.",
            "Allowlist supported browsers or record actual UA per participant.",
        ],
    )

    add_h1(pdf, "3. Environment and hardware")
    add_bullets(
        pdf,
        [
            "Quiet room; minimise fans, open windows, background speech.",
            "Mouth-to-microphone distance 20-30 cm; consistent angle (document left/right/front).",
            "Do not cover phone mic; note case/cover if used.",
            "Standardise laptop built-in vs external USB mic per cohort; record which was used.",
            "Headsets: avoid mixed headset vs phone-mic unless one model is standardised for all sites.",
        ],
    )

    add_h1(pdf, "4. Subject preparation")
    add_bullets(
        pdf,
        [
            "Hydration and voice rest: pre-specify (e.g. no shouting warm-up, or standardised short rest).",
            "Select one app language per visit unless multilingual design is pre-specified.",
            "Fixed order: calibration first, then recording task(s) - no ad hoc reordering.",
        ],
    )

    add_h1(pdf, "5. Calibration (mandatory)")
    add_body(
        pdf,
        "Calibration estimates noise floor and reference phonation level for gain normalisation and adaptive VAD. "
        "Skipping calibration increases failed runs and unstable scores.",
    )
    add_bullets(
        pdf,
        [
            "Silence step: participant fully silent; minimal movement until the app completes the step.",
            "Sustained /a/ (ahhh): comfortable pitch and loudness, steady phonation - not whisper; avoid pitch glides.",
            "QC: calibration completed (not skipped). Optional: minimum SNR / environment band - exclude or flag per statistical plan.",
        ],
    )

    add_h1(pdf, "6. Recording tasks (app passages)")
    add_body(
        pdf,
        "Pre-specify which passage each participant performs. Sustained Vowel + Counting (Protocol A) is primary "
        "when jitter, shimmer, and dense pitch track matter. Rainbow/read-aloud yields thinner pitch coverage; "
        "Breath-capacity passage needs separate interpretation.",
    )
    add_bullets(
        pdf,
        [
            "Scripted instruction example: deep breath, then steady comfortable ahhh until the app advances.",
            "Complete on-screen steps without skipping the sustained vowel segment when Protocol A is used.",
            "Start recording only after calibration is complete and the participant understands the task.",
            "Stop when the full scripted task is finished; pre-define max repeats and which run is primary (first valid vs median).",
        ],
    )

    add_h1(pdf, "7. Quality control and analysis sets")
    add_body(
        pdf,
        "Mobile browser audio is higher variance than typical laptop capture. Pre-specify objective QC using "
        "app-reported metrics (e.g. voiced-frame count, duration, calibration SNR).",
    )
    add_bullets(
        pdf,
        [
            "Example gates: minimum voiced frames (e.g. at least 50 exploratory, at least 100 confirmatory - justify after pilot).",
            "Minimum task duration; exclude truncated runs.",
            "Exclude simulated/mic-unavailable mode from acoustic validation.",
            "Analysis: report ITT and acoustic-evaluable (per-protocol) sets if required.",
        ],
    )

    add_h1(pdf, "8. Outcomes (tiered)")
    add_bullets(
        pdf,
        [
            "Tier 1 (preferred for validation): duration, sample rate, voiced-frame count, exported acoustic features.",
            "Tier 2: composite acoustic score / risk band - useful for screening narratives.",
            "Tier 3: heuristic lung pattern / predicted spirometry-style metrics - exploratory until validated vs reference; "
            "Indeterminate/low-confidence runs must not be read as definitive obstruction/restriction.",
        ],
    )

    add_h1(pdf, "9. Data management")
    add_bullets(
        pdf,
        [
            "Export CSV per session; retain Build ID, device metadata, calibration summary, passage, language.",
            "Use study IDs in filenames; align with consent for storage and multicentre transfer.",
        ],
    )

    add_h1(pdf, "10. Statistics and ethics (outline)")
    add_bullets(
        pdf,
        [
            "Pre-specify primary endpoint vs reference and statistical test (correlation, AUC, agreement).",
            "Stratify or adjust for device class (mobile vs laptop); sensitivity analysis on high voiced-frame subset.",
            "Consent: voice recording, processing, storage, multicentre use; clarify investigational/non-diagnostic status unless regulated as device.",
        ],
    )

    add_h1(pdf, "Investigator one-page checklist")
    add_bullets(
        pdf,
        [
            "Quiet room; same HTTPS link and same app build for all subjects in a cohort.",
            "Calibrate: silence, then loud steady ahhh.",
            "Use Sustained Vowel task for primary perturbation endpoints.",
            "20-30 cm, mic uncovered; keep device class strategy consistent.",
            "Export CSV; retain diagnostics screenshot if QC fails.",
            "Apply pre-registered voiced-frame (and other) rules before primary analysis.",
        ],
    )

    out_path = os.path.join(ROOT, "PulmoVox_v3_Research_Protocol.pdf")
    pdf.output(out_path)
    print(out_path)


if __name__ == "__main__":
    main()
