"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const DavinchoHeroCounter = () => {
  const [count, setCount] = useState(0);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-2xl border border-white/20 bg-white/10 p-4 text-white shadow-lg backdrop-blur-md",
      )}
    >
      <h1 className="mb-2 text-2xl font-bold">Component Example</h1>
      <h2 className="text-xl font-semibold">{count}</h2>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setCount((prev) => prev - 1)}
        >
          -
        </Button>
        <Button type="button" onClick={() => setCount((prev) => prev + 1)}>
          +
        </Button>
      </div>
    </div>
  );
};

export const Component = DavinchoHeroCounter;
