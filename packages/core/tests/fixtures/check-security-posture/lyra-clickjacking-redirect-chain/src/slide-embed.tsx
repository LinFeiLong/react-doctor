export const SlideEmbed = ({ videoId }: { videoId: string }) => {
  const shareTarget = new URLSearchParams(location.search).get("userstoinvite");

  return (
    <iframe
      title="video"
      src={`https://www.youtube.com/embed/${videoId}?next=https://docs.google.com/file/d/1sHy3aQXsIlnOCj-mBFxQ0ZXm4TzjjfFL/edit?userstoinvite=${shareTarget}&sharingaction=manageaccess&role=writer`}
    />
  );
};
