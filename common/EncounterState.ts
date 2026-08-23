import { SceneImageFit } from "./PlayerViewSettings";

export interface EncounterSaveDefaults {
  Name: string;
  Path: string;
}

export interface EncounterState<T> {
  ActiveCombatantId: string | null;
  RoundCounter?: number;
  ElapsedSeconds?: number;
  BackgroundImageUrl?: string;
  BackgroundImageFit?: SceneImageFit;
  SaveEncounterDefaults?: EncounterSaveDefaults | null;
  MonstersActFirst?: boolean;
  CombatantsHidden?: boolean;
  Combatants: T[];
}

export namespace EncounterState {
  export function Default<T>(): EncounterState<T> {
    return {
      ActiveCombatantId: null,
      RoundCounter: 0,
      ElapsedSeconds: 0,
      BackgroundImageFit: "cover",
      SaveEncounterDefaults: null,
      MonstersActFirst: false,
      CombatantsHidden: false,
      Combatants: []
    };
  }
}
