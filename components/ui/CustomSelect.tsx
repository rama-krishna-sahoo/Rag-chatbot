"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { gsap } from "gsap";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
  dropdownClassName?: string;
  placeholder?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  className = "",
  dropdownClassName = "",
  placeholder = "Select option..."
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const arrowRef = useRef<SVGSVGElement | null>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine open direction based on viewport space
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 240px space below, open upward
      if (spaceBelow < 240) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // GSAP animation
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      
      // Animate Arrow rotation
      if (arrowRef.current) {
        gsap.to(arrowRef.current, { rotation: 180, duration: 0.25, ease: "power2.out" });
      }
    } else {
      // Animate Arrow back
      if (arrowRef.current) {
        gsap.to(arrowRef.current, { rotation: 0, duration: 0.2, ease: "power2.inOut" });
      }

      // Animate Menu Out
      if (menuRef.current) {
        const endY = openUpward ? 4 : -4;
        gsap.to(menuRef.current, {
          opacity: 0,
          scaleY: 0.9,
          y: endY,
          duration: 0.15,
          ease: "power2.in",
          onComplete: () => setShouldRender(false)
        });
      } else {
        setShouldRender(false);
      }
    }
  }, [isOpen, openUpward]);

  // Trigger entering animation after render
  useEffect(() => {
    if (shouldRender && isOpen && menuRef.current) {
      const transformOrigin = openUpward ? "bottom center" : "top center";
      const startY = openUpward ? 4 : -4;
      gsap.fromTo(menuRef.current,
        { opacity: 0, scaleY: 0.9, y: startY, transformOrigin },
        { opacity: 1, scaleY: 1, y: 0, duration: 0.25, ease: "power2.out" }
      );
    }
  }, [shouldRender, isOpen, openUpward]);

  return (
    <div ref={containerRef} className={`relative w-full text-left font-mono ${isOpen ? "z-[60]" : "z-0"}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 bg-[#16250e] border border-[#B2EA4D]/15 text-xs text-white px-3.5 rounded-xl flex items-center justify-between focus:outline-none hover:border-[#B2EA4D]/40 transition-colors cursor-pointer select-none ${className}`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown ref={arrowRef} className="w-3.5 h-3.5 text-[#B2EA4D] shrink-0 transition-transform ml-2" />
      </button>

      {shouldRender && (
        <div
          ref={menuRef}
          className={`absolute z-50 w-full bg-[#0c1407]/95 border border-[#B2EA4D]/20 rounded-xl shadow-2xl py-1 max-h-60 overflow-y-auto scrollbar-none backdrop-blur-md ${
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } ${dropdownClassName}`}
          style={{ willChange: "transform, opacity" }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs font-semibold select-none cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-[#B2EA4D] text-[#203210]"
                    : "text-slate-300 hover:bg-[#203210]/60 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
