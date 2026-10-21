import { redirect } from "next/navigation";

// The course lives with the other page editors; the menu item is a shortcut.
export default function CoursePage() {
  redirect("/admin/content/course");
}
