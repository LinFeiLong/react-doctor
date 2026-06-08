export const RemoteHtml = ({ html }: { readonly html: string }) => {
  return <article dangerouslySetInnerHTML={{ __html: html }} />;
};
