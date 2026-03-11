type CellValue = "X" | "O" | null;

interface CellProps {
  value: CellValue;
  index: number;
  onClick: (index: number) => void;
  disabled: boolean;
}

export default function Cell({ value, index, onClick, disabled }: CellProps) {
  const handleClick = () => {
    if (!disabled && value === null) {
      onClick(index);
    }
  };

  const cellClass = [
    "cell",
    value === "X" ? "cell-x" : value === "O" ? "cell-o" : "",
    !disabled && value === null ? "cell-hover" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={cellClass}
      onClick={handleClick}
      disabled={disabled || value !== null}
      aria-label={value ?? `Cell ${index + 1}`}
    >
      {value}
    </button>
  );
}
