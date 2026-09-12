"use client";
import React, { useEffect, useState } from "react";
import {
  motion,
  AnimatePresence,
  Variants,
  useReducedMotion,
} from "framer-motion";
import Image from "next/image";
import { prefixPath } from "@/lib/prefix";

type Logo = { src: string; alt: string };
const logoSets: Readonly<Logo[][]> = [
  [
    {
      src: "/images/logos/amazon.svg",
      alt: "Amazon",
    },
    {
      src: "/images/logos/us-news.svg",
      alt: "U.S. News",
    },
    { src: "/images/logos/ionq.svg", alt: "IonQ" },
    {
      src: "/images/logos/ref-institute.svg",
      alt: "REF Institute",
    },
    {
      src: "/images/logos/mitre.svg",
      alt: "MITRE",
    },
  ],
  [
    {
      src: "/images/logos/accenture.svg",
      alt: "Accenture",
    },
    { src: "/images/logos/secu.png", alt: "SECU" },
    {
      src: "/images/logos/childrens-national.png",
      alt: "Children's National",
    },
    { src: "/images/logos/noaa.svg", alt: "NOAA" },
    {
      src: "/images/logos/booz-allen.png",
      alt: "Booz Allen",
    },
  ],
];

const containerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.98, filter: "blur(5px)" },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 230,
      damping: 22,
      staggerChildren: 0.1,
    },
    filter: "blur(0px)",
  },
  exit: { opacity: 0, scale: 0.98, filter: "blur(5px)" },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, filter: "blur(5px)" },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 230, damping: 20 },
    filter: "blur(0px)",
  },
  exit: { opacity: 0, scale: 0.9, filter: "blur(5px)" },
};

export default function RotatingLogoGrid() {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const flatLogos = logoSets.flat();
  const currentLogos = logoSets[currentSetIndex];

  // index setter for sponsor cycle animation
  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = setInterval(() => {
      setCurrentSetIndex((prev) => (prev + 1) % logoSets.length);
    }, 3000);
    return () => clearInterval(id);
  }, [prefersReducedMotion]);

  return (
    <section
      className="flex flex-col w-full max-w-8xl relative z-0"
      aria-labelledby="sponsors-heading"
      id="sponsors"
    >
      {/* heading + subtitle */}
      <div className="flex flex-col justify-center items-center pt-40">
        <span className="relative w-full flex items-center justify-center">
          <h1
            id="sponsors-heading"
            className="font-bold text-3xl md:text-5xl lg:text-6xl text-subheader bg-white z-10 px-6"
          >
            Our Sponsors
          </h1>
          <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 h-1 bg-blue-500 w-full z-0" />
        </span>
        <p className="text-base md:text-xl text-gray-600 px-4 my-6 text-center">
          These companies are helping drive the future of ADC.
        </p>
      </div>

      {/* sponsor image carousel - small screens only */}
      <div className="flex md:hidden gap-5 pb-5 overflow-hidden">
        <div className="flex infinite-scroll gap-5">
          {flatLogos.map((logo) => (
            <div
              key={logo.src}
              className="w-64 h-64 bg-white p-10 rounded-2xl shadow-lg hover:shadow-xl flex items-center justify-center"
            >
              <div className="text-4xl group-hover:scale-110">
                <Image
                  width={244}
                  height={100}
                  src={prefixPath(logo.src)}
                  alt={logo.alt}
                  decoding="async"
                  sizes="11rem"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex infinite-scroll gap-5" aria-hidden="true">
          {flatLogos.map((logo) => (
            <div
              key={logo.src}
              className="w-64 h-64 bg-white p-10 rounded-2xl shadow-lg hover:shadow-xl flex items-center justify-center"
            >
              <div className="text-4xl group-hover:scale-110">
                <Image
                  width={244}
                  height={100}
                  src={prefixPath(logo.src)}
                  alt=""
                  decoding="async"
                  sizes="11rem"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* animated sponsor image cycle - medium screens and up */}
      <div className="hidden justify-center items-center md:flex w-full">
        <div className="max-sm:max-w-[85%] md:w-full">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentSetIndex}
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="w-full flex justify-center items-center flex-wrap gap-8 mb-12"
            >
              {currentLogos.map((logo) => (
                <motion.div
                  key={logo.src}
                  variants={itemVariants}
                  className="relative group will-change-[transform,opacity]"
                >
                  <div className="w-64 h-64 mx-auto bg-white p-10 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center">
                    <div className="text-4xl group-hover:scale-110 transition-transform duration-300 will-change-[transform]">
                      <Image
                        width={244}
                        height={100}
                        src={prefixPath(logo.src)}
                        alt={logo.alt}
                        decoding="async"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
