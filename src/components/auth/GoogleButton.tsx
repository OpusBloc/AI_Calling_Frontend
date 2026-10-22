// src/components/auth/GoogleButton.tsx

"use client";

interface GoogleButtonProps {
  onClick: () => void;
  text?: string;
}

export default function GoogleButton({
  onClick,
  text = "Continue with Google",
}: GoogleButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-100 transition"
    >
      <img
        src="/google.svg"
        alt="Google"
        className="w-5 h-5"
      />
      <span className="font-medium">{text}</span>
    </button>
  );
}
