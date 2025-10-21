declare module '@luigivampa/radio-browser-api' {
  export interface Station {
    id: string;
    name: string;
    url: string;
    urlResolved?: string;
    tags: string[];
    language?: string[];
    favicon?: string;
    homepage?: string;
    geoLat?: number | null;
    geoLong?: number | null;
    [key: string]: any;
  }

  export class RadioBrowserApi {
    constructor(userAgent?: string);
    setBaseUrl(url: string): void;
    searchStations(params: Record<string, any>): Promise<Station[]>;
    sendStationClick(stationId: string): Promise<void>;
  }
}

