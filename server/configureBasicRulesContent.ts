import * as express from "express";

import { Spell } from "../common/Spell";
import { StatBlock } from "../common/StatBlock";
import { Library } from "./library";
import { Req, Res } from "./routes";

export function configureBasicRulesContent(app: express.Application) {
  const statBlockLibrary = Library.FromFile<StatBlock>(
    "basic_rules_creatures.json",
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

  const spellLibrary = Library.FromFile<Spell>(
    "basic_rules_spells.json",
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

  const heroLibrary = Library.FromFile<StatBlock>(
    "tutorial_heroes.json",
    "/heroes/",
    StatBlock.GetSearchHint,
    StatBlock.FilterDimensions
  );

  app.get(heroLibrary.Route(), (req: Req, res: Res) => {
    res.json(heroLibrary.GetListings());
  });

  app.get(heroLibrary.Route() + ":id", (req: Req, res: Res) => {
    res.json(heroLibrary.GetById(req.params.id));
  });

  const basicRulesHeroLibrary = Library.FromFile<StatBlock>(
    "basic_rules_heroes.json",
    "/basic-rules-heroes/",
    StatBlock.GetSearchHint,
    StatBlock.FilterDimensions
  );

  app.get(basicRulesHeroLibrary.Route(), (req: Req, res: Res) => {
    res.json(basicRulesHeroLibrary.GetListings());
  });

  app.get(basicRulesHeroLibrary.Route() + ":id", (req: Req, res: Res) => {
    res.json(basicRulesHeroLibrary.GetById(req.params.id));
  });
}
