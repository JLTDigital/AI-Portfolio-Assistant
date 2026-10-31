export function SceneBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="scene-grid absolute inset-x-[-50%] bottom-0 h-[70%]" />
      <div className="scene-scanlines absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_65%,rgb(7_6_12_/_0.6)_100%)]" />
      {/* The solid band matches the max-w-4xl chat column. */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_calc(50%-34rem),var(--background)_calc(50%-28rem),var(--background)_calc(50%+28rem),transparent_calc(50%+34rem))]" />
    </div>
  );
}
