---
version: alpha
name: Share Pages Linear-inspired
description: "A quiet technical workspace for publishing short-lived Markdown and HTML pages. Linear-inspired dark surfaces, hairline borders, lavender actions, and compact product UI keep the upload flow focused."
colors:
  primary: "#5e6ad2"
  on-primary: "#ffffff"
  primary-hover: "#828fff"
  primary-focus: "#4d58bd"
  canvas: "#010102"
  surface-1: "#0f1011"
  surface-2: "#141516"
  surface-3: "#18191a"
  ink: "#f7f8f8"
  ink-muted: "#d0d6e0"
  ink-subtle: "#8a8f98"
  hairline: "#23252a"
  hairline-strong: "#34343a"
  success: "#27a644"
  warning: "#f0b429"
  danger: "#e5484d"

typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.8px"
  heading:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.2px"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  caption:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5

rounded:
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px

spacing:
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  section: 48px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "9px 14px"
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "9px 14px"
  card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "24px"
  text-input:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
---

## Overview

Share Pages is a compact technical workspace rather than a marketing landing page. The UI should make the next action obvious: drop a Markdown or HTML file, then copy the generated URL. Management tools such as MCP configuration and page deletion remain visible but secondary.

## Colors

Use the near-black canvas and charcoal surfaces for the application shell. Lavender is reserved for primary actions, links, focus states, and small status accents. Hairline borders separate surfaces without heavy shadows.

## Typography

Use a system sans stack for Japanese readability and technical density. Use a monospace stack for IDs, URLs, and configuration previews. Keep headings compact and avoid oversized marketing typography.

## Layout

The desktop layout uses a centered 1040px workspace with a two-column content area: the upload action is primary, while MCP setup and recent pages are supporting panels. On narrow screens, panels collapse to one column.

## Components

Cards use 1px hairline borders and 12px radius. Primary buttons use the lavender accent. Destructive actions are quiet until hover. Upload zones should use a dashed border and a visible focus state.

## Do's and Don'ts

- Do keep the 72-hour expiry visible near the upload action.
- Do show the generated URL as the immediate success result.
- Do keep API tokens masked in the preview; only the authenticated copy action receives the real value.
- Don't use decorative gradients that compete with the file drop action.
- Don't expose management controls on public share pages.
