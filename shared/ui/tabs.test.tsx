import { describe, expect, test, beforeEach } from "bun:test";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";

// Auto-cleanup doesn't reliably run between files — clear explicitly so
// renders from a previous test never overlap this one.
beforeEach(() => cleanup());

function Example() {
  const [tab, setTab] = useState("videos");
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="videos">Videos</TabsTrigger>
        <TabsTrigger value="playlists">Playlists</TabsTrigger>
      </TabsList>
      <TabsContent value="videos">video panel</TabsContent>
      <TabsContent value="playlists">playlist panel</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  test("renders the active panel and hides the other", () => {
    render(<Example />);
    expect(screen.getByText("video panel")).toBeTruthy();
    expect(screen.queryByText("playlist panel")).toBeNull();
    const videos = screen.getByRole("tab", { name: "Videos" });
    expect(videos.getAttribute("aria-selected")).toBe("true");
  });

  test("clicking a trigger switches panels", () => {
    render(<Example />);
    fireEvent.click(screen.getByRole("tab", { name: "Playlists" }));
    expect(screen.getByText("playlist panel")).toBeTruthy();
    expect(screen.queryByText("video panel")).toBeNull();
    expect(
      screen.getByRole("tab", { name: "Playlists" }).getAttribute("aria-selected")
    ).toBe("true");
    expect(
      screen.getByRole("tab", { name: "Videos" }).getAttribute("aria-selected")
    ).toBe("false");
  });
});