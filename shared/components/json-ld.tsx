/**
 * Renders schema.org structured data as a JSON-LD script tag.
 *
 * `<` is escaped so no value inside the payload can terminate the script
 * element early. Crawlers read JSON-LD from the body, which is where React
 * places server-rendered `<script>` tags.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				__html: JSON.stringify(data).replace(/</g, "\\u003c"),
			}}
		/>
	);
}
