import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ReportMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        components={{
          a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
          table: ({ children }) => (
            <div className="markdown-table-wrap">
              <table>{children}</table>
            </div>
          ),
        }}
        remarkPlugins={[remarkGfm]}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
