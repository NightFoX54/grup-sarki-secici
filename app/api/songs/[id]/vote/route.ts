import { NextResponse } from "next/server";
import { updateSongs } from "@/lib/store";
import { isUserId } from "@/lib/users";
import type { VoteValue } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { user?: string; value?: unknown };
    const user = body.user;
    if (!isUserId(user)) {
      return NextResponse.json({ error: "Geçersiz kullanıcı." }, { status: 400 });
    }
    if (body.value !== 1 && body.value !== -1 && body.value !== 0) {
      return NextResponse.json({ error: "Geçersiz oy." }, { status: 400 });
    }

    const songs = await updateSongs((current) => {
      const index = current.findIndex((song) => song.id === id);
      if (index === -1) return current;
      const song = { ...current[index], votes: { ...current[index].votes } };
      if (body.value === 0) {
        delete song.votes[user];
      } else {
        song.votes[user] = body.value as VoteValue;
      }
      const next = [...current];
      next[index] = song;
      return next;
    });

    if (!songs.some((song) => song.id === id)) {
      return NextResponse.json({ error: "Şarkı bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({ songs });
  } catch {
    return NextResponse.json({ error: "Oy kaydedilemedi." }, { status: 500 });
  }
}
