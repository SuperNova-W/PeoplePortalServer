"use client";
import { useEffect } from "react";

export default function ApplyRedirect() {
  useEffect(() => {
    window.location.replace("https://corp.appdevclub.com/apply");
  }, []);

  return (
    <div className="pt-40 mx-auto relative z-10 flex items-center justify-center">
      <h1 className="font-bold">Redirecting to apply page...</h1>
    </div>
  );
}
