import { NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"
import { auth } from "@/lib/auth"
import { getClinicOwnerUserId } from "@/app/utils/auth/clinic-owner-id"

const MAX_FILE_BYTES = 5 * 1024 * 1024

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME as string,
  api_key: process.env.CLOUDINARY_KEY as string,
  api_secret: process.env.CLOUDINARY_SECRET as string,
})

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const clinicOwnerId = getClinicOwnerUserId(session)
  if (!clinicOwnerId) {
    return NextResponse.json({ error: "Clínica não identificada" }, { status: 403 })
  }

  const formData = await request.formData()

  const file = formData.get("file")
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 })
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "Imagem muito grande (máximo 5 MB)" },
      { status: 400 },
    )
  }

  if (file.type !== "image/png" && file.type !== "image/jpeg") {
    return NextResponse.json({ error: "Formato de imagem inválido" }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const publicId = `avatar_${clinicOwnerId}_${Date.now()}`

  const results = await new Promise<{ secure_url?: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          tags: [`user_${clinicOwnerId}`],
          public_id: publicId,
          folder: "odontopro/avatars",
          overwrite: true,
          resource_type: "image",
        },
        function (err, result) {
          if (err) {
            reject(err)
            return
          }
          resolve(result ?? {})
        },
      )
      .end(buffer)
  })

  return NextResponse.json(results)
}
