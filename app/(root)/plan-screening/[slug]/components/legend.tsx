const Legend = ({ color, label }: { color: string; label: string }) => {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded-sm ${color}`} />
      <span className="font-bold text-zeno">{label}</span>
    </div>
  );
};

export default Legend;
