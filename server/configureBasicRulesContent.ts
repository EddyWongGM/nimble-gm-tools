import * as express from "express";

import { SavedEncounter } from "../common/SavedEncounter";
import { Spell } from "../common/Spell";
import { StatBlock } from "../common/StatBlock";
import { Library } from "./library";
import { Req, Res } from "./routes";

export function configureBasicRulesContent(app: express.Application) {
  const statBlockLibrary = Library.FromFile<StatBlock>(
    "preload-content/monster_starter_set.json",
    "/statblocks/",
    StatBlock.GetSearchHint,
    StatBlock.FilterDimensions
  );

  app.get(statBlockLibrary.Route(), (req: Req, res: Res) => {
    res.json(statBlockLibrary.GetListings());
  });

  app.get(statBlockLibrary.Route() + ":id", (req: Req, res: Res) => {
    res.json(statBlockLibrary.GetById(req.params.id));
  });

  const monsterBuilderSetLibrary = Library.FromFile<StatBlock>(
    "preload-content/monster_builder_set.json",
    "/monster-builder-set/",
    StatBlock.GetSearchHint,
    StatBlock.FilterDimensions
  );

  app.get(monsterBuilderSetLibrary.Route(), (req: Req, res: Res) => {
    res.json(monsterBuilderSetLibrary.GetListings());
  });

  app.get(monsterBuilderSetLibrary.Route() + ":id", (req: Req, res: Res) => {
    res.json(monsterBuilderSetLibrary.GetById(req.params.id));
  });

  const spellLibrary = Library.FromFile<Spell>(
    "preload-content/compendium_starter_set.json",
    "/spells/",
    Spell.GetSearchHint,
    Spell.GetFilterDimensions
  );

  app.get(spellLibrary.Route(), (req: Req, res: Res) => {
    res.json(spellLibrary.GetListings());
  });

  app.get(spellLibrary.Route() + ":id", (req: Req, res: Res) => {
    res.json(spellLibrary.GetById(req.params.id));
  });

  const heroesTutorialSetLibrary = Library.FromFile<StatBlock>(
    "preload-content/heroes_tutorial_set.json",
    "/heroes-tutorial-set/",
    StatBlock.GetSearchHint,
    StatBlock.FilterDimensions
  );

  app.get(heroesTutorialSetLibrary.Route(), (req: Req, res: Res) => {
    res.json(heroesTutorialSetLibrary.GetListings());
  });

  app.get(heroesTutorialSetLibrary.Route() + ":id", (req: Req, res: Res) => {
    res.json(heroesTutorialSetLibrary.GetById(req.params.id));
  });

  const heroesStarterSetLibrary = Library.FromFile<StatBlock>(
    "preload-content/heroes_starter_set.json",
    "/heroes-starter-set/",
    StatBlock.GetSearchHint,
    StatBlock.FilterDimensions
  );

  app.get(heroesStarterSetLibrary.Route(), (req: Req, res: Res) => {
    res.json(heroesStarterSetLibrary.GetListings());
  });

  app.get(heroesStarterSetLibrary.Route() + ":id", (req: Req, res: Res) => {
    res.json(heroesStarterSetLibrary.GetById(req.params.id));
  });

  const encountersStarterSetLibrary = Library.FromFile<SavedEncounter>(
    "preload-content/encounters_starter_set.json",
    "/encounters-starter-set/",
    SavedEncounter.GetSearchHint,
    () => ({})
  );

  app.get(encountersStarterSetLibrary.Route(), (req: Req, res: Res) => {
    res.json(encountersStarterSetLibrary.GetListings());
  });

  app.get(
    encountersStarterSetLibrary.Route() + ":id",
    (req: Req, res: Res) => {
      res.json(encountersStarterSetLibrary.GetById(req.params.id));
    }
  );
}
