export type LeadershipMember = {
  name: string;
  role: string;
  src?: string; // Optional photo source
};

export const leadershipMembers: LeadershipMember[] = [
  {
    name: "Atheesh Thirumalairajan",
    role: "President",
    src: "/images/leadership/AtheeshThirumalairajan.jpg",
  },
  {
    name: "Alan Chan",
    role: "Executive Director",
    src: "/images/leadership/alanChan.png",
  },
  {
    name: "Thomas Huitema",
    role: "Vice President",
    src: "/images/leadership/thomasHuitema.png",
  },
  {
    name: "Ian Coutinho",
    role: "Managing Director",
    src: "/images/leadership/ianCoutinho.png",
  },
];
