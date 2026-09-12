import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import React from "react";

const ApplyPage = () => {
  return (
    <div className="pt-40 mx-auto relative z-10">
      <div className="w-full mx-auto max-w-6xl -mb-11 hidden md:block">
        <Link href="/" className="mb-6">
          <Button variant={"ghost"}>
            <ArrowLeft className="mr-1" />
            Back to Home
          </Button>
        </Link>
      </div>
      <h1 className="text-4xl sm:text-5xl font-bold text-center text-blue-500 mb-4 px-4">
        Apply to App Dev Club
      </h1>
      <p className="text-center text-neutral-400 font-medium text-lg mb-8 px-4">
        Applications for Bootcamp and Project Teams will open again in the
        Spring
      </p>
      <div className="w-full flex flex-col items-center px-4">
        <div className="w-full max-w-3xl my-8 flex items-center justify-center relative">
          <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 h-1 bg-blue-500 w-full z-0" />
          <h2 className="text-2xl font-bold text-subheader bg-white px-4 text-center z-10">
            Open Positions
          </h2>
        </div>
      </div>
      <section className="max-w-2xl mx-auto flex flex-col items-center gap-6 px-4 mb-16">
        <div className="w-full max-w-2xl my-8 flex items-center justify-center relative">
          <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 h-0.5 bg-blue-500 w-full z-0" />
          <h2 className="text-xl font-bold text-subheader bg-white px-4 text-center z-10">
            Executive Board
          </h2>
        </div>
        <div className="max-w-xl flex flex-col gap-6 w-full">
          <ApplicationLink
            link="https://docs.google.com/forms/d/e/1FAIpQLScF5Z0vFVO8mIakjva75CEM8Tr2kPoIDtaRDsUn2QRYVA7O6g/viewform"
            name="President"
          />
          <ApplicationLink
            link="https://docs.google.com/forms/d/e/1FAIpQLScF5Z0vFVO8mIakjva75CEM8Tr2kPoIDtaRDsUn2QRYVA7O6g/viewform"
            name="Vice President"
          />
          <ApplicationLink
            link="https://docs.google.com/forms/d/e/1FAIpQLScF5Z0vFVO8mIakjva75CEM8Tr2kPoIDtaRDsUn2QRYVA7O6g/viewform"
            name="Executive Director"
          />
          <ApplicationLink
            link="https://docs.google.com/forms/d/e/1FAIpQLScF5Z0vFVO8mIakjva75CEM8Tr2kPoIDtaRDsUn2QRYVA7O6g/viewform"
            name="Managing Director"
          />
        </div>
      </section>
      <section className="max-w-2xl mx-auto flex flex-col items-center gap-6 px-4">
        <div className="w-full max-w-2xl my-8 flex items-center justify-center relative">
          <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 h-0.5 bg-blue-500 w-full z-0" />
          <h2 className="text-xl font-bold text-subheader bg-white px-4 text-center z-10">
            Board of Directors
          </h2>
        </div>
        <div className="max-w-xl flex flex-col gap-6 w-full">
          <ApplicationLink
            link="https://docs.google.com/forms/d/e/1FAIpQLSf458PEqRVtgRTspIpNg48lNeHP3STAa1a8WWc3z2Lsl90sWA/viewform"
            name="Director of Education"
          />
          <ApplicationLink
            link="https://docs.google.com/forms/d/e/1FAIpQLScHygB-wX8U2ji7QPRrHhVebj4sTbEOj-7-aFrTUY2TsK_xpA/viewform"
            name="Social Media Team"
          />
          <ApplicationLink
            link="https://docs.google.com/forms/d/e/1FAIpQLSee3LPF8sDvdyAY9Ux3PQjCv0xepf8vH8yH7fVhu-A9lToKIw/viewform"
            name="Events Team"
          />
          <ApplicationLink
            link="https://docs.google.com/forms/d/e/1FAIpQLSdpoU2FTJBnfcqAwYPkmw19jw_N74Y85LBg7ze6cTKL2H34Qw/viewform"
            name="Sponsorship Team"
          />
          <ApplicationLink
            link="https://docs.google.com/forms/d/e/1FAIpQLSf5W3hJoq54ykSvkAXS_ohogZ-sQPDp3U-zIgHgrI-f1ydzpA/viewform"
            name="Recruitment Team"
          />
        </div>
      </section>
    </div>
  );
};

const ApplicationLink = ({ link, name }: { link: string; name: string }) => {
  return (
    <Link href={link} target="_blank" rel="noopener noreferrer">
      <Button
        variant="roundedOutline"
        className="w-full py-6 text-lg hover:bg-blue-100/75"
      >
        {name}
      </Button>
    </Link>
  );
};

export default ApplyPage;
