# @juno/geo

Offline birth-place lookup and local-time → UTC conversion for the
onboarding form. Pure TypeScript, no runtime I/O; the city list is a
bundled JSON asset.

## Data

`src/data/cities.json` is generated from the GeoNames `cities15000` dump
(all Turkish entries plus every city with population ≥ 100 000 elsewhere)
by `scripts/build-cities.mjs`. GeoNames data is licensed
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); the app must
credit "GeoNames (geonames.org)" in its about/legal screen.

Regenerate:

```bash
curl -sSLO https://download.geonames.org/export/dump/cities15000.zip
unzip -o cities15000.zip
npm run build:cities -w packages/geo -- ./cities15000.txt
```

The output is byte-canonical (the directory is prettier-ignored); a rerun
on the same dump produces no diff.

## Time zones

`localToUtc` relies on `Intl.DateTimeFormat` with an IANA `timeZone`, so
historical daylight-saving rules come from the platform's ICU/tzdata, not
from this package. On a fall-back overlap the earlier instant is chosen;
inside a spring-forward gap the offset in force before the transition is
applied (the same convention as date-fns-tz).
