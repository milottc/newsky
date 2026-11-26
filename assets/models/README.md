# Aircraft 3D models

| File | Aircraft | Source |
| --- | --- | --- |
| `b738.glb` | Boeing 737-800 | [Flightradar24 3D models](https://github.com/kalmykov/fr24-3d-models) (`models/b738.glb`), from the [FlightGear 737-800](https://github.com/FGMEMBERS/737-800) |
| `b738-cockpit.glb` | Boeing 737-800 flight deck + nose shell | [FlightGear 737-800](https://github.com/FGMEMBERS/737-800) (`Models/cockpit.xml`, `Models/737-800.ac`), converted with `tools/ac2glb.py` |
| `b773.glb` | Boeing 777-300 | [Flightradar24 3D models](https://github.com/kalmykov/fr24-3d-models) (`models/b773.glb`), from the FlightGear 777 |

These models are licensed under the **GNU General Public License v2** (see `LICENSE-GPLv2.txt`).
Credit: the FlightGear project and FGMEMBERS contributors, and Flightradar24 for the glTF conversions.

Changes made here: converted from glTF 1.0 to glTF 2.0 with
[gltf-pipeline](https://github.com/CesiumGS/gltf-pipeline) (`gltf-pipeline -i b738.glb -o b738.glb`).
Materials are adjusted at runtime in `game.js` (gloss / clear coat); the files themselves are otherwise unmodified.

The flight deck was built from the FlightGear AC3D files with `tools/ac2glb.py`
(a shell `.xml` including `737-800.ac` and `cockpit.xml`; the shell is cropped to the nose, the landing-light
model is skipped, and the six display screens are kept as separate `SCREEN_*` meshes so the sim can
paint its live PFD / ND / EICAS onto them). The missing shared FlightGear CDU model is not included.
