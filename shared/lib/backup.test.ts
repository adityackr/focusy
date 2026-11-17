import { describe, expect, test, beforeEach } from "bun:test";
import { useLibrary, LIBRARY_STORAGE_KEY } from "../store/library";
import { getApiKey, setApiKey } from "./storage";
import {
  addNote,
  allNotes,
  invalidateNotesCache,
  LEGACY_NOTE_STORAGE_PREFIX,
  migrateLegacyNotes,
  NOTES_STORAGE_PREFIX,
  type NoteSource,
} from "./learning-notes";
import {
  applyBackup,
  BACKUP_VERSION,
  backupFileName,
  backupPreview,
  backupReminder,
  backupSummary,
  collectBackup,
  dismissBackupReminder,
  downloadBackup,
  mergeBackup,
  parseBackup,
  PREVIOUS_BACKUP_VERSION,
  readLastBackup,
  recordLastBackup,
  serializeBackup,
  STUDIO_BACKUP_SECTION_VERSION,
} from "./backup";
import type { Course, Playlist } from "./types";

function makePlaylist(id: string, addedAt: string): Playlist {
  return {
    playlistId: id,
    playlistTitle: `Playlist ${id}`,
    playlistDescription: "desc",
    playlistThumbnail: { url: "", width: 320, height: 180 },
    channelId: "chan",
    channelTitle: "Channel",
    itemCount: 1,
    videos: [
      {
        videoId: `${id}-v1`,
        title: "Lesson",
        description: "",
        thumbnail: { url: "", width: 320, height: 180 },
        position: 0,
        durationSeconds: 120,
      },
    ],
    addedAt,
  };
}

function makeCourse(id: string): Course {
  return {
    id,
    videoId: "abcdefghijk",
    title: `Course ${id}`,
    thumbnail: "",
    description: "",
    durationSeconds: null,
    chapters: [{ id: `${id}-c1`, title: "Intro", startSeconds: 0, endSeconds: 30 }],
    createdAt: 10,
  };
}

function resetLibrary() {
  useLibrary.setState({
    playlists: {},
    order: [],
    favorites: [],
    recent: [],
    courses: {},
    courseOrder: [],
    courseFavorites: [],
    courseRecent: [],
    categories: {},
    categoryOrder: [],
    loadingIds: [],
    error: null,
  });
}

function seed() {
  const api = useLibrary.getState();
  api.addPlaylist(makePlaylist("PL1", "2024-01-01"));
  api.toggleFavorite("PL1");
  api.addCourse(makeCourse("C1"));
  const folder = api.addCategory("Design")!;
  useLibrary.getState().setPlaylistCategory("PL1", folder);

  localStorage.setItem(
    "focustube:progress:PL1",
    JSON.stringify({
      watched: ["PL1-v1"],
      lastWatched: "PL1-v1",
      completedChapters: ["PL1-v1:0"],
      positions: { "PL1-v1": 42 },
    })
  );
  localStorage.setItem(
    "yt-course:progress:C1",
    JSON.stringify({
      completedIds: ["C1-c1"],
      lastChapterId: "C1-c1",
      updatedAt: 123,
      positions: { "C1-c1": 12 },
    })
  );
  localStorage.setItem(
    "focustube:note:PL1-v1",
    JSON.stringify({ text: "# Idea", updatedAt: 456 })
  );
  // Production migrates on module load; tests seed after that, so do it here.
  migrateLegacyNotes();
}

beforeEach(() => {
  localStorage.clear();
  invalidateNotesCache();
  resetLibrary();
});

