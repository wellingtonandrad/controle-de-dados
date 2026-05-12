"use server"

import {signIn} from "@/lib/auth"

export async function handleRegister() {
  await signIn("google", { redirectTo: "/dashboard" })
}