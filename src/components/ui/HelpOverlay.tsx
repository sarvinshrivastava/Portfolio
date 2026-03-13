interface HelpOverlayProps {
  onClose: () => void;
}

export function HelpOverlay({ onClose }: HelpOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Terminal window */}
      <div className="relative bg-bg-secondary border border-border rounded-lg overflow-hidden font-mono text-sm w-full max-w-[480px]">
        {/* Title bar */}
        <div className="bg-bg-tertiary border-b border-border px-4 py-[0.6rem] flex items-center gap-[0.4rem]">
          <span className="w-3 h-3 rounded-full inline-block bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full inline-block bg-[#febc2e]" />
          <button
            onClick={onClose}
            className="w-3 h-3 rounded-full inline-block bg-[#28c840] cursor-pointer border-none p-0"
            aria-label="Close help"
          />
          <span className="ml-3 text-xs text-text-muted">sarvin@portfolio:~ — help</span>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-accent mb-4">➜ ~ <span className="text-text">keyboard shortcuts</span></p>

          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs text-text-muted mb-2"># Navigation</p>
              <div className="flex flex-col gap-[0.4rem]">
                <ShortcutRow keys="← / →" desc="previous / next page" />
                <ShortcutRow keys="j / ↓" desc="next section or element" />
                <ShortcutRow keys="k / ↑" desc="prev section or element" />
                <ShortcutRow keys="Enter" desc="activate / enter" />
                <ShortcutRow keys="Esc" desc="back / deselect" />
              </div>
            </div>

            <div>
              <p className="text-xs text-text-muted mb-2"># Shortcuts</p>
              <div className="flex flex-col gap-[0.4rem]">
                <ShortcutRow keys="d" desc="toggle dark / light" />
                <ShortcutRow keys="r" desc="open resume" />
                <ShortcutRow keys="h" desc="toggle this help" />
                <ShortcutRow keys="/" desc="focus project filter" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-accent text-xs w-24 shrink-0">{keys}</span>
      <span className="text-text-muted text-xs">{desc}</span>
    </div>
  );
}
