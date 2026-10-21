import type { Metadata } from "next";
import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { requireStaff } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Медиатека" };

export default async function MediaPage() {
  await requireStaff("media");
  return (
    <>
      <div className="a-head">
        <div>
          <h1>Медиатека</h1>
          <p>Картинки и файлы для страниц, блога и SEO. Используемый файл удалить нельзя — сначала уберите его со страниц.</p>
        </div>
      </div>
      <MediaLibrary />
    </>
  );
}
