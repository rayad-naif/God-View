import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";
import { brand } from "@/lib/brand";

export default function LegalPage({ title, path, children }: { title: string; path: string; children: React.ReactNode }) {
  return (
    <>
      <SiteNav active={path} />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <article className="prose">
          <h1>{title}</h1>
          <p className="!mt-2 text-sm text-ink-3">Last updated: {brand.legalUpdated}</p>
          {children}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
