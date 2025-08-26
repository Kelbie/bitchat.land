import {
  geoGnomonic,
  geoStereographic,
  geoAlbersUsa,
  geoAzimuthalEqualArea,
  geoMercator,
  geoNaturalEarth1,
  geoAlbers,
  geoAzimuthalEquidistant,
} from "d3-geo";
import { geoImago } from "d3-geo-polygon";

export const PROJECTIONS: { [key: string]: any } = {
  // authagraph: geoImago,
  mercator: geoMercator,
  albers: geoAlbers,
  // albers_usa: geoAlbersUsa,
  stenographic: geoStereographic,
  // gnomonic: geoGnomonic,
  // azimuthal_equal_area: geoAzimuthalEqualArea,
  natural_earth: geoNaturalEarth1,
  // azimuthal_equidist: geoAzimuthalEquidistant,
};

export const NOSTR_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://offchain.pub",
  "wss://nostr21.com",
];

export const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

export const background = "#000000";
