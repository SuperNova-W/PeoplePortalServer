import { Banner } from "@/components/layout/banner";

// Here we will define any event banners we want to display on the site
// We can set begin and end dates for the banners, and they will only show if the current date is within that range
// Add a banner object to the array to enable a banner at a set time

// export const banners: Banner[] = [];
export const banners: Banner[] = [
  {
    title: "ADC Symposium",
    subtitle:
      "Learn about upcoming opportunities, network with members, and *enjoy free pizza!*",
    eventLocation: "Antonov Auditorium, Iribe Center",
    eventDateTime: {
      startTime: new Date("2026-02-05T18:00:00-05:00"),
      endTime: new Date("2026-02-05T20:00:00-05:00"),
      get date() {
        return this.startTime;
      },
    },
    showBannerStartDate: new Date("2026-02-01T00:00:00-05:00"),
    showBannerEndDate: new Date("2026-02-07T23:59:59-05:00"),
  },
];
// {
//   title: "",
//   subtitle: "", // Try to keep below 55 characters for 1 line
//   href: "/",
//   eventLocation: "",
//   eventDateTime: {
//     date: new Date('2025-08-06'),
//     startTime: new Date('2025-08-06T19:00:00'), // MAKE SURE ALL DATES ARE LOCAL EST TIME OR ELSE IT MIGHT BREAK
//     endTime: new Date('2025-08-06T20:00:00'),
//   },
//   showBannerStartDate: new Date('2025-08-01'), // MAKE SURE ALL DATES ARE LOCAL EST TIME OR ELSE IT MIGHT BREAK
//   showBannerEndDate: new Date('2025-08-31'),
// },
