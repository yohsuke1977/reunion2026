interface Props {
  no: string;
  title: string;
  en: string;
}

export default function SectionHeader({ no, title, en }: Props) {
  return (
    <div className="sh">
      <div className="no">{no}</div>
      <h2>{title}</h2>
      <div className="en">{en}</div>
    </div>
  );
}
