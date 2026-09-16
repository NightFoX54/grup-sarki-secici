import { NextResponse } from "next/server";
import { readSongs, updateSongs } from "@/lib/store";
import { isUserId } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ songs: await readSongs() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Liste okunamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      artist?: string;
      title?: string;
      addedBy?: string;
    };
    const artist = body.artist?.trim() ?? "";
    const title = body.title?.trim() ?? "";
    if (!artist || !title) {
      return NextResponse.json(
        { error: "Grup ve şarkı adı gerekli." },
        { status: 400 },
      );
    }
    const addedBy = body.addedBy;
    if (!isUserId(addedBy)) {
      return NextResponse.json({ error: "Geçersiz kullanıcı." }, { status: 400 });
    }

    const songs = await updateSongs((current) => [
      {
        id: crypto.randomUUID(),
        artist,
        title,
        addedBy,
        createdAt: new Date().toISOString(),
        votes: {},
        disabledFor: [],
      },
      ...current,
    ]);

    return NextResponse.json({ songs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Şarkı eklenemedi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
