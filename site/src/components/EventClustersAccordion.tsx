import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Cluster = {
  title: string;
  summary: string;
  article_urls: string[];
};

export default function EventClustersAccordion({ clusters }: { clusters: Cluster[] }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
      <h2 className="text-xl font-semibold mb-4">Event clusters</h2>

      <Accordion type="single" collapsible className="w-full">
        {clusters.map((c, idx) => (
          <AccordionItem key={c.title} value={`item-${idx}`}>
            <AccordionTrigger>{c.title}</AccordionTrigger>
            <AccordionContent>
              <p className="text-[var(--muted-foreground)] mb-3">{c.summary}</p>

              <ul className="list-disc pl-5 space-y-1">
                {c.article_urls.slice(0, 3).map((url) => (
                  <li key={url}>
                    <a
                      className="text-sm text-[#f59e0b] hover:underline break-all"
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}