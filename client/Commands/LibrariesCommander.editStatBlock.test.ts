import { StatBlock } from "../../common/StatBlock";
import { Listing } from "../Library/Listing";
import { LibrariesCommander } from "./LibrariesCommander";

function buildStatBlockListing(
  id: string,
  name: string,
  challenge: string,
  origin: "localAsync" | "server" = "localAsync"
) {
  const statBlock: StatBlock = {
    ...StatBlock.Default(),
    Id: id,
    Name: name,
    Path: "",
    Challenge: challenge
  };
  return new Listing<StatBlock>(
    {
      Id: id,
      Name: name,
      Path: "",
      Link: "",
      SearchHint: "",
      FilterDimensions: { Level: challenge },
      LastUpdateMs: 0
    },
    origin,
    statBlock
  );
}

describe("LibrariesCommander.EditStatBlock", () => {
  test("opens the specific listing that was clicked, not a same-name sibling", () => {
    const minion = buildStatBlockListing("minion-id", "Goblin", "Minion");
    const half = buildStatBlockListing("half-id", "Goblin", "1/2");

    const trackerEditStatBlock = jest.fn();
    const commander = new LibrariesCommander(
      {
        TutorialVisible: () => false,
        EditStatBlock: trackerEditStatBlock
      } as any,
      null as any
    );

    const library = {
      GetAllListings: () => [minion, half],
      SaveEditedListing: jest.fn(),
      SaveNewListing: jest.fn()
    } as any;

    commander.EditStatBlock(minion, library);
    expect(trackerEditStatBlock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        statBlock: expect.objectContaining({ Id: "minion-id", Challenge: "Minion" })
      })
    );

    commander.EditStatBlock(half, library);
    expect(trackerEditStatBlock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        statBlock: expect.objectContaining({ Id: "half-id", Challenge: "1/2" })
      })
    );
  });
});
