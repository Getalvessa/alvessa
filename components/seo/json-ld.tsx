export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Escape '<' so provider-controlled fields (bio, display_name) cannot break out
  // of the <script> context with a literal </script> sequence (stored XSS guard).
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
