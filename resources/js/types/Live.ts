export type LiveConfig =
    | { enabled: false }
    | {
          enabled: true;
          /** Public Reverb app key (never the secret). */
          key: string;
          host: string;
          port: number;
          scheme: 'http' | 'https';
      };

/** The enabled shape of `LiveConfig`, i.e. what Echo needs to connect. */
export type LiveConnection = Extract<LiveConfig, { enabled: true }>;
