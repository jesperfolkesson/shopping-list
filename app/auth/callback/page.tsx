"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"; // ändra sökväg om din är annan

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const code = new URLSearchParams(window.location.search).get("code");

      // I PKCE-flödet byter vi code -> session
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) console.error(error);
      }

      router.replace("/");
    })();
  }, [router]);

  return (
    <main style={{ maxWidth: 560, margin: "18px auto", padding: 16 }}>
      <p>Loggar in…</p>
    </main>
  );
}