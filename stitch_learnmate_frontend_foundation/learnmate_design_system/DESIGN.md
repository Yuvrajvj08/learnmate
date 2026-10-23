---
name: LearnMate Design System
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#4a4455'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#7b7487'
  outline-variant: '#ccc3d8'
  surface-tint: '#732ee4'
  primary: '#630ed4'
  on-primary: '#ffffff'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#d2bbff'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#005952'
  on-tertiary: '#ffffff'
  tertiary-container: '#00746a'
  on-tertiary-container: '#8df9ea'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#89f5e7'
  tertiary-fixed-dim: '#6bd8cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.025em
  display-hero-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.005em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system establishes a high-performance, emotionally intelligent environment for AI-assisted education. It balances executive software discipline with cognitive warmth, designed specifically to reduce learning fatigue while instilling momentum and academic rigor.

The aesthetic blends **Modern Precision** with **Selective Glassmorphism**. Layouts feel structural and purposeful rather than whimsical:
- **Atmosphere:** Translucent panels with precise background blurs float over clean, light canvas tones, providing visual separation without visual weight.
- **Micro-interactivity:** Hairline borders and subtle surface elevations mimic refined optical glass, reacting cleanly to pointer focus and state transitions.
- **Cognitive Clarity:** Information hierarchy eliminates decorative clutter. Whitespace acts as a cognitive buffer, isolating complex curricula, active prompts, and real-time comprehension feedback.
- **Multi-Accent Ecosystem:** While anchored in an authoritative deep violet, contextual subject streams and progress paths adapt smoothly across five secondary domain accents (blue, teal, green, pink, yellow) to support multi-track pedagogical journeys.

## Colors

The system uses a calibrated multi-accent palette built around deep violet for the core intelligence framework, supported by discrete subject-matter tracks. High visual contrast satisfies strict WCAG 2.1 AA accessibility ratios across both light and dark operational modes.

### Semantic Core
- **Primary (Core AI / Primary Actions):** `#7C3AED` (Default), `#6D28D9` (Hover / Active).
- **Secondary (Analytical / Logic Tracks):** `#2563EB` (Deep Blue), `#1D4ED8` (Dark Blue).
- **Tertiary (Sciences / Natural Systems):** `#0D9488` (Teal), `#059669` (Success / Green).
- **Domain Accents:**
  - *Creative / Humanities (Pink):* `#DB2777`
  - *Focus / Attention / Key Highlights (Yellow):* `#CA8A04`
- **Neutral (Slate Architecture):** `#0F172A` (Text primary light mode), `#F8FAFC` (Canvas background light mode).

### Surface & Border Treatments
- **Glass Panel Surface (Light):** `rgba(255, 255, 255, 0.72)` with backdrop filter blur `12px`.
- **Glass Panel Surface (Dark):** `rgba(15, 23, 42, 0.68)` with backdrop filter blur `14px`.
- **Hairline Borders (Light):** `rgba(255, 255, 255, 0.60)` on elevated glass; `rgba(226, 232, 240, 0.80)` on base layers.
- **Hairline Borders (Dark):** `rgba(255, 255, 255, 0.08)` on canvas; `rgba(255, 255, 255, 0.14)` on active interaction states.

## Typography

Typography prioritizes extreme readability across sustained reading durations and complex information arrays. Inter provides a neutral, highly engineered foundation with open apertures and tall x-heights.

- **Headings & Hero Scales:** Tight negative letter-spacing prevents visual drift in display copy, giving prompts and course modules clean geometric punch.
- **Prose & Transcripts:** `body-lg` and `body-md` apply loose, generous leading to maximize reading speed and minimize cognitive strain during multi-paragraph AI tutor explanations.
- **Interactive Labels:** Set in medium weight (`500`) to remain sharp over translucent glass containers without optical bleed.
- **Technical & Formulaic Display:** Code snippets, algebraic expressions, and algorithmic steps utilize `JetBrains Mono` for distinct character recognition.

## Layout & Spacing

The layout is built on a responsive 12-column fluid grid system engineered for dual-panel and tri-panel educational workflows (e.g., active curriculum navigation, chat-based AI dialog, and persistent workspace/notes).

### Grid Structure
- **Desktop (1280px+):** 12 columns, `margin: 2.5rem`, `gutter: 1.5rem`. Fluid center canvas with sticky command panels.
- **Tablet (768px – 1279px):** 8 columns, `margin: 1.5rem`, `gutter: 1.25rem`. Secondary panels fold into collapsible slide-overs.
- **Mobile (< 768px):** 4 columns, `margin: 1rem`, `gutter: 1rem`. Full vertical stacking; interactive sidebars convert to bottom sheets.

### Layout Principles
- **Asymmetric Focus Layout:** The core learning viewport commands 60–70% of available screen width, while the AI conversational companion occupies a 30–40% fixed/fluid column.
- **Vertical Rhythm:** Element gaps within cards leverage `space-xs` (4px) and `space-sm` (8px). Structural cards and modular learning blocks space evenly via `space-md` (16px) and `space-lg` (24px).

## Elevation & Depth

Visual depth is conveyed through layered optical glass, hairline borders, and ambient colored diffusion rather than muddy drop shadows.

### Glass Stack Hierarchy
- **Level 0 (Canvas Base):** Solid background (`#F8FAFC` light, `#0B0F19` dark). No blur, no elevation.
- **Level 1 (Docked Containers & Sidebars):** Translucent base layer (`rgba(255, 255, 255, 0.60)` / `rgba(15, 23, 42, 0.50)`), 8px backdrop blur, bordered by a single crisp 1px hairline border (`rgba(226, 232, 240, 0.60)`).
- **Level 2 (Interactive Cards & Floating Modules):** Translucent surface (`rgba(255, 255, 255, 0.85)` / `rgba(30, 41, 59, 0.65)`), 14px backdrop blur, subtle ambient shadow `0 8px 30px -4px rgba(15, 23, 42, 0.05)`, and a bright top-edge highlight stroke (`rgba(255, 255, 255, 0.90)` light / `rgba(255, 255, 255, 0.12)` dark).
- **Level 3 (Modals, Context Overlays, Active Floating Companion):** Translucent glass (`rgba(255, 255, 255, 0.92)` / `rgba(15, 23, 42, 0.85)`), 20px blur, supported by ambient multi-layer shadow `0 20px 40px -12px rgba(124, 58, 237, 0.12), 0 1px 3px 0 rgba(0, 0, 0, 0.04)`.

### Hover Elevation
Interactive surfaces do not jump aggressively. On hover, items shift upward by `1px`, elevate their border illumination, and increase their shadow spread slightly while brightening the internal fill translucency by 5–8%.

## Shapes

The interface embraces a modern, balanced curvature (`roundedness: 2`). This radius softens educational anxiety without feeling toy-like, preserving software authority.

- **Base Radius (0.5rem / 8px):** Standard controls, text inputs, code boxes, contextual popovers, dropdown lists, and action buttons.
- **Large Radius (1rem / 16px):** Interactive glass cards, prompt query panels, curriculum tiles, and secondary modals.
- **Extra-Large Radius (1.5rem / 24px):** Primary viewport parent frames, persistent bottom navigation sheets, and slide-in diagnostic trays.
- **Continuous Pill (Full Round):** Status indicators, tag chips, user presence pills, and playback progress indicators.

## Components

### Buttons
- **Primary:** Solid `#7C3AED` background with high-contrast `#FFFFFF` label text. 1px inset top border of `rgba(255, 255, 255, 0.25)`. Radius: `0.5rem`. Smooth hover transition to `#6D28D9` with subtle glowing focus ring (`box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2)`).
- **Secondary / Glass Button:** Semi-transparent surface `rgba(255, 255, 255, 0.60)` (light) / `rgba(30, 41, 59, 0.60)` (dark), bordered by `1px solid rgba(226, 232, 240, 0.80)`. Hover: 100% surface opacity and text shifts to `#7C3AED`.
- **Tertiary / Ghost:** No border or surface fill. Text `#475569`. Hover: background fills with `rgba(124, 58, 237, 0.06)`.

### Chips & Subject Badges
- **Structure:** Pill-shaped (`rounded-full`), height `28px`, inline padding `10px`.
- **Styling:** Subject-specific subtle tinted fills at 10% opacity, bordered by the accent at 25% opacity with text matching the 100% accent value (e.g., Violet for AI, Blue for Math, Teal for Science, Pink for Creative, Green for Success).

### Input Fields & Prompt Composer
- **Rest State:** Background `rgba(255, 255, 255, 0.50)` light / `rgba(15, 23, 42, 0.40)` dark. Border `1px solid rgba(203, 213, 225, 0.60)`. Padding: `0.75rem 1rem`. Typography: `body-md`.
- **Focus State:** Background turns `rgba(255, 255, 255, 0.95)`, border transitions directly to `#7C3AED`, with a dual-ring glow: `0 0 0 3px rgba(124, 58, 237, 0.15)`.

### Checkboxes & Radio Controls
- **Form Factor:** Checkboxes utilize `rounded-sm` (4px); radios are fully circular. Size: `18px x 18px`.
- **States:** Default border `1.5px solid #94A3B8`. Selected state fills completely with `#7C3AED`, containing a crisp, centered white checkmark or inner dot.

### Cards & Curriculum Units
- **Construction:** Level 2 glass container. 16px radius (`rounded-lg`), padding `1.25rem`. Hairline border with light-catching top edge.
- **States:** Hovering transforms the border stroke color to the active track's accent tone (e.g., `#7C3AED` or `#0D9488`) with a subtle `1px` translation along the Y-axis.

### AI Companion Response Node (Specialized Component)
- **Visual Presentation:** Asymmetric card containing a slight radiant gradient originating from the top-left corner (`rgba(124, 58, 237, 0.04)` to transparent). Left border accents the thread with a 2px vertical stroke in `#7C3AED`. Integrated contextual action chips (e.g., "Simplify", "Explain More", "Quiz Me") line the lower boundary.