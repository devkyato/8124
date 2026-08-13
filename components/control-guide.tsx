import { PiHandTap, PiArrowsOutCardinal } from "react-icons/pi";

const keys = ["W", "A", "S", "D"];
const arrows = ["↑", "←", "↓", "→"];

export function ControlGuide() {
  return (
    <section className="how-to" aria-labelledby="how-to-title">
      <h2 id="how-to-title">how to play</h2>

      <div className="control-row">
        <span className="control-label">pc</span>
        <KeyCluster keys={keys} label="w a s d keys arranged like a keyboard" />
        <KeyCluster keys={arrows} label="arrow keys arranged like a keyboard" />
      </div>

      <div className="control-row mobile-control">
        <span className="control-label">mobile</span>
        <span className="swipe-control" aria-label="touch and swipe in any direction">
          <PiHandTap aria-hidden="true" />
          <PiArrowsOutCardinal aria-hidden="true" />
        </span>
      </div>
    </section>
  );
}

function KeyCluster({ keys: values, label }: { keys: string[]; label: string }) {
  const positions = ["key-up", "key-left", "key-down", "key-right"];

  return (
    <div className="keyboard-cluster" aria-label={label}>
      {values.map((value, index) => (
        <kbd className={positions[index]} key={value}>{value}</kbd>
      ))}
    </div>
  );
}
