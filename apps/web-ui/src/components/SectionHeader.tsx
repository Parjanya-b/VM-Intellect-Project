interface SectionHeaderProps {
  label: string;
  caption?: string;
}

export function SectionHeader({ label, caption }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <span className="section-header__label">{label}</span>
      {caption && <span className="section-header__caption">{caption}</span>}
    </div>
  );
}
