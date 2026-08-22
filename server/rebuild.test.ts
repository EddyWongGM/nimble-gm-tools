import { EventEmitter } from "events";

jest.mock("child_process");

import { spawn } from "child_process";
import { isRebuildInProgress, rebuildClient } from "./rebuild";

const mockedSpawn = spawn as jest.Mock;

class FakeChildProcess extends EventEmitter {
  public stdout = new EventEmitter();
  public stderr = new EventEmitter();
}

describe("rebuildClient / isRebuildInProgress", () => {
  beforeEach(() => {
    mockedSpawn.mockReset();
  });

  function queueFakeChild(): FakeChildProcess {
    const child = new FakeChildProcess();
    mockedSpawn.mockReturnValueOnce(child);
    return child;
  }

  test("resolves success with combined stdout/stderr output when the build exits 0", async () => {
    const child = queueFakeChild();

    const resultPromise = rebuildClient();
    expect(isRebuildInProgress()).toBe(true);

    child.stdout.emit("data", "compiling...\n");
    child.stderr.emit("data", "a warning\n");
    child.emit("close", 0);

    const result = await resultPromise;
    expect(result).toEqual({
      success: true,
      output: "compiling...\na warning\n"
    });
    expect(isRebuildInProgress()).toBe(false);
  });

  test("resolves failure with a non-zero exit code", async () => {
    const child = queueFakeChild();

    const resultPromise = rebuildClient();
    child.stdout.emit("data", "something went wrong\n");
    child.emit("close", 1);

    const result = await resultPromise;
    expect(result.success).toBe(false);
    expect(result.output).toContain("something went wrong");
  });

  test("resolves failure when the spawned process emits an error event (e.g. npm not found)", async () => {
    const child = queueFakeChild();

    const resultPromise = rebuildClient();
    child.emit("error", new Error("spawn npm ENOENT"));

    const result = await resultPromise;
    expect(result.success).toBe(false);
    expect(result.output).toContain("spawn npm ENOENT");
  });

  test("resolves failure instead of crashing when spawn throws synchronously (e.g. Windows EINVAL)", async () => {
    mockedSpawn.mockImplementationOnce(() => {
      throw new Error("spawn EINVAL");
    });

    const result = await rebuildClient();

    expect(result.success).toBe(false);
    expect(result.output).toContain("spawn EINVAL");
    expect(isRebuildInProgress()).toBe(false);
  });

  test("a second call while a build is running returns the same in-flight promise instead of spawning again", async () => {
    const child = queueFakeChild();

    const first = rebuildClient();
    const second = rebuildClient();
    expect(mockedSpawn).toHaveBeenCalledTimes(1);
    expect(isRebuildInProgress()).toBe(true);

    child.emit("close", 0);

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult).toEqual(secondResult);
    expect(isRebuildInProgress()).toBe(false);
  });

  test("a call after a previous build finished spawns a fresh build", async () => {
    const firstChild = queueFakeChild();

    const firstResultPromise = rebuildClient();
    firstChild.emit("close", 0);
    await firstResultPromise;

    const secondChild = queueFakeChild();
    const secondResultPromise = rebuildClient();
    secondChild.emit("close", 0);
    await secondResultPromise;

    expect(mockedSpawn).toHaveBeenCalledTimes(2);
  });
});
