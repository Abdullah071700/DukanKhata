import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Authenticate user with their token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { shopId } = await req.json();
    if (!shopId) {
      return new Response(JSON.stringify({ error: "shopId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user role
    const { data: member, error: memberError } = await userClient
      .from("shop_members")
      .select("role")
      .eq("shop_id", shopId)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member || !["owner", "admin"].includes(member.role)) {
      return new Response(JSON.stringify({ error: "Forbidden: Only shop owners or admins can create backups" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Execute privileged backup RPC
    const { data: backupResult, error: backupError } = await userClient.rpc("create_shop_backup", {
      p_shop_id: shopId,
    });

    if (backupError) {
      return new Response(JSON.stringify({ error: backupError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If service role key is set and storage bucket exists, store in private bucket
    if (supabaseServiceKey) {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      const filePath = `${shopId}/${backupResult.file_name}`;
      await adminClient.storage
        .from("shop-backups")
        .upload(filePath, JSON.stringify(backupResult.backup_data), {
          contentType: "application/json",
          upsert: true,
        })
        .catch(() => {});
    }

    return new Response(JSON.stringify(backupResult), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
