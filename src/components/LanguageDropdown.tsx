// components/LanguageDropdown.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import i18n from "i18next";
import { FiGlobe } from "react-icons/fi";

const LanguageDropdown = () => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // Load saved language from localStorage after component mounts to avoid hydration mismatch
    const savedLang = localStorage.getItem('language');
    if (savedLang && savedLang !== i18n.language) {
      i18n.changeLanguage(savedLang);
    }
  }, []);

  const languages = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिंदी" },
    { code: "te", label: "తెలుగు" },
    { code: "ar", label: "العربية" },
    { code: "th", label: "ไทย" },
    { code: "mr", label: "मराठी" },
  ];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setOpen(false);
  };

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (mounted) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="h-[30px] w-[30px] border border-gray-300 rounded-full p-1 flex items-center justify-center">
        <FiGlobe className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className="relative z-[99]" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="h-[30px] w-[30px] border border-gray-300 rounded-full p-1 flex items-center justify-center hover:bg-gray-50 transition-colors"
        aria-label="Select Language"
      >
        <FiGlobe className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 bg-white border border-gray-300 text-black shadow-lg rounded-md min-w-[160px] z-[999] py-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3 ${
                i18n.language === lang.code ? 'bg-gray-50 font-medium' : ''
              }`}
            >
              <span className="text-sm">{lang.label}</span>
              {i18n.language === lang.code && (
                <span className="ml-auto text-xs text-green-600">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageDropdown;
