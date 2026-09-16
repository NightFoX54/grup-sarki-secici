import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { get, put } from "@vercel/blob";
import type { Song } from "./types";

const BLOB_PATH = "songs.json";
const LOCAL_PATH = path.join(process.cwd(), "data", "songs.json");

function env(name: string) {
  return process.env[name];
}

function useBlob() {
  return Boolean(env("BLOB_READ_WRITE_TOKEN") || env("BLOB_STORE_ID"));
}

function assertBlobOnVercel() {
  if (env("VERCEL") && !useBlob()) {
    throw new Error(
      "Blob bağlı değil. Vercel → Storage’da mevcut store’u kullan, BLOB_READ_WRITE_TOKEN olsun, sonra cache’siz Redeploy et.",
    );
  }
}

async function readLocal(): Promise<Song[]> {
  try {
    const raw = await readFile(LOCAL_PATH, "utf8");
    const parsed = JSON.parse(raw) as Song[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocal(songs: Song[]) {
  await mkdir(path.dirname(LOCAL_PATH), { recursive: true });
  await writeFile(LOCAL_PATH, JSON.stringify(songs, null, 2), "utf8");
}

async function readBlob(): Promise<Song[]> {
  try {
    const result = await get(BLOB_PATH, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return [];
    const text = await new Response(result.stream).text();
    if (!text.trim()) return [];
    const parsed = JSON.parse(text) as Song[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeBlob(songs: Song[]) {
  await put(BLOB_PATH, JSON.stringify(songs), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function readSongs(): Promise<Song[]> {
  assertBlobOnVercel();
  return useBlob() ? readBlob() : readLocal();
}

export async function writeSongs(songs: Song[]) {
  assertBlobOnVercel();
  if (useBlob()) {
    await writeBlob(songs);
    return;
  }
  await writeLocal(songs);
}

export async function updateSongs(
  mutator: (songs: Song[]) => Song[],
): Promise<Song[]> {
  const next = mutator(await readSongs());
  await writeSongs(next);
  return next;
}
