import { redirect } from "next/navigation";

export default function AdminsPageRedirect() {
  redirect("/admin/users");
}
