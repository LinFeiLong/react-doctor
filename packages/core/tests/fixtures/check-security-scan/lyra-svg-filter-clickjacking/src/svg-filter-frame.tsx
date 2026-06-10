export const FilteredFrame = () => {
  return (
    <>
      <iframe
        title="account settings"
        src="https://docs.google.com/file/d/1sHy3aQXsIlnOCj-mBFxQ0ZXm4TzjjfFL/edit"
        style={{ filter: "url(#captchaFilter)" }}
      />
      <svg width="0" height="0">
        <filter id="captchaFilter">
          <feDisplacementMap in="SourceGraphic" scale="6" />
        </filter>
      </svg>
    </>
  );
};
