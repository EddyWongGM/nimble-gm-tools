import { Redis } from "ioredis";
import { EncounterState } from "../common/EncounterState";
import { PlayerViewCombatantState } from "../common/PlayerViewCombatantState";
import { PlayerViewState } from "../common/PlayerViewState";
import { getDefaultSettings } from "../common/Settings";
import { probablyUniqueString, ParseJSONOrDefault } from "../common/Toolbox";
import { PlayerViewManager } from "./playerviewmanager";

export class RedisPlayerViewManager implements PlayerViewManager {
  constructor(private redisClient: Redis) {}

  public async Get(id: string): Promise<PlayerViewState> {
    const fields = await this.redisClient.hgetall(`playerviews_${id}`);
    const defaultPlayerView = {
      encounterState: EncounterState.Default<PlayerViewCombatantState>(),
      settings: getDefaultSettings().PlayerView
    };

    return {
      encounterState: ParseJSONOrDefault(
        fields.encounterState,
        defaultPlayerView.encounterState
      ),
      settings: ParseJSONOrDefault(fields.settings, defaultPlayerView.settings),
      hasEpicInitiative: fields.hasEpicInitiative === "true"
    };
  }

  public async IdAvailable(id: string): Promise<boolean> {
    const fields = await this.redisClient.hgetall(`playerviews_${id}`);
    return Object.keys(fields).length == 0;
  }

  public async UpdateEncounter(
    id: string,
    newState: any,
    hasEpicInitiative: boolean
  ): Promise<void> {
    this.redisClient.hset(`playerviews_${id}`, {
      encounterState: JSON.stringify(newState),
      hasEpicInitiative: hasEpicInitiative.toString()
    });
  }

  public async UpdateSettings(
    id: string,
    newSettings: any,
    hasEpicInitiative: boolean
  ): Promise<void> {
    this.redisClient.hset(`playerviews_${id}`, {
      settings: JSON.stringify(newSettings),
      hasEpicInitiative: hasEpicInitiative.toString()
    });
  }

  public async InitializeNew(): Promise<string> {
    const id = probablyUniqueString();

    await this.redisClient.hset(`playerviews_${id}`, {
      encounterState: JSON.stringify(
        EncounterState.Default<PlayerViewCombatantState>()
      ),
      settings: JSON.stringify(getDefaultSettings().PlayerView),
      hasEpicInitiative: "false"
    });
    return id;
  }

  public async Destroy(id: string): Promise<void> {
    this.redisClient.hdel(
      `playerviews_${id}`,
      "encounterState",
      "settings",
      "hasEpicInitiative"
    );
  }
}
