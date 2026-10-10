import { ok, fail } from "@/lib/api/response";
import { getAdminApiContext } from "@/lib/admin";
export async function GET(){const {supabase,user,access}=await getAdminApiContext();if(!user||!access)return fail("Forbidden",403,"ADMIN_REQUIRED");const {data:profile}=await supabase.from("profiles").select("id,binzeo_user_id,display_name,username,account_status,profile_photo_url").eq("id",user.id).maybeSingle();return ok({user:{id:user.id,email:user.email},profile,access});}
