# Campus gallery interior assets — 2026-10-30

Three original, unmodified low-poly GLB props selected for the designer campus gallery. Models are decorative stand-ins, not representations of real campus furnishings.

## Primary provenance and license

- Author/distributor: Kenney, [official Furniture Kit page](https://kenney.nl/assets/furniture-kit).
- Official download: [kenney_furniture-kit.zip](https://kenney.nl/media/pages/assets/furniture-kit/440e0608a4-1677580847/kenney_furniture-kit.zip?download=1).
- Retrieved 2026-10-30 directly from kenney.nl with curl. The download required the official page as Referer, a browser User-Agent, and the `download=1` query parameter.
- The official page labels the pack Creative Commons CC0. The archive's original `License.txt` identifies “Furniture Kit (2.0)”, created/distributed by Kenney, creation date 2018-10-20, and Creative Commons Zero (CC0).
- [CC0 1.0 deed](https://creativecommons.org/publicdomain/zero/1.0/) permits copying, modifying, distributing and commercial use without permission. Attribution is optional; suggested credit: “Furniture by Kenney.nl (CC0)”.
- Original archive license copied verbatim to `public/assets/models/KENNEY-FURNITURE-LICENSE.txt`.
- Archive SHA256: `e67652d0932cee41683f74711c03d3e192a2af9979ef8e6b237711f5482d46b0`.

## Selected files

Files are copied byte-for-byte from `Models/GLTF format/` in the archive to `public/assets/models/`. Only these three GLBs and the license are shipped. The complete 5 MB download remains temporary and is not included in the project.

| File | Bytes | Native bounds size X × Y × Z | Native minimum X, Y, Z | Native maximum X, Y, Z |
| --- | ---: | --- | --- | --- |
| `pottedPlant.glb` | 7,576 | 0.212059 × 0.654017 × 0.241462 | -0.106030, 0.000000, -0.120731 | 0.106030, 0.654017, 0.120731 |
| `benchCushionLow.glb` | 10,268 | 0.420000 × 0.200000 × 0.220000 | -0.010000, 0.000000, -0.210000 | 0.410000, 0.200000, 0.010000 |
| `bookcaseOpen.glb` | 18,020 | 0.400000 × 0.880000 × 0.250000 | 0.000000, 0.000000, -0.250000 | 0.400000, 0.880000, 0.000000 |

The three models total 35,864 bytes; with the 614-byte original license, the shipped asset bundle is 36,478 bytes (under 1 MB).

- `pottedPlant.glb`: faceted green foliage and wooden planter; use for gallery greenery.
- `benchCushionLow.glb`: low wood-frame cushioned bench; use for the gallery waiting area.
- `bookcaseOpen.glb`: open wood display shelving; use as a display cabinet stand-in. It has no glass or display objects.

## Loading and placement notes

All are glTF 2.0 binary files exported by UniGLTF 1.24. Materials use embedded scalar PBR values; no external buffers, textures, image downloads, Draco or other decoder dependencies are required. All are Y-up with base at Y=0. Native units are not meter-sized furniture: normalize size using Three.js `Box3.setFromObject` and center the X/Z footprint before placement. Bounds above include node transforms (in particular, the potted plant root has scale 2 and its child has scale 0.5). The bench and shelving origins sit near a corner rather than at their footprint center. Preserve floor contact by subtracting the transformed bounds minimum Y.

Verification: parsed each GLB header and JSON chunk, checked glTF version 2.0, checked buffers have no external URI, confirmed no images, and calculated combined geometry bounds through the complete node hierarchy. Application code and vendor files were not changed by this asset task.
