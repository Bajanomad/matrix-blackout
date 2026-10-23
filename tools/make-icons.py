#!/usr/bin/env python3
"""Generate the Matrix Blackout icon set: a ring with Matrix code rain falling behind an anarchy sign.

Writes matrix-icon.svg (animated, SMIL) plus static SVG frames that headless
Chromium turns into the PNG/ICO files. Usage: python3 tools/make-icons.py <out_dir>
"""
import random, sys, os

S = 512
CX = CY = S / 2
GREEN, HEAD, BG = "#35ff76", "#d6ffe0", "#000000"
COLS, PITCH, ROW, GLYPH, STROKE = 7, 54, 54, 32, 7
# (trail glyphs, fall seconds, head height 0..1 of the icon in the static frame)
COLSPEC = [(6, 4.6, .62), (5, 3.2, .45), (7, 5.8, .80), (6, 4.0, .68), (7, 6.2, .52), (5, 3.6, .84), (6, 5.0, .58)]
PTS = [(x, y) for y in (0, .5, 1) for x in (0, .5, 1)]

def glyph(rng, cx, cy, color, op, extra=""):
    segs = []
    if rng.random() < .5:
        y = rng.choice([0, .5, 1]); segs.append(((0, y), (1, y)))
    else:
        x = rng.choice([0, .5, 1]); segs.append(((x, 0), (x, 1)))
    for _ in range(rng.choice([1, 2, 2])):
        segs.append(tuple(rng.sample(PTS, 2)))
    d = "".join("M%.1f %.1fL%.1f %.1f" % (cx + (a[0] - .5) * GLYPH, cy + (a[1] - .5) * GLYPH,
                                        cx + (b[0] - .5) * GLYPH, cy + (b[1] - .5) * GLYPH) for a, b in segs)
    return '<path d="%s" stroke="%s" stroke-opacity="%.2f"%s/>' % (d, color, op, extra)

def column(i, animate):
    rng = random.Random(411 + i * 11)
    n, dur, hy = COLSPEC[i]
    cx = CX + (i - (COLS - 1) / 2) * PITCH
    parts = []
    for k in range(n):
        if k == 0:
            parts.append(glyph(rng, cx, -0.0, HEAD, 1, ' filter="url(#glow)"'))
        else:
            parts.append(glyph(rng, cx, -k * ROW, GREEN, max(.10, 1 - k / (n + .5)) * .95))
    g = "".join(parts)
    travel = S + n * ROW + ROW
    head_y = hy * S
    if animate:
        return ('<g><animateTransform attributeName="transform" type="translate" values="0 0;0 %.1f" '
                'dur="%.1fs" begin="-%.2fs" repeatCount="indefinite"/>%s</g>' % (travel, dur, head_y / travel * dur, g))
    return '<g transform="translate(0 %.1f)">%s</g>' % (head_y, g)

# Anarchy sign in the middle: a dark halo dims the rain behind it, then a circled A
# whose apex, legs and crossbar break out of its circle.
ANARCHY = (
    '<circle cx="256" cy="262" r="150" fill="url(#halo)"/>'
    '<g fill="none" stroke="%s" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)">'
    '<circle cx="256" cy="262" r="104" stroke-width="16"/>'
    '<path d="M178 386L256 122L334 386M146 300H366" stroke-width="18"/></g>' % HEAD)

def svg(animate=True, shape="circle", scale=1.0):
    """shape: circle (transparent corners) | square (black full-bleed, for iOS/maskable)."""
    R = 232
    cols = "".join(column(i, animate) for i in range(COLS))
    bg = '<rect width="%d" height="%d" fill="%s"/>' % (S, S, BG) if shape == "square" else ""
    body = (
        '<circle cx="256" cy="256" r="%d" fill="%s"/>' % (R, BG) +
        '<g clip-path="url(#in)"><g fill="none" stroke-linecap="round" stroke-width="%d">%s</g>'
        '<circle cx="256" cy="256" r="196" fill="url(#vig)"/></g>' % (STROKE, cols) + ANARCHY +
        '<circle cx="256" cy="256" r="%d" fill="none" stroke="%s" stroke-width="12" filter="url(#glow)"/>'
        '<circle cx="256" cy="256" r="%d" fill="none" stroke="%s" stroke-width="3" stroke-opacity=".55"/>' % (R - 7, GREEN, R - 26, GREEN))
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">'
            '<defs><clipPath id="in"><circle cx="256" cy="256" r="196"/></clipPath>'
            '<filter id="glow" filterUnits="userSpaceOnUse" x="-2000" y="-2000" width="5000" height="5000"><feGaussianBlur stdDeviation="6" result="b"/>'
            '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
            '<radialGradient id="halo"><stop offset="55%%" stop-color="#000" stop-opacity=".85"/><stop offset="100%%" stop-color="#000" stop-opacity="0"/></radialGradient><radialGradient id="vig"><stop offset="60%%" stop-color="#000" stop-opacity="0"/><stop offset="100%%" stop-color="#000" stop-opacity=".6"/></radialGradient></defs>'
            '%s<g transform="translate(%.1f %.1f) scale(%.3f)">%s</g></svg>'
            % (bg, S * (1 - scale) / 2, S * (1 - scale) / 2, scale, body))

if __name__ == "__main__":
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    w = lambda n, s: open(os.path.join(out, n), "w").write(s)
    w("matrix-icon.svg", svg(True, "circle"))
    w("frame-circle.svg", svg(False, "circle"))
    w("frame-square.svg", svg(False, "square", .94))
    w("frame-maskable.svg", svg(False, "square", .78))
