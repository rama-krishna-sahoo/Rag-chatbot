import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function POST(req: Request) {
  try {
    const { authorized, supabase, user, workspaceId } = await verifyAdminAccess(['Super Admin', 'Knowledge Admin']);
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { filename, storagePath, fileSize, mimeType } = await req.json();

    if (!filename || !storagePath) {
      return NextResponse.json({ error: "Missing filename or storagePath" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("uploaded_documents")
      .insert({
        filename,
        storage_path: storagePath,
        file_size: fileSize || 0,
        mime_type: mimeType || "text/plain",
        status: "pending",
        workspace_id: workspaceId,
        uploaded_by: (user?.id && isUuid(user.id)) ? user.id : null
      })
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
