export interface ClientEnvironment {
  EncounterId: string;
  PostedEncounter: { Combatants: object[] } | null;
  IsLoggedIn: boolean;
  HasStorage: boolean;
  HasEpicInitiative: boolean;
  HasMythic: boolean;
  BaseUrl: string;
  PatreonLoginUrl: string;
  SendMetrics: boolean;
  GoogleAnalyticsId: string;
  SentryDSN: string | null;
  CanShutdownServer: boolean;
  ShutdownToken: string | null;
  CanRebuildServer: boolean;
  RebuildToken: string | null;
}
