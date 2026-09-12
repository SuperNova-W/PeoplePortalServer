"use client";
import React from "react";
import { Clock, MapPin } from "lucide-react";
import Link from "next/link";
import GradientText from "../ui/gradient-text";
import { useActiveBanner } from "@/lib/useActiveBanner";
import {
  applicationLink,
  applicationsBannerText,
  showApplicationsBanner,
} from "@/data/links-and-feature-flags";

export type Banner = {
  title: string;
  subtitle: string;
  eventLocation: string;
  eventDateTime: {
    date: Date;
    startTime: Date;
    endTime: Date;
  };
  href?: string;
  showBannerStartDate: Date;
  showBannerEndDate: Date;
};

const Banner = () => {
  const banner = useActiveBanner();
  if (!banner) return null;

  const { title, subtitle, eventLocation, eventDateTime, href } = banner;

  function renderBold(subtitle: string) {
    return subtitle.split(/(\*[^*]+\*)/g).map((part, i) => {
      if (part.startsWith("*") && part.endsWith("*")) {
        return <strong key={i}>{part.slice(1, -1)}</strong>;
      }
      return part;
    });
  }

  const today = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  const eventDate = new Date(eventDateTime.startTime);

  const happeningNow =
    today >= eventDateTime.startTime && today <= eventDateTime.endTime;
  const happeningToday = today.toDateString() === eventDate.toDateString();
  const displayStatus = happeningNow
    ? "Happening Now!"
    : happeningToday
      ? "Happening Today!"
      : null;

  return (
    <>
      <aside className="w-full bg-amber-300 z-[99999]">
        <div
          className={`flex flex-col md:grid items-center gap-4 px-4 py-2 max-w-6xl mx-auto ${
            displayStatus ? "grid-cols-[1fr_auto_1fr]" : "grid-cols-2"
          }`}
        >
          <div className="max-w-md max-md:text-center">
            <h2 className="text-2xl font-bold">
              {href ? <Link href={href}>{title}</Link> : title}
            </h2>
            <p className="text-muted-foreground text-sm">
              {renderBold(subtitle)}
            </p>
          </div>

          {displayStatus && (
            <div className="flex justify-center">
              <GradientText
                colors={["#dc2626", "#f97316", "#eab308", "#f59e0b", "#d97706"]}
                animationSpeed={10}
                showBorder={false}
                className="text-3xl whitespace-nowrap"
              >
                {displayStatus}
              </GradientText>
            </div>
          )}

          <div className="flex flex-col max-md:items-center md:ml-auto break-words">
            {eventDateTime && (
              <span className="flex items-center">
                <Clock size={16} className="inline mr-1" />
                <p className="truncate">
                  {`${eventDateTime.date.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: "America/New_York",
                  })}, ${eventDateTime.startTime.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "America/New_York",
                  })}-${eventDateTime.endTime.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "America/New_York",
                  })}`}
                </p>
              </span>
            )}
            {eventLocation && (
              <span className="flex items-center">
                <MapPin size={16} className="inline mr-1" />
                <p className="truncate">{eventLocation}</p>
              </span>
            )}
          </div>
        </div>
      </aside>
      {showApplicationsBanner && (
        <aside className="w-full bg-white z-[99999] shadow-2xl text-center font-bold py-0.5">
          <Link
            href={applicationLink}
            target={applicationLink.startsWith("http") ? "_blank" : undefined}
            className="text-red-500"
          >
            {applicationsBannerText}
          </Link>
        </aside>
      )}
    </>
  );
};

export default Banner;
