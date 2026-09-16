import { NextResponse } from "next/server";
import { updateSongs } from "@/lib/store";
import { isUserId } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      user?: string;
      reason?: string;
      remove?: boolean;
    };
    if (!isUserId(body.user)) {
      return NextResponse.json({ error: "Geçersiz kullanıcı." }, { status: 400 });
    }

    const reason = body.reason?.trim() ?? "";
    if (!body.remove && !reason) {
      return NextResponse.json({ error: "Kısa bir sebep yaz." }, { status: 400 });
    }

    const songs = await updateSongs((current) => {
      const index = current.findIndex((song) => song.id === id);
      if (index === -1) return current;
      const song = {
        ...current[index],
        disabledFor: current[index].disabledFor.filter(
          (entry) => entry.user !== body.user,
        ),
      };
      if (!body.remove) {
        song.disabledFor = [...song.disabledFor, { user: body.user, reason }];
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
    return NextResponse.json(
      { error: "Disable kaydedilemedi." },
      { status: 500 },
    );
  }
}