describe("backup export", () => {
  test("round-trips library, progress and notes through a file", () => {
    seed();
    const json = serializeBackup(collectBackup());

    // Start from a clean browser, as if this were another device.
    localStorage.clear();
    resetLibrary();
    expect(useLibrary.getState().playlists).toEqual({});

    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    applyBackup(parsed.backup);

    const state = useLibrary.getState();
    expect(Object.keys(state.playlists)).toEqual(["PL1"]);
    expect(state.playlists.PL1.videos[0].durationSeconds).toBe(120);
    expect(state.favorites).toEqual(["PL1"]);
    expect(Object.keys(state.courses)).toEqual(["C1"]);
    const folderId = state.categoryOrder[0];
    expect(state.categories[folderId].name).toBe("Design");
    expect(state.playlists.PL1.categoryId).toBe(folderId);

    expect(
      JSON.parse(localStorage.getItem("focustube:progress:PL1")!)
    ).toEqual({
      watched: ["PL1-v1"],
      lastWatched: "PL1-v1",
      completedChapters: ["PL1-v1:0"],
      positions: { "PL1-v1": 42 },
    });
    expect(
      JSON.parse(localStorage.getItem("yt-course:progress:C1")!).positions
    ).toEqual({ "C1-c1": 12 });
    expect(localStorage.getItem("focustube:note:PL1-v1")).toBeNull();
    expect(allNotes()).toMatchObject([
      {
        id: "legacy:PL1-v1",
        videoId: "PL1-v1",
        markdown: "# Idea",
        timeSeconds: null,
        source: null,
      },
    ]);
  });

  test("round-trips timestamped Markdown notes with their sources", () => {
    const source: NoteSource = {
      kind: "playlist",
      playlistId: "PL1",
      videoId: "PL1-v1",
      title: "Lesson one",
    };
    const added = addNote({
      videoId: "PL1-v1",
      markdown: "# Deep note\n\n```ts\nconst x = 1;\n```",
      timeSeconds: 42.8,
      source,
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;

    const backup = collectBackup();
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.learningNotes["PL1-v1"]).toHaveLength(1);

    const json = serializeBackup(backup);
    localStorage.clear();
    invalidateNotesCache();
    resetLibrary();

    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    applyBackup(parsed.backup);

    expect(allNotes()).toMatchObject([
      {
        id: added.value.id,
        videoId: "PL1-v1",
        markdown: added.value.markdown,
        timeSeconds: 42,
        source,
        createdAt: added.value.createdAt,
        updatedAt: added.value.updatedAt,
      },
    ]);
  });

  test("does not resurrect deleted notes from stale legacy keys", () => {
    localStorage.setItem(
      LEGACY_NOTE_STORAGE_PREFIX + "vid-1",
      JSON.stringify({ text: "deleted after migration", updatedAt: 1 })
    );
    addNote({ videoId: "vid-1", markdown: "current note", timeSeconds: 5 });

    const backup = collectBackup();
    expect(backup.learningNotes["vid-1"]).toHaveLength(1);

    const parsed = parseBackup(serializeBackup(backup));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    applyBackup(parsed.backup);

    expect(allNotes().map((note) => note.markdown)).toEqual(["current note"]);
    expect(localStorage.getItem(LEGACY_NOTE_STORAGE_PREFIX + "vid-1")).toBeNull();
  });

  test("counts timestamped notes in the preview and summary", () => {
    addNote({ videoId: "v1", markdown: "First note", timeSeconds: 5 });
    addNote({ videoId: "v2", markdown: "Second note", timeSeconds: 9 });

    const backup = collectBackup();
    expect(backupPreview(backup).notes).toBe(2);
    expect(backupSummary(backup)).toContain("2 notes");
  });

  test("never includes the API key or player settings", () => {
    seed();
    setApiKey("AIzaSecretValue");
    localStorage.setItem("focusy:player-settings", '{"rate":2}');

    const json = serializeBackup(collectBackup());

    expect(json).not.toContain("AIzaSecretValue");
    expect(json).not.toContain("api-key");
    expect(json).not.toContain("player-settings");
    expect(json).not.toContain("focustube:note:");

    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    // A restore on this device leaves the key in place…
    applyBackup(parsed.backup);
    expect(getApiKey()).toBe("AIzaSecretValue");
  });

  test("lists what the file contains, in saved order", () => {
    seed();
    const preview = backupPreview(collectBackup());

    expect(preview.playlists).toEqual(["Playlist PL1"]);
    expect(preview.videos).toEqual(["Course C1"]);
    expect(preview.folders).toEqual(["Design"]);
    expect(preview.playlistProgress).toBe(1);
    expect(preview.courseProgress).toBe(1);
    expect(preview.notes).toBe(1);
  });

  test("names the file after the export date", () => {
    expect(backupFileName(new Date("2026-11-05T10:00:00Z"))).toBe(
      "focusy-backup-2026-11-05.json"
    );
  });

  test("includes an optional Studio project section", () => {
    seed();
    const studio = {
      version: STUDIO_BACKUP_SECTION_VERSION,
      activeWorkspaceId: "ws-1",
      order: ["ws-1"],
      workspaces: [{ id: "ws-1" }],
    };

    const backup = collectBackup(studio);
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.studio).toEqual(studio);

    const parsed = parseBackup(serializeBackup(backup));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.studio).toEqual(studio);
    expect(backupPreview(parsed.backup).studioProjects).toBe(1);
    expect(backupSummary(parsed.backup)).toContain("1 Studio project");
  });
});

