const SectionHeader = ({ eyebrow, title, copy, action }) => (
  <div className="section-header">
    <div>
      {eyebrow ? <span className="section-eyebrow">{eyebrow}</span> : null}
      <h2>{title}</h2>
      {copy ? <p>{copy}</p> : null}
    </div>
    {action}
  </div>
);

export default SectionHeader;
