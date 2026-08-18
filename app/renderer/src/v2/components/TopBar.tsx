import { FaChevronDown, FaCog, FaSearch } from 'react-icons/fa';

type TopBarProps = {
  caseName: string;
  onSearch: () => void;
  onSettings: () => void;
};

export function TopBar({ caseName, onSearch, onSettings }: TopBarProps) {
  return (
    <header className="v2-topbar">
      <button type="button" className="v2-case-switcher" title="Case switcher is coming in a later Vitni 2 phase">
        <span>{caseName}</span>
        <FaChevronDown aria-hidden="true" />
      </button>
      <span className="v2-active-case-chip">Active investigation</span>
      <div className="v2-topbar-spacer" />
      <button type="button" className="v2-search-button" onClick={onSearch}>
        <FaSearch aria-hidden="true" />
        <span>Search investigation…</span>
        <kbd>Ctrl K</kbd>
      </button>
      <button type="button" className="v2-icon-button" onClick={onSettings} aria-label="Open settings">
        <FaCog aria-hidden="true" />
      </button>
    </header>
  );
}