describe("backup import", () => {
  test("rejects files that are not Focusy backups", () => {
    expect(parseBackup("not json").ok).toBe(false);
    expect(parseBackup("[]").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: "other", version: 1 })).ok).toBe(false);
  });

  test("rejects an unknown version with a readable message", () => {
    seed();
    const backup = collectBackup();
    const result = parseBackup(JSON.stringify({ ...backup, version: 99 }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("version");
  });

  test("rejects a backup without library data", () => {
    const result = parseBackup(JSON.stringify({ app: "focusy", version: 1 }));
    expect(result.ok).toBe(false);
  });

  test("restoring replaces existing data instead of merging", () => {
    seed();
    const parsed = parseBackup(serializeBackup(collectBackup()));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    // A new playlist and note saved after the export must not survive.
    useLibrary.getState().addPlaylist(makePlaylist("PL2", "2024-05-01"));
    localStorage.setItem("focustube:progress:PL2", "{}");
    localStorage.setItem(
      "focustube:note:PL2-v1",
      JSON.stringify({ text: "later note", updatedAt: 1 })
    );
    addNote({ videoId: "PL2-v1", markdown: "later timestamped note" });

    applyBackup(parsed.backup);

    expect(Object.keys(useLibrary.getState().playlists)).toEqual(["PL1"]);
    expect(localStorage.getItem("focustube:progress:PL2")).toBeNull();
    expect(localStorage.getItem("focustube:note:PL2-v1")).toBeNull();
    expect(localStorage.getItem(NOTES_STORAGE_PREFIX + "PL2-v1")).toBeNull();
  });

  test("tolerates junk entries without losing the good ones", () => {
    seed();
    const raw = JSON.parse(serializeBackup(collectBackup()));
    raw.playlistProgress["broken"] = "nope";
    raw.notes["broken"] = { text: "   " };
    raw.learningNotes = {
      "PL1-v1": [
        { id: "", markdown: "no id" },
        { id: "blank", markdown: "   " },
        {
          id: "fine",
          videoId: "somewhere-else",
          markdown: "kept",
          timeSeconds: 2,
          createdAt: 5,
          updatedAt: 6,
        },
      ],
      broken: "nope",
    };

    const parsed = parseBackup(JSON.stringify(raw));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.playlistProgress.broken).toBeUndefined();
    expect(parsed.backup.notes.broken).toBeUndefined();
    expect(parsed.backup.learningNotes.broken).toBeUndefined();
    expect(parsed.backup.learningNotes["PL1-v1"].map((note) => note.id)).toEqual([
      "fine",
    ]);
    expect(parsed.backup.playlistProgress.PL1.watched).toEqual(["PL1-v1"]);
    expect(parsed.backup.notes["PL1-v1"].text).toBe("# Idea");
  });

  test("restores version 2 files by adopting their legacy notes", () => {
    seed();
    const { learningNotes: _learningNotes, ...older } = collectBackup();

    const parsed = parseBackup(
      JSON.stringify({ ...older, version: PREVIOUS_BACKUP_VERSION })
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    localStorage.clear();
    invalidateNotesCache();
    resetLibrary();
    applyBackup(parsed.backup);

    expect(allNotes()).toMatchObject([
      {
        id: "legacy:PL1-v1",
        markdown: "# Idea",
        timeSeconds: null,
      },
    ]);
    expect(localStorage.getItem(LEGACY_NOTE_STORAGE_PREFIX + "PL1-v1")).toBeNull();
  });

  test("reads version 1 backups without Studio data", () => {
    seed();
    const current = collectBackup();
    const { studio: _studio, ...legacy } = current;

    const parsed = parseBackup(JSON.stringify({ ...legacy, version: 1 }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.studio).toBeNull();
    expect(backupPreview(parsed.backup).studioProjects).toBeNull();
    expect(backupSummary(parsed.backup)).not.toContain("Studio");
  });

  test("keeps version 2 Studio sections readable", () => {
    seed();
    const studio = {
      version: STUDIO_BACKUP_SECTION_VERSION,
      activeWorkspaceId: "ws-1",
      order: ["ws-1"],
      workspaces: [{ id: "ws-1" }],
    };
    const current = collectBackup(studio);

    const parsed = parseBackup(
      JSON.stringify({ ...current, version: PREVIOUS_BACKUP_VERSION })
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.studio?.workspaces).toEqual([{ id: "ws-1" }]);
  });

  test("rejects unreadable Studio sections instead of dropping them", () => {
    seed();
    const backup = collectBackup();
    const parsed = parseBackup(
      JSON.stringify({ ...backup, studio: { version: 99, workspaces: [] } })
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toContain("Studio");
  });
});

describe("backup merge", () => {
  test("adds the file's playlists and keeps the local ones", () => {
    seed();
    const fromOtherDevice = collectBackup();

    localStorage.clear();
    resetLibrary();
    useLibrary.getState().addPlaylist(makePlaylist("PL2", "2024-05-01"));

    const report = mergeBackup(fromOtherDevice);

    expect(report.playlistsAdded).toBe(1);
    expect(Object.keys(useLibrary.getState().playlists).sort()).toEqual([
      "PL1",
      "PL2",
    ]);
    expect(localStorage.getItem("focustube:progress:PL1")).not.toBeNull();
  });

  test("matches folders by name and remaps incoming playlists", () => {
    seed();
    const backup = collectBackup();
    const backupFolderId = useLibrary.getState().categoryOrder[0];

    // Another browser that already has a folder called "design" of its own.
    localStorage.clear();
    resetLibrary();
    const localFolderId = useLibrary.getState().addCategory("design")!;
    useLibrary.getState().addPlaylist(makePlaylist("PL1", "2024-01-01"));
    useLibrary.getState().setPlaylistCategory("PL1", localFolderId);
    useLibrary.setState((s) => ({
      playlists: {
        ...s.playlists,
        PL1: { ...s.playlists.PL1, playlistTitle: "Edited here" },
      },
    }));
    backup.library.playlists.PL3 = {
      ...makePlaylist("PL3", "2024-02-02"),
      categoryId: backupFolderId,
    };

    const report = mergeBackup(backup);

    const state = useLibrary.getState();
    expect(report.playlistsAdded).toBe(1);
    expect(state.playlists.PL1.playlistTitle).toBe("Edited here");
    expect(state.playlists.PL3.categoryId).toBe(localFolderId);
    expect(state.categoryOrder).toEqual([localFolderId]);
  });

  test("unions watch progress without moving the local resume point", () => {
    seed();
    const backup = collectBackup();
    backup.playlistProgress.PL1 = {
      watched: ["PL1-v2"],
      lastWatched: "PL1-v2",
      completedChapters: ["PL1-v1:1"],
      positions: { "PL1-v2": 10 },
    };

    mergeBackup(backup);

    expect(JSON.parse(localStorage.getItem("focustube:progress:PL1")!)).toEqual({
      watched: ["PL1-v1", "PL1-v2"],
      lastWatched: "PL1-v1",
      completedChapters: ["PL1-v1:0", "PL1-v1:1"],
      positions: { "PL1-v1": 42, "PL1-v2": 10 },
    });
  });

  test("keeps the newest note and the newest course progress", () => {
    seed();
    const backup = collectBackup();

    // Locally the note is newer than the file's, while its course progress is older.
    const local = addNote({
      videoId: "PL1-v1",
      markdown: "local draft",
      timeSeconds: 3,
    });
    expect(local.ok).toBe(true);
    if (!local.ok) return;
    backup.learningNotes["PL1-v1"] = [
      {
        ...local.value,
        markdown: "from file",
        updatedAt: local.value.updatedAt - 1,
      },
    ];
    localStorage.setItem(
      "yt-course:progress:C1",
      JSON.stringify({
        completedIds: ["C1-c1"],
        lastChapterId: "C1-c1",
        updatedAt: 100,
        positions: { "C1-c1": 5 },
      })
    );
    backup.notes["PL1-v1"] = { text: "from file", updatedAt: 456 };
    backup.courseProgress.C1 = {
      completedIds: ["C1-c1", "C1-c2"],
      lastChapterId: "C1-c2",
      updatedAt: 500,
      positions: { "C1-c2": 30 },
    };

    mergeBackup(backup);

    const note = allNotes().find((entry) => entry.id === local.value.id);
    expect(note?.markdown).toBe("local draft");
    expect(note?.timeSeconds).toBe(3);
    const course = JSON.parse(localStorage.getItem("yt-course:progress:C1")!);
    expect(course.lastChapterId).toBe("C1-c2");
    expect(course.positions).toEqual({ "C1-c2": 30 });
    expect(course.completedIds.sort()).toEqual(["C1-c1", "C1-c2"]);
  });

  test("adds a newer timestamped note from the file", () => {
    const local = addNote({
      videoId: "vid-shared",
      markdown: "local version",
      timeSeconds: 10,
    });
    expect(local.ok).toBe(true);
    if (!local.ok) return;
    const backup = collectBackup();

    backup.learningNotes["vid-shared"] = [
      {
        ...local.value,
        markdown: "newer from file",
        timeSeconds: 20,
        updatedAt: local.value.updatedAt + 1000,
      },
    ];
    backup.learningNotes["vid-new"] = [
      {
        id: "incoming-note",
        videoId: "vid-new",
        source: null,
        timeSeconds: null,
        markdown: "brand new",
        createdAt: 1,
        updatedAt: 2,
      },
    ];

    const report = mergeBackup(backup);

    expect(report.notesUpdated).toBe(2);
    expect(allNotes().find((n) => n.id === local.value.id)?.markdown).toBe(
      "newer from file"
    );
    expect(allNotes().find((n) => n.id === "incoming-note")?.markdown).toBe(
      "brand new"
    );
  });

  test("never removes data that is only in this browser", () => {
    seed();
    const backup = collectBackup();
    useLibrary.getState().addPlaylist(makePlaylist("PL2", "2024-05-01"));
    localStorage.setItem(
      "focustube:note:PL2-v1",
      JSON.stringify({ text: "kept", updatedAt: 1 })
    );
    backup.notes = {};

    mergeBackup(backup);

    expect(useLibrary.getState().playlists.PL2).toBeDefined();
    expect(localStorage.getItem("focustube:note:PL2-v1")).not.toBeNull();
  });
});

describe("backup reminder", () => {
  const NOW = Date.parse("2026-11-05T12:00:00Z");
  const DAY = 24 * 60 * 60 * 1000;

  test("stays quiet while the library is empty", () => {
    expect(backupReminder(NOW)).toBeNull();
  });

  test("nudges when the library has never been backed up", () => {
    seed();
    expect(backupReminder(NOW)).toEqual({
      items: 2,
      itemsSince: 0,
      daysSince: null,
      neverBackedUp: true,
    });
  });

  test("nudges again the day after a backup when the library grew", () => {
    seed();
    recordLastBackup(2, NOW - DAY);
    useLibrary.getState().addPlaylist(makePlaylist("PL2", "2024-05-01"));

    const reminder = backupReminder(NOW);

    expect(reminder?.itemsSince).toBe(1);
    expect(reminder?.daysSince).toBe(1);
  });

  test("stays quiet for the rest of the day after a backup", () => {
    seed();
    recordLastBackup(2, NOW);
    useLibrary.getState().addPlaylist(makePlaylist("PL2", "2024-05-01"));
    expect(backupReminder(NOW)).toBeNull();
  });

  test("nudges when the library grew since an old backup", () => {
    seed();
    recordLastBackup(2, NOW - 10 * DAY);
    useLibrary.getState().addCourse(makeCourse("C2"));

    const reminder = backupReminder(NOW);

    expect(reminder?.items).toBe(3);
    expect(reminder?.itemsSince).toBe(1);
    expect(reminder?.daysSince).toBe(10);
    expect(reminder?.neverBackedUp).toBe(false);
  });

  test("no new items means no nudge", () => {
    seed();
    recordLastBackup(2, NOW - 30 * DAY);
    expect(backupReminder(NOW)).toBeNull();
  });

  test("dismissing hides the nudge until the library changes again", () => {
    seed();
    recordLastBackup(2, NOW - 30 * DAY);
    useLibrary.getState().addPlaylist(makePlaylist("PL2", "2024-05-01"));
    expect(backupReminder(NOW)).not.toBeNull();

    dismissBackupReminder();
    expect(backupReminder(NOW)).toBeNull();

    useLibrary.getState().addPlaylist(makePlaylist("PL3", "2024-06-01"));
    expect(backupReminder(NOW)).not.toBeNull();
  });

  test("counts Studio projects when deciding whether to nudge", () => {
    localStorage.setItem(
      "focusy-studio:workspaces",
      JSON.stringify({
        state: { workspaces: { "ws-1": { id: "ws-1" } } },
        version: 0,
      })
    );

    expect(backupReminder(NOW)).toEqual({
      items: 1,
      itemsSince: 0,
      daysSince: null,
      neverBackedUp: true,
    });
  });

  test("downloading a backup records when it was taken", () => {
    seed();
    const createObjectURL = URL.createObjectURL;
    const revokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = () => "blob:focusy-test";
    URL.revokeObjectURL = () => {};
    try {
      downloadBackup();
    } finally {
      URL.createObjectURL = createObjectURL;
      URL.revokeObjectURL = revokeObjectURL;
    }

    const last = readLastBackup();
    expect(last?.items).toBe(2);
    // A fresh backup silences the nudge.
    expect(backupReminder(Date.parse(last!.at))).toBeNull();
  });
});

describe("optional certificate backups", () => {
  test("round-trips the saved certificate name", () => {
    const backup = collectBackup(null, null, { name: "Ada Lovelace" });
    expect(backup.certificate).toEqual({ name: "Ada Lovelace" });

    const parsed = parseBackup(serializeBackup(backup));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.backup.certificate).toEqual({ name: "Ada Lovelace" });
      expect(backupPreview(parsed.backup).certificateName).toBe("Ada Lovelace");
    }
  });
});
