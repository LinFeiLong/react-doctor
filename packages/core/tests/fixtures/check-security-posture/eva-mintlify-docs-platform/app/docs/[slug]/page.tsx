import { compileMDX } from "next-mdx-remote/rsc";

export const Page = async ({ params }: { params: { slug: string } }) => {
  const customerMarkdown = await fetch(`https://api.mintlify.com/v1/docs/${params.slug}`).then(
    (response) => response.text(),
  );
  const rendered = await compileMDX({
    source: customerMarkdown,
  });

  return rendered.content;
};
