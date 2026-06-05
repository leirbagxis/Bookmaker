type Props = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: Props) {
  return (
    <div className="state state--empty" role="status">
      <p className="state__title">{title}</p>
      {description && <p className="state__desc">{description}</p>}
    </div>
  );
}
