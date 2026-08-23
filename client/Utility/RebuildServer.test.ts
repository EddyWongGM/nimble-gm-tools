import axios from "axios";
import { env } from "../Environment";
import { RebuildServer } from "./RebuildServer";

const axiosMock = axios as jest.Mocked<typeof axios>;

describe("RebuildServer", () => {
  afterEach(() => {
    axiosMock.post.mockReset();
    env.RebuildToken = null;
  });

  test("posts the environment's RebuildToken to /rebuild as JSON", async () => {
    env.RebuildToken = "test-rebuild-token";
    axiosMock.post.mockResolvedValue({ status: 200 });

    await RebuildServer();

    expect(axiosMock.post).toHaveBeenCalledWith(
      "/rebuild",
      { token: "test-rebuild-token" },
      { headers: { "content-type": "application/json" } }
    );
  });

  test("propagates a request failure to the caller", async () => {
    env.RebuildToken = "test-rebuild-token";
    const error = new Error("Network Error");
    axiosMock.post.mockRejectedValue(error);

    await expect(RebuildServer()).rejects.toThrow("Network Error");
  });
});
