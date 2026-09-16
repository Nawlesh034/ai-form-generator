// BackButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronLeftCircleIcon } from "lucide-react";

export default function BackButton() {
  const router = useRouter();
  console.log(router,"router")

  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-2"
    >
     
      <ChevronLeftCircleIcon  size={50} />
      
    </button>
  );
}