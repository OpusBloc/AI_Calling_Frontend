'use client';

import { useState, useRef, useEffect } from 'react';

interface VerticalDropdownProps {
  type: 'vertical';
  label: string;
  options: string[];
  onSelect?: (value: string) => void;
}

interface RangeDropdownProps {
  type: 'range';
  label: string;
  onRangeChange?: (min: string, max: string) => void;
}

type DropdownMenuProps = VerticalDropdownProps | RangeDropdownProps;

export default function DropdownMenu(props: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const verticalOptions = [
    "Introduction",
    "FAQ",
    "Policies",
    "Documentation",
    "Introduction"
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-black text-black text-lg py-2 px-4 text-left hover:bg-gray-50"
      >
        {props.label}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full w-full z-50">
          {props.type === 'vertical' ? (
            // Vertical dropdown (Token Type/District)
            <div className="bg-white border border-black shadow-lg">
              {verticalOptions.map((option, index) => (
                <button
                  key={index}
                  className="w-full text-left px-4 py-3 text-lg hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                  onClick={() => {
                    props.onSelect?.(option);
                    setIsOpen(false);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            // Range dropdown (Price/Size)
            <div className="bg-white border border-black p-4 shadow-lg">
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  placeholder="Min"
                  className="border border-black px-4 py-2 w-full"
                />
                <span className="text-xl">-</span>
                <input
                  type="text"
                  placeholder="Max"
                  className="border border-black px-4 py-2 w-full"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 