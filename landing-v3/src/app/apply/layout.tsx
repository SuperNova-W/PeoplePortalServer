import { Metadata } from "next";
import React, { ReactNode } from "react";

interface ProjectLayoutProps {
  readonly children: ReactNode;
}

export default function ApplyLayout({ children }: ProjectLayoutProps) {
  return (
    <main className="relative w-full bg-white pb-16">
      <div className="absolute top-0 left-0 w-full h-26 md:h-30 bg-gradient-blue z-0" />
      {children}
    </main>
  );
}
