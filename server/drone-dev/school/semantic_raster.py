"""Display-only semantic styling. Input owners and classification colors stay intact."""
import numpy as np


def region_rgba(padded_ids, colors, contrast=False):
    ids = padded_ids[1:-1, 1:-1]
    rgba = np.zeros((4, *ids.shape), dtype=np.uint8)
    for owner in np.unique(ids):
        if not owner:
            continue
        tone = colors.get(str(owner), '#88949c')
        mask = ids == owner
        for ch in range(3):
            rgba[ch][mask] = int(tone[1+ch*2:3+ch*2], 16)
        rgba[3][mask] = 100 if contrast else 85
    if not contrast:
        edge = ((ids != padded_ids[:-2, 1:-1]) | (ids != padded_ids[2:, 1:-1]) |
                (ids != padded_ids[1:-1, :-2]) | (ids != padded_ids[1:-1, 2:]))
        rgba[3][edge & (ids > 0)] = 215
        return rgba
    # A one-pixel light line with a dark halo stays visible over both forest and
    # bright roofs. Compare padded owners, including across tile boundaries.
    edge = np.zeros_like(padded_ids, dtype=bool)
    edge[:-1, :] |= padded_ids[:-1, :] != padded_ids[1:, :]
    edge[:, :-1] |= padded_ids[:, :-1] != padded_ids[:, 1:]
    core = edge[1:-1, 1:-1]
    halo = (core | edge[:-2, 1:-1] | edge[2:, 1:-1] |
            edge[1:-1, :-2] | edge[1:-1, 2:]) & (ids > 0)
    rgba[:, halo] = np.array([21, 44, 53, 205], dtype=np.uint8)[:, None]
    rgba[:, core & (ids > 0)] = np.array([233, 246, 244, 245], dtype=np.uint8)[:, None]
    return rgba
