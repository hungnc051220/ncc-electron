const Legend = ({ color, label }: { color: string; label: string }) => {
  return (
    <div className="flex items-center gap-2">
      <div className={`size-4 xl:size-6 rounded-sm ${color}`} />
      <span className="font-bold text-zeno text-xs xl:text-sm">{label}</span>
    </div>
  );
};

export default Legend;
