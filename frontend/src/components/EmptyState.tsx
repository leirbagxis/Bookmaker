type Props = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-panel rounded-[2rem] shadow-sm animate-fade-in" role="status">
      <p className="font-black uppercase tracking-tight text-lg mb-2">{title}</p>
      {description && <p className="text-sm text-muted font-medium">{description}</p>}
    </div>
  );
}
