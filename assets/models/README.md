# Aircraft 3D models

| File | Aircraft | Source |
| --- | --- | --- |
| `b738.glb` | Boeing 737-800 | [Flightradar24 3D models](https://github.com/kalmykov/fr24-3d-models) (`models/b738.glb`), from the [FlightGear 737-800](https://github.com/FGMEMBERS/737-800) |
| `b738-cockpit.glb` | Boeing 737-800 flight deck + nose shell | [FlightGear 737-800](https://github.com/FGMEMBERS/737-800) (`Models/cockpit.xml`, `Models/737-800.ac`), converted with `tools/ac2glb.py` |
| `b744.glb` | Boeing 747-400 | [Flightradar24 3D models](https://github.com/kalmykov/fr24-3d-models) (`models/b744.glb`), from the FlightGear 747-400 |
| `dc10.glb` | McDonnell Douglas DC-10-30 | [FlightGear DC-10-30](https://github.com/FGMEMBERS/DC-10-30) (fuselage, wings, tail and engines; gear, flight deck and effects left out), converted with `tools/ac2glb.py` |
| `a380.glb` | Airbus A380-800 | [Flightradar24 3D models](https://github.com/kalmykov/fr24-3d-models) (`models/a380.glb`), from FlightGear |
| `b717.glb` | Boeing 717-200 (also used, length-stretched, for the DC-9 and MD-83) | [FlightGear 717](https://github.com/FGMEMBERS/717) by Skyop and Gary Neely, GPLv2 (gear left out), converted with `tools/ac2glb.py` |
| `c172.glb` | Cessna 172P exterior and cabin | [FlightGear c172p](https://github.com/FGMEMBERS/c172p) by David Megginson and FlightGear contributors, GPLv2 (light cones and strobe/beacon flares left out; shared FlightGear instruments not included), converted with `tools/ac2glb.py` |
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

## Liveries for the real 737-800 (`assets/liveries/b738/`)

`DAL`, `AAL`, `UAL`, `KAL`, `KLM-800`, `QFA-800`, `RYR-800`, `THY-800` and `base.png` come from the
[FlightGear 737-800](https://github.com/FGMEMBERS/737-800) `Models/Liveries-800` (GPLv2, FlightGear livery
authors). Other airlines are painted at runtime onto `base.png` from the colours in `LIVS` (`game.js`).
Airline names and logos are trademarks of their owners.
