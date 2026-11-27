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
| `a319.glb`, `a320.glb`, `a321.glb`, `a333.glb`, `a346.glb`, `a359.glb`, `cs300.glb`, `b752.glb`, `b763.glb`, `b789.glb`, `crj700.glb`, `crj900.glb`, `e170.glb`, `e190.glb`, `bae146.glb`, `q400.glb`, `atr42.glb`, `citation.glb` | Airbus A319/A320/A321/A330-300/A340-600/A350-900, A220-300 (CS300), Boeing 757-200/767-300/787-9, CRJ-700/900, E170/E190, BAe 146, Dash 8 Q400, ATR 42, Cessna Citation | [Flightradar24 3D models](https://github.com/kalmykov/fr24-3d-models) (FlightGear-derived, GPLv2), converted to glTF 2.0. Close relatives stand in for some types (CRJ-700 for the CRJ-200, E170 for the E175, ATR 42 for the ATR 72, BAe 146 for the Avro RJ100, 787-9 for the 787-10, Citation for the Citation X), stretched to length. |
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

`DAL`, `AAL`, `UAL`, `KAL`, `KLM-800`, `QFA-800`, `RYR-800`, `THY-800`, `ASA`, `C-GWSZ`, `TUI-800`, `9M-MXA`, `AMO`, `ARG-800`, `AVA`, `CMP`, `GIA`, `CAL`, `MSR-new` (from `MSR new.png`), `Jet2`, `SKY-800`, `nok`, `AEA-skyteam`, `TRA-800`, `BER`, `AJA` and `base.png` come from the
[FlightGear 737-800](https://github.com/FGMEMBERS/737-800) `Models/Liveries-800` (GPLv2, FlightGear livery
authors). Other airlines are painted at runtime onto `base.png` from the colours in `LIVS` (`game.js`).
Airline names and logos are trademarks of their owners.
