import { FixedLengthArray } from "@/lib/utils";

// Project type
export type Project = {
  slug: string;
  logo: string;
  logoAlt?: string;
  title: string;
  description: string;
  year: number;
  semester: "Spring" | "Fall";
  showcaseContent?: ShowcaseContent;
  members?: {
    name: string;
    title: string;
    photo?: string;
    zoomPhotoIn?: boolean; // Use this if they have a linkedin badge and you want to zoom it to fit
  }[];
};

// only youtube video links are supported
type ShowcaseContent =
  | { description: string; image: string; videoUrl?: never }
  | { description: string; videoUrl: string; image?: never };

/**
 * All objects for each project that we will define
 * DONT forget to update the allProjects array at the bottom of this file as more years are added
 * TO EXPORT THESE PROJECTS update the export statement at the bottom of this file as well
 */

const FALL_25_PROJECTS: Project[] = [
  {
    slug: "exiger-fall-25",
    logo: "/images/logos/exiger.webp",
    logoAlt: "Exiger Logo",
    title: "Supplier Portal",
    description:
      "Developed a custom supplier portal designed to streamline how global companies interact with their vendors, creating a two-way bridge for managing risk, tracking procurement orders, and handling onboarding tasks",
    year: 2025,
    semester: "Fall",
    showcaseContent: {
      description:
        "Main supplier portal dashboard for managing tasks, risk analysis, and purchase orders",
      image: "/images/projects/fall-25/exigerFALL25/exiger-demo.webp",
    },
    members: [
      {
        name: "Alan Chan",
        title: "Project Lead",
        photo: "/images/projects/fall-25/exigerFALL25/alanChan.webp",
      },
      {
        name: "Thomas Huitema",
        title: "Tech Lead",
        photo: "/images/projects/fall-25/exigerFALL25/thomasHuitema.webp",
      },
      {
        name: "Will Graham",
        title: "Tech Lead",
        photo: "/images/projects/fall-25/exigerFALL25/willGraham.webp",
      },
      {
        name: "James Miller",
        title: "Full Stack Engineer",
        photo: "/images/projects/fall-25/exigerFALL25/jamesMiller.webp",
      },
      {
        name: "Rachel Li",
        title: "Full Stack Engineer",
        photo: "/images/projects/fall-25/exigerFALL25/rachelLi.webp",
      },
      {
        name: "Miles McDonald",
        title: "Full Stack Engineer",
        photo: "/images/projects/fall-25/exigerFALL25/milesMcDonald.webp",
      },
      {
        name: "Alex Yang",
        title: "Backend Engineer",
        photo: "/images/projects/fall-25/exigerFALL25/alexYang.webp",
      },
      {
        name: "Urjit Chakraborty",
        title: "Backend Engineer",
        photo: "/images/projects/fall-25/exigerFALL25/urjitChakraborty.webp",
      },
      {
        name: "Siddhant Jain",
        title: "Backend Engineer",
        photo: "/images/projects/fall-25/exigerFALL25/siddhantJain.webp",
      },
      {
        name: "Ryan Li",
        title: "Frontend Engineer",
        photo: "/images/projects/fall-25/exigerFALL25/ryanLi.webp",
      },
      {
        name: "Sai Praneeth Oruganti",
        title: "Frontend Engineer",
        photo: "/images/projects/fall-25/exigerFALL25/saiPraneethOruganti.webp",
      },
      {
        name: "Tanush Kallem",
        title: "DevOps Engineer",
        photo: "/images/projects/fall-25/exigerFALL25/tanushKallem.webp",
      },
      {
        name: "Mihira Murthy",
        title: "Project Manager",
        photo: "/images/projects/fall-25/exigerFALL25/mihiraMurthy.webp",
      },
      {
        name: "Amanda Tsai",
        title: "Shadow",
        photo: "/images/projects/fall-25/exigerFALL25/amandaTsai.webp",
      },
      {
        name: "Vincent Liu",
        title: "Shadow",
        photo: "/images/projects/fall-25/exigerFALL25/vincentLiu.webp",
      },
    ],
  },
  {
    slug: "amazon-fall-25",
    logo: "/images/logos/amazon_leo.svg",
    logoAlt: "Amazon Project Leo Logo",
    title: "Amazon Project Leo",
    description:
      "Built a full-stack application on AWS using ML to predict airport boundaries for compliance with satellite regulations, validated globally for accuracy and reliability",
    year: 2025,
    semester: "Fall",
    members: [
      {
        name: "Amelia Harn",
        title: "Project Lead",
        photo: "/images/projects/fall-25/amazonFALL25/ameliaHarn.webp",
      },
      {
        name: "Andrew Hong",
        title: "Tech Lead",
        photo: "/images/projects/fall-25/amazonFALL25/andrewHong.webp",
      },
      {
        name: "Nandhu Pillai",
        title: "Tech Lead",
        photo: "/images/projects/fall-25/amazonFALL25/nandhuPillai.webp",
      },
      {
        name: "Abhinav Kota",
        title: "Engineer",
        photo: "/images/projects/fall-25/amazonFALL25/abhinavKota.webp",
      },
      {
        name: "Aidana Aibek",
        title: "UI/UX Engineer",
        photo: "/images/projects/fall-25/amazonFALL25/aidanaAibek.webp",
      },
      {
        name: "Anish Maheshwar",
        title: "Engineer",
        photo: "/images/projects/fall-25/amazonFALL25/anishMaheshwar.webp",
      },
      {
        name: "Arav Luthra",
        title: "Engineer",
        photo: "/images/projects/fall-25/amazonFALL25/aravLuthra.webp",
      },
      {
        name: "Arnav Aggarwal",
        title: "Engineer",
        photo: "/images/projects/fall-25/amazonFALL25/arnavAggarwal.webp",
      },
      {
        name: "Arnav Gowda",
        title: "Engineer",
        photo: "/images/projects/fall-25/amazonFALL25/arnavGowda.webp",
      },
      {
        name: "Eric Huang",
        title: "Engineer",
        photo: "/images/projects/fall-25/amazonFALL25/ericHuang.webp",
      },
      {
        name: "Kathy Chen",
        title: "Engineer",
        photo: "/images/projects/fall-25/amazonFALL25/kathyChen.webp",
      },
      {
        name: "Seonyoung Lee",
        title: "Engineer",
        photo: "/images/projects/fall-25/amazonFALL25/seonyoungLee.webp",
      },
      {
        name: "Shohini Rhea Sarkar",
        title: "Engineer",
        photo: "/images/projects/fall-25/amazonFALL25/shohiniRheaSarkar.webp",
      },
      {
        name: "Smithi Mahendran",
        title: "Engineer",
        photo: "/images/projects/fall-25/amazonFALL25/smithiMahendran.webp",
      },
      {
        name: "Suhaan Baru",
        title: "Engineer",
        photo: "/images/projects/fall-25/amazonFALL25/suhaanBaru.webp",
      },
      {
        name: "Tanvi Panse",
        title: "Project Manager",
        photo: "/images/projects/fall-25/amazonFALL25/tanviPanse.webp",
      },
      {
        name: "Tristan Tsang",
        title: "Engineer",
        photo: "/images/projects/fall-25/amazonFALL25/tristanTsang.webp",
      },
    ],
  },
  {
    slug: "vex-fall-25",
    logo: "/images/logos/vex.png",
    logoAlt: "Vex Logo",
    title: "Vex",
    description:
      "Developed an AI-assisted social platform enabling real-time, voice-enabled chatrooms where an intelligent agent participates in conversations, enhances discussions, and allows users to share and replay meaningful exchanges",
    year: 2025,
    semester: "Fall",
    members: [
      {
        name: "Eswar Karavadi",
        title: "Project Lead",
        photo: "/images/projects/fall-25/vexFALL25/eswarKaravadi.webp",
      },
      {
        name: "Anvay Panguluri",
        title: "Backend Tech Lead",
        photo: "/images/projects/fall-25/vexFALL25/anvayPanguluri.webp",
      },
      {
        name: "Ayan Banerjee",
        title: "ML Tech Lead",
        photo: "/images/projects/fall-25/vexFALL25/ayanBanerjee.webp",
      },
      {
        name: "Tanmay Panguluri",
        title: "Backend Engineer",
        photo: "/images/projects/fall-25/vexFALL25/tanmayPanguluri.webp",
      },
      {
        name: "Pranav Satyadeep",
        title: "Backend Engineer",
        photo: "/images/projects/fall-25/vexFALL25/pranavSatyadeep.webp",
      },
      {
        name: "Samik Wangneo",
        title: "Backend Engineer",
        photo: "/images/projects/fall-25/vexFALL25/samikWangneo.webp",
      },
      {
        name: "Emmanuel Michael",
        title: "Backend Engineer",
        photo: "/images/projects/fall-25/vexFALL25/emmanuelMichael.webp",
      },
      {
        name: "Purab Shah",
        title: "Backend Engineer",
        photo: "/images/projects/fall-25/vexFALL25/purabShah.webp",
      },
      {
        name: "Aditya Koul",
        title: "ML Engineer",
        photo: "/images/projects/fall-25/vexFALL25/adityaKoul.webp",
      },
      {
        name: "Abhyuday Goyal",
        title: "ML Engineer",
        photo: "/images/projects/fall-25/vexFALL25/abhyudayGoyal.webp",
      },
      {
        name: "Bhavesh Thapar",
        title: "ML Engineer",
        photo: "/images/projects/fall-25/vexFALL25/bhaveshThapar.webp",
      },
      {
        name: "Vihaan Motwani",
        title: "ML Engineer",
        photo: "/images/projects/fall-25/vexFALL25/vihaanMotwani.webp",
      },
      {
        name: "Leo Chen",
        title: "UI/UX",
        photo: "/images/projects/fall-25/vexFALL25/leoChen.webp",
      },
      {
        name: "Shiva Tripurana",
        title: "Front End Engineer",
        photo: "/images/projects/fall-25/vexFALL25/shivaTripurana.webp",
      },
      {
        name: "Eric Gilerson",
        title: "Front End Engineer",
        photo: "/images/projects/fall-25/vexFALL25/ericGilerson.webp",
      },
      {
        name: "Kanishk Sivanandam",
        title: "Front End Engineer",
        photo: "/images/projects/fall-25/vexFALL25/kanishkSivanandam.webp",
      },
      {
        name: "Faith Anyanwu",
        title: "Shadow",
        photo: "/images/projects/fall-25/vexFALL25/faithAnyanwu.webp",
      },
    ],
  },
  {
    slug: "qubi-fall-25",
    logo: "/images/logos/qubi.svg",
    logoAlt: "Qubi Logo",
    title: "Qubi",
    description:
      "Developed a full-stack mobile application that enables users to build, send, and visualize quantum circuits on different quantum computers while engaging with an interactive curriculum",
    year: 2025,
    semester: "Fall",
    showcaseContent: {
      image: "/images/projects/fall-25/qubiFALL25/qubi.png",
      description:
        "Interface for building and running a circuit on quantum simulators",
    },
    members: [
      {
        name: "Phoebe Dainer",
        title: "Team Lead",
        photo: "/images/projects/fall-25/qubiFALL25/phoebedainer.webp",
      },
      { name: "Kanjonavo Sabud", title: "Tech Lead (quantum)" },
      {
        name: "Siddharth Belwal",
        title: "Tech Lead (backend)",
        photo: "/images/projects/fall-25/qubiFALL25/siddharthbelwal.webp",
      },
      { name: "Aarush Vinod", title: "Backend Engineer" },
      {
        name: "Alex Shrestha",
        title: "Backend Engineer",
        photo: "/images/projects/fall-25/qubiFALL25/alexshrestha.webp",
      },
      {
        name: "Arav Ravula",
        title: "Frontend/Backend Engineer",
        photo: "/images/projects/fall-25/qubiFALL25/aravravula.webp",
      },
      {
        name: "Christie Cao",
        title: "UI/UX",
        photo: "/images/projects/fall-25/qubiFALL25/christiecao.webp",
      },
      {
        name: "Joey Lee",
        title: "Quantum Engineer",
        photo: "/images/projects/fall-25/qubiFALL25/joeylee.webp",
      },
      {
        name: "Nahom Wondimu",
        title: "Frontend Engineer",
        photo: "/images/projects/fall-25/qubiFALL25/nahomwondimu.webp",
      },
      {
        name: "Victor Casado",
        title: "Frontend Engineer",
        photo: "/images/projects/fall-25/qubiFALL25/victorcasado.webp",
      },
      {
        name: "Konstantinos Paparrizos",
        title: "Shadow",
        photo:
          "/images/projects/fall-25/qubiFALL25/konstantinospaparrizos.webp",
      },
      {
        name: "Abjini Chattopadhyay",
        title: "Shadow",
        photo: "/images/projects/fall-25/qubiFALL25/abjinichattopadhyay.webp",
      },
      {
        name: "Lianyu Peng",
        title: "Shadow",
        photo: "/images/projects/fall-25/qubiFALL25/lianyupeng.webp",
      },
    ],
  },
  {
    slug: "cnh-fall-25",
    logo: "/images/logos/childrens-national.png",
    logoAlt: "Childrens National Logo",
    title: "MRI Visualizer",
    description:
      "Developed a web-based application that enables users to upload brain MRI scans, visualize them interactively, and run backend deep-learning models to generate and overlay tumor segmentation results in real time",
    year: 2025,
    semester: "Fall",
    members: [
      {
        name: "Josiah Johnson",
        title: "Project Lead",
        photo: "/images/projects/fall-25/cnhFALL25/josiahjohnson.webp",
      },
      {
        name: "Anant Agrawal",
        title: "Tech Lead",
        photo: "/images/projects/fall-25/cnhFALL25/anantagrawal.webp",
      },
      {
        name: "Sathvik Andhavarapu",
        title: "Tech Lead",
        photo: "/images/projects/fall-25/cnhFALL25/sathvikandhavarapu.webp",
      },
      {
        name: "Mohe Edeen Abu Maizer",
        title: "Fullstack Engineer",
        photo: "/images/projects/fall-25/cnhFALL25/moheabumaizer.webp",
      },
      {
        name: "Daniel Son",
        title: "DevOps Engineer",
        photo: "/images/projects/fall-25/cnhFALL25/danielson.webp",
      },
      {
        name: "Anushmita Dey",
        title: "Frontend Engineer",
        photo: "/images/projects/fall-25/cnhFALL25/anushmitadey.webp",
      },
      {
        name: "Anannya Trehan",
        title: "Backend Engineer",
        photo: "/images/projects/fall-25/cnhFALL25/anannyatrehan.webp",
      },
      {
        name: "Aymaan Hussain",
        title: "Fullstack Engineer",
        photo: "/images/projects/fall-25/cnhFALL25/aymaanhussain.webp",
      },
      {
        name: "Cole Sladowsky",
        title: "Frontend Engineer",
        photo: "/images/projects/fall-25/cnhFALL25/colesladowsky.webp",
      },
      {
        name: "Arnav Sharma",
        title: "Backend Engineer",
        photo: "/images/projects/fall-25/cnhFALL25/arnavsharma.webp",
      },
      {
        name: "Rohan Chintakindi",
        title: "Backend Engineer",
        photo: "/images/projects/fall-25/cnhFALL25/rohanchintakindi.webp",
      },
      {
        name: "Emily Ho",
        title: "Shadow",
        photo: "/images/projects/fall-25/cnhFALL25/emilyho.webp",
      },
      {
        name: "Lakshmee Harivanam",
        title: "Project Manager",
        photo: "/images/projects/fall-25/cnhFALL25/lakshmeeharivanam.webp",
      },
      {
        name: "Chaitra Bhumula",
        title: "Fullstack Engineer",
        photo: "/images/projects/fall-25/cnhFALL25/chaitrabhumula.webp",
      },
      {
        name: "Nikita Arya",
        title: "UI/UX",
        photo: "/images/projects/fall-25/cnhFALL25/nikitaarya.webp",
      },
      {
        name: "Maggie McAndrew",
        title: "Shadow",
        photo: "/images/projects/fall-25/cnhFALL25/maggiemcandrew.webp",
      },
      {
        name: "Molly Panepento",
        title: "Shadow",
        photo: "/images/projects/fall-25/cnhFALL25/mollypanepento.webp",
      },
    ],
  },
  {
    slug: "ionq-fall-25",
    logo: "/images/logos/ionq.svg",
    logoAlt: "IonQ Logo",
    title: "Wildfire Prediction",
    description:
      "Developed quantum-ML prototypes with IonQ for wildfire prediction and tensor-network neural nets by integrating quantum layers, fixing amplitude embedding, benchmarking on HPC, and compiling MNIST tensor networks into executable quantum circuits",
    year: 2025,
    semester: "Fall",
    members: [
      {
        name: "Anika Rai",
        title: "Project Lead",
        photo: "/images/projects/fall-25/ionqFALL25/anikarai.webp",
      },
      {
        name: "Samarth Parekh",
        title: "Tech Lead",
        photo: "/images/projects/fall-25/ionqFALL25/samarthparekh.webp",
      },
      {
        name: "Jaiman Munshi",
        title: "Tech Lead",
        photo: "/images/projects/fall-25/ionqFALL25/jaimanmunshi.webp",
      },
      {
        name: "Sara Karnik",
        title: "Quantum Research Engineer",
        photo: "/images/projects/fall-25/ionqFALL25/sarakarnik.webp",
      },
      {
        name: "Anirudh Mantha",
        title: "Quantum Research Engineer",
        photo: "/images/projects/fall-25/ionqFALL25/anirudhmantha.webp",
      },
      { name: "Pranav Panicker", title: "Quantum Research Engineer" },
      {
        name: "Tanvi Tewary",
        title: "Quantum Research Engineer",
        photo: "/images/projects/fall-25/ionqFALL25/tanvitewary.webp",
      },
      {
        name: "Tom Shimoni",
        title: "Quantum Research Engineer",
        photo: "/images/projects/fall-25/ionqFALL25/tomshimoni.webp",
      },
      {
        name: "Sawyer Bloom",
        title: "Quantum Research Engineer",
        photo: "/images/projects/fall-25/ionqFALL25/sawyerbloom.webp",
      },
      { name: "Raunak Maheshwari", title: "Machine Learning Engineer" },
    ],
  },
  {
    slug: "boozallen-fall-25",
    logo: "/images/logos/booz-allen.png",
    logoAlt: "Booz Allen Logo",
    title: "AuditAssistant 2.0",
    description:
      "Added AI-powered smart search for quick information retrieval and API-based web-native policy viewer to existing Medicaid policy analysis tool",
    year: 2025,
    semester: "Fall",
    members: [
      {
        name: "Soham Katdare",
        title: "Project Lead",
        photo: "/images/projects/fall-25/boozallenFALL25/sohamKatdare.webp",
      },
      {
        name: "Kanhav Bhatnagar",
        title: "Tech Lead",
        photo: "/images/projects/fall-25/boozallenFALL25/kanhavbhatnagar.webp",
      },
      {
        name: "Dev Patel",
        title: "Tech Lead",
        photo: "/images/projects/fall-25/boozallenFALL25/devpatel.webp",
      },
      {
        name: "Mouli Banga",
        title: "Product Manager",
        photo: "/images/projects/fall-25/boozallenFALL25/moulibanga.webp",
      },
      { name: "Aditya Tripathi", title: "Full-Stack Engineer" },
      {
        name: "Katherine Hall",
        title: "Full-Stack Engineer",
        photo: "/images/projects/fall-25/boozallenFALL25/katherinehall.webp",
      },
      {
        name: "Aarav Borthakur",
        title: "Full-Stack Engineer",
        photo: "/images/projects/fall-25/boozallenFALL25/aaravborthakur.webp",
      },
      {
        name: "Allison Yu",
        title: "Full-stack Engineer",
        photo: "/images/projects/fall-25/boozallenFALL25/allisonyu.webp",
      },
      {
        name: "Harini Thirukonda",
        title: "Full-stack engineer",
        photo: "/images/projects/fall-25/boozallenFALL25/harinithirukonda.webp",
      },
      {
        name: "Agnik Banerjee",
        title: "Machine Learning Engineer",
        photo: "/images/projects/fall-25/boozallenFALL25/agnikbanerjee.webp",
      },
      {
        name: "Suneth Ramawickrama",
        title: "Machine Learning Engineer",
        photo:
          "/images/projects/fall-25/boozallenFALL25/sunethramawickrama.webp",
      },
      {
        name: "Nithin Bhandari",
        title: "Machine Learning Engineer",
        photo: "/images/projects/fall-25/boozallenFALL25/nithinbhandari.webp",
      },
      {
        name: "Rivan Parikh",
        title: "Machine Learning Engineer",
        photo: "/images/projects/fall-25/boozallenFALL25/rivanparikh.webp",
      },
      {
        name: "Amogh Samaga",
        title: "Machine Learning Engineer",
        photo: "/images/projects/fall-25/boozallenFALL25/amoghsamaga.webp",
      },
      {
        name: "Aprameya Kannan",
        title: "DevOps Engineer",
        photo: "/images/projects/fall-25/boozallenFALL25/aprameyakannan.webp",
      },
      {
        name: "Sidharth Ponram",
        title: "DevOps Engineer",
        photo: "/images/projects/fall-25/boozallenFALL25/sidharthponram.webp",
      },
    ],
  },
];

const SPRING_25_PROJECTS: Project[] = [
  {
    slug: "trachsense-sp-25",
    logo: "/images/logos/childrens-national.png",
    logoAlt: "Childrens National Logo",
    title: "TrachSense",
    description:
      "The team developed a compact CO2 sensing system that attaches to pediatric tracheostomy tubes, enabling continuous, remote monitoring to rapidly detect decannulation or obstruction and alert caregivers",
    year: 2025,
    semester: "Spring",
    members: [
      {
        name: "Hannah Chan",
        title: "Project Lead",
        photo:
          "/images/projects/spring-25/childrensNationalSP25/hannahChan.webp",
      },
      {
        name: "Surabhi Singh",
        title: "Project Manager",
        photo:
          "/images/projects/spring-25/childrensNationalSP25/surabhiSingh.webp",
      },
      {
        name: "Yashas Bhat",
        title: "Tech Lead",
        photo:
          "/images/projects/spring-25/childrensNationalSP25/yashasBhat.webp",
      },
      {
        name: "Mohammad Abd-Elmoniem",
        title: "Tech Lead",
        photo:
          "/images/projects/spring-25/childrensNationalSP25/mohammadAbd-Elmoniem.webp",
      },
      { name: "Matthew Xu", title: "Full-stack Engineer" },
      {
        name: "Tanmay Panguluri",
        title: "Full-stack Engineer",
        photo:
          "/images/projects/spring-25/childrensNationalSP25/tanmayPanguluri.webp",
      },
      {
        name: "Richard Yin",
        title: "Full-stack Engineer",
        photo:
          "/images/projects/spring-25/childrensNationalSP25/richardYin.webp",
      },
      {
        name: "Eswar Karavadi",
        title: "Front-end and TrachHub Engineer",
        photo:
          "/images/projects/spring-25/childrensNationalSP25/eswarKaravadi.webp",
      },
      {
        name: "Olivia Zhang",
        title: "Frontend Engineer",
        photo:
          "/images/projects/spring-25/childrensNationalSP25/oliviaZhang.webp",
      },
      {
        name: "Amogh Gurram",
        title: "Backend Engineer",
        photo:
          "/images/projects/spring-25/childrensNationalSP25/amoghGurram.webp",
      },
      { name: "Thomas Urdinola", title: "Backend Engineer" },
      {
        name: "Michelle Yu",
        title: "Shadower",
        photo:
          "/images/projects/spring-25/childrensNationalSP25/michelleYu.webp",
      },
      {
        name: "Jayant Kammula",
        title: "Shadower",
        photo:
          "/images/projects/spring-25/childrensNationalSP25/jayantKammula.webp",
      },
      {
        name: "Kira Le",
        title: "Shadower",
        photo: "/images/projects/spring-25/childrensNationalSP25/kiraLe.webp",
      },
    ],
  },
  {
    slug: "amazon-project-kuiper-sp-25",
    logo: "/images/logos/amazon.svg",
    logoAlt: "Amazon Project Kuiper Logo",
    title: "Amazon Project Kuiper",
    description:
      "Built a full-stack application on AWS using ML to predict representative clutter height for satellite ground station site selection, validated globally for accuracy and reliability",
    year: 2025,
    semester: "Spring",
    showcaseContent: {
      description:
        "A showcase of the dashboard and how it predicts satellite ground station site selection",
      image: "/images/projects/spring-25/amazonSP25/amazonSP25-showcase.png",
    },
    members: [
      {
        name: "Yuvraj Rekhi",
        title: "Project Lead",
        photo: "/images/projects/spring-25/amazonSP25/YuvrajRekhi.webp",
      },
      {
        name: "Rhea Sarkar",
        title: "Tech Lead",
        photo: "/images/projects/spring-25/amazonSP25/RheaSarkar.webp",
      },
      {
        name: "Vivek Nadig",
        title: "Tech Lead",
        photo: "/images/projects/spring-25/amazonSP25/VivekNadig.webp",
      },
      {
        name: "Anjali Gallacher",
        title: "PM / UI/UX",
        photo: "/images/projects/spring-25/amazonSP25/AnjaliGallacher.webp",
      },

      {
        name: "Joseph Cho",
        title: "Engineer",
        photo: "/images/projects/spring-25/amazonSP25/JosephCho.webp",
      },
      {
        name: "Advay Choudhury",
        title: "Engineer",
        photo: "/images/projects/spring-25/amazonSP25/AdvayChoudhury.webp",
      },
      {
        name: "Smithi Mahendran",
        title: "Engineer",
        photo: "/images/projects/spring-25/amazonSP25/SmithiMahendran.webp",
      },
      {
        name: "Viraj Urs",
        title: "Engineer",
        photo: "/images/projects/spring-25/amazonSP25/VirajUrs.webp",
      },
      {
        name: "Rishi Chudasama",
        title: "Engineer",
        photo: "/images/projects/spring-25/amazonSP25/RishiChudasama.webp",
      },
      {
        name: "Mohe Edeen Abu Maizer",
        title: "Engineer",
        photo: "/images/projects/spring-25/amazonSP25/MoheEdeenAbuMaizer.webp",
      },
      {
        name: "Arsh Goenka",
        title: "Engineer",
        photo: "/images/projects/spring-25/amazonSP25/ArshGoenka.webp",
      },
      {
        name: "Arav Luthra",
        title: "Engineer",
        photo: "/images/projects/spring-25/amazonSP25/AravLuthra.webp",
      },
      {
        name: "Akash Wudali",
        title: "Engineer",
        photo: "/images/projects/spring-25/amazonSP25/AkashWudali.webp",
      },
      {
        name: "Varun Mannam",
        title: "Engineer",
        photo: "/images/projects/spring-25/amazonSP25/VarunMannam.webp",
      },

      {
        name: "Aryan Jain",
        title: "Shadow",
        photo: "/images/projects/spring-25/amazonSP25/AryanJain.webp",
      },
      {
        name: "Ryan Li",
        title: "Shadow",
        photo: "/images/projects/spring-25/amazonSP25/RyanLi.webp",
      },
    ],
  },
  {
    slug: "mitre-sp-25",
    logo: "/images/logos/mitre.svg",
    logoAlt: "Mitre Logo",
    title: "Malware Analysis and Visualization",
    description:
      "This semester's project involved developing a centralized malware analysis platform for various tools used by the company",
    year: 2025,
    semester: "Spring",
    showcaseContent: {
      description:
        "Selecting what tool to use to analyze the uploaded malware files",
      image: "/images/projects/spring-25/mitreSP25/mitre-showcase.png",
    },
    members: [
      {
        name: "Amelia Harn",
        title: "Project Lead",
        photo: "/images/projects/spring-25/mitreSP25/ameliaHarn.webp",
      },
      {
        name: "Anand Vinod",
        title: "Tech Lead",
        photo: "/images/projects/spring-25/mitreSP25/anandVinod.webp",
      },
      {
        name: "Kevin Chong",
        title: "ML Tech Lead",
        photo: "/images/projects/spring-25/mitreSP25/kevinChong.webp",
      },
      {
        name: "Shreya Sanikommu",
        title: "Project Manager",
        photo: "/images/projects/spring-25/mitreSP25/shreyaSanikommu.webp",
        zoomPhotoIn: true,
      },
      {
        name: "Anvay Panguluri",
        title: "Backend Engineer",
        photo: "/images/projects/spring-25/mitreSP25/anvayPanguluri.webp",
      },
      {
        name: "Autumn Anson",
        title: "Frontend Engineer/Research",
        photo: "/images/projects/spring-25/mitreSP25/autumnAnson.webp",
      },
      {
        name: "Chayanika Sinha",
        title: "Data Visualization Engineer",
        photo: "/images/projects/spring-25/mitreSP25/chayanikaSinha.webp",
      },
      {
        name: "Gitika Saravanan",
        title: "DevOps Engineer",
        photo: "/images/projects/spring-25/mitreSP25/gitikaSaravanan.webp",
      },
      {
        name: "Jessica Zhou",
        title: "UI/UX Designer",
        photo: "/images/projects/spring-25/mitreSP25/jessicaZhou.webp",
        zoomPhotoIn: true,
      },
      {
        name: "Marvin Lin",
        title: "ML Engineer",
        photo: "/images/projects/spring-25/mitreSP25/marvinLin.webp",
      },
      {
        name: "Nate Zhang",
        title: "Frontend Engineer/Research",
        photo: "/images/projects/spring-25/mitreSP25/nateZhang.webp",
      },
      {
        name: "Parth Dua",
        title: "Backend/DevOps Engineer",
        photo: "/images/projects/spring-25/mitreSP25/parthDua.webp",
        zoomPhotoIn: true,
      },
      {
        name: "Ritvik Thakur",
        title: "Backend Engineer",
        photo: "/images/projects/spring-25/mitreSP25/ritvikThakur.webp",
      },
      {
        name: "Thomas Huitema",
        title: "Backend Engineer",
        photo: "/images/projects/spring-25/mitreSP25/thomasHuitema.webp",
      },
      {
        name: "Varun Kota",
        title: "ML Engineer",
        photo: "/images/projects/spring-25/mitreSP25/varunKota.webp",
      },
      {
        name: "Will Graham",
        title: "Frontend Engineer",
        photo: "/images/projects/spring-25/mitreSP25/willGraham.webp",
      },
    ],
  },
  {
    slug: "us-news-sp-25",
    logo: "/images/logos/us-news.svg",
    logoAlt: "U.S. News Logo",
    title: "Anomaly Detection & Visualization",
    description:
      "Advanced U.S News' data platform by building a dynamic frontend for their internal API and implementing anomaly detection on multiple metric types",
    year: 2025,
    semester: "Spring",
    members: [
      {
        name: "Madeline Anson",
        title: "Team Lead",
        photo: "/images/projects/spring-25/usNewsSP25/MadelineAnson.webp",
      },
      {
        name: "Josiah Lim",
        title: "Tech Lead",
        photo: "/images/projects/spring-25/usNewsSP25/JosiahLim.webp",
      },
      {
        name: "Pranav Palle",
        title: "Tech Lead",
        photo: "/images/projects/spring-25/usNewsSP25/PranavPalle.webp",
      },
      {
        name: "Tanish Anandababu",
        title: "Frontend Engineer",
        photo: "/images/projects/spring-25/usNewsSP25/TanishAnandababu.webp",
      },
      {
        name: "Sathvik Andhavarapu",
        title: "Frontend Engineer",
        photo: "/images/projects/spring-25/usNewsSP25/SathvikAndhavarapu.webp",
      },
      {
        name: "Akshita Badkundri",
        title: "Backend Engineer",
        photo: "/images/projects/spring-25/usNewsSP25/AkshitaBadkundri.webp",
      },
      {
        name: "Anant Agrawal",
        title: "Backend Engineer",
        photo: "/images/projects/spring-25/usNewsSP25/AnantAgrawal.webp",
      },
      {
        name: "Pranjal Kattel",
        title: "Engineer",
        photo: "/images/projects/spring-25/usNewsSP25/PranjalKattel.webp",
      },
      {
        name: "Alex Shrestha",
        title: "Engineer",
        photo: "/images/projects/spring-25/usNewsSP25/AlexShrestha.webp",
      },
      {
        name: "Bhavya Rajasekaran",
        title: "Backend Engineer",
        photo: "/images/projects/spring-25/usNewsSP25/BhavyaRajasekaran.webp",
      },
      {
        name: "Madeline Moldrem",
        title: "Shadow",
        photo: "/images/projects/spring-25/usNewsSP25/MadelineMoldrem.webp",
      },
      {
        name: "Samantha Tyles",
        title: "Shadow",
        photo: "/images/projects/spring-25/usNewsSP25/SamanthaTyles.webp",
      },
    ],
    showcaseContent: {
      image: "/images/projects/spring-25/usNewsSP25/demo.png",
      description:
        "Dashboard showing anomaly monitoring using the U.S. News API",
    },
  },
  {
    slug: "booz-allen-sp-25",
    logo: "/images/logos/booz-allen.png",
    logoAlt: "Booz Allen Logo",
    title: "Citation Configuration",
    description:
      "Created a web app to generate citations that supports uploading, filtering, and exporting policy data in an easy to use way",
    year: 2025,
    semester: "Spring",
    members: [
      {
        name: "Angela Zhang",
        title: "Project Lead",
        photo: "/images/projects/spring-25/boozAllenSP25/AngelaZhang.webp",
      },
      {
        name: "Daven Chang",
        title: "Tech Lead",
        photo: "/images/projects/spring-25/boozAllenSP25/DavenChang.webp",
      },
      {
        name: "Alan Jiang",
        title: "Tech Lead",
        photo: "/images/projects/spring-25/boozAllenSP25/AlanJiang.webp",
      },
      { name: "Isabelle Ortiz", title: "Project Manager" },
      {
        name: "Ritvik Mahapatra",
        title: "Engineer",
        photo: "/images/projects/spring-25/boozAllenSP25/RitvikMahapatra.webp",
      },
      {
        name: "Aidana Aibek",
        title: "UI/UX Designer",
        photo: "/images/projects/spring-25/boozAllenSP25/AidanaAibek.webp",
      },
      {
        name: "Dev Patel",
        title: "Engineer",
        photo: "/images/projects/spring-25/boozAllenSP25/DevPatel.webp",
      },
      {
        name: "Adnan Kabir",
        title: "Engineer",
        photo: "/images/projects/spring-25/boozAllenSP25/AdnanKabir.webp",
      },
      {
        name: "Sidharth Ponram",
        title: "Engineer",
        photo: "/images/projects/spring-25/boozAllenSP25/SidharthPonram.webp",
      },
      {
        name: "Rachel Li",
        title: "Engineer",
        photo: "/images/projects/spring-25/boozAllenSP25/RachelLi.webp",
      },
      {
        name: "Vir Trivedi",
        title: "Engineer",
        photo: "/images/projects/spring-25/boozAllenSP25/VirTrivedi.webp",
      },
      {
        name: "Kanhav Bhatnagar",
        title: "Engineer",
        photo: "/images/projects/spring-25/boozAllenSP25/KanhavBhatnagar.webp",
      },
      {
        name: "Chiraag Nadig",
        title: "Engineer",
        photo: "/images/projects/spring-25/boozAllenSP25/ChiraagNadig.webp",
      },
    ],
  },
  {
    slug: "gdit-sp-25",
    logo: "/images/logos/general-dynamics.png",
    logoAlt: "GDIT Logo",
    title: "EmailMiner",
    description:
      "Developed a scalable Retrieval Augmented Generation (RAG) pipeline to better query information from emails, utilizing relationship mappings and similarity search databases to improve data retrieval speed and accuracy",
    year: 2025,
    semester: "Spring",
    members: [
      {
        name: "Nishad Wajge",
        title: "Project Lead",
        photo: "/images/projects/spring-25/gditSP25/NishadWajge.webp",
      },
      {
        name: "Utsav Kataria",
        title: "Tech Lead",
        photo: "/images/projects/spring-25/gditSP25/UtsavKataria.webp",
      },
      {
        name: "Soham Katdare",
        title: "Tech Lead",
        photo: "/images/projects/spring-25/gditSP25/SohamKatdare.webp",
      },
      {
        name: "Ayan Banerjee",
        title: "ML Engineer",
        photo: "/images/projects/spring-25/gditSP25/AyanBanerjee.webp",
      },
      {
        name: "Angela Yu",
        title: "ML Engineer",
        photo: "/images/projects/spring-25/gditSP25/AngelaYu.webp",
      },
      {
        name: "Sriram Nallani",
        title: "ML Engineer",
        photo: "/images/projects/spring-25/gditSP25/SriramNallani.webp",
      },
      {
        name: "Lakshmee Harivanam",
        title: "ML Engineer",
        photo: "/images/projects/spring-25/gditSP25/LakshmeeHarivanam.webp",
      },
      {
        name: "Kaleb Ward",
        title: "Frontend Engineer",
        photo: "/images/projects/spring-25/gditSP25/KalebWard.webp",
      },
      {
        name: "Shivank Bhimavarapu",
        title: "Frontend Engineer",
        photo: "/images/projects/spring-25/gditSP25/ShivankBhimavarapu.webp",
      },
      {
        name: "Jaiman Munshi",
        title: "Backend Engineer",
        photo: "/images/projects/spring-25/gditSP25/JaimanMunshi.webp",
      },
      {
        name: "Sid Belwal",
        title: "Backend Engineer",
        photo: "/images/projects/spring-25/gditSP25/SidBelwal.webp",
      },
      {
        name: "Nithin Bhandari",
        title: "Backend Engineer",
        photo: "/images/projects/spring-25/gditSP25/NithinBhandari.webp",
      },
    ],
    showcaseContent: {
      image: "/images/projects/spring-25/gditSP25/demo.png",
      description:
        "EmailMiner interface showcasing how the RAG pipeline accurately retrieves relevant information from emails",
    },
  },
  {
    slug: "omal-sp-25",
    logo: "/images/logos/omal.webp",
    title: "Omal Learning Platform",
    description:
      "Created a cross-platform application that transforms interaction with educators and clients, offering an all-in-one platform to learn, showcase skills, and find projects across diverse professions",
    year: 2025,
    semester: "Spring",
    members: [
      {
        name: "Bilal Suleman",
        title: "Project Lead",
        photo: "/images/projects/spring-25/omalSP25/BilalSuleman.webp",
      },
      {
        name: "Krish Thakker",
        title: "Tech Lead",
        photo: "/images/projects/spring-25/omalSP25/KrishThakker.webp",
      },
      {
        name: "Vikaas Venkstesh",
        title: "Backend Developer",
        photo: "/images/projects/spring-25/omalSP25/VikaasVenkstesh.webp",
      },
      {
        name: "Ezekiel Franklin",
        title: "Backend Developer",
        photo: "/images/projects/spring-25/omalSP25/EzekielFranklin.webp",
      },
      {
        name: "Bryant Xiong",
        title: "Backend Developer",
        photo: "/images/projects/spring-25/omalSP25/BryantXiong.webp",
      },
      {
        name: "Edna Adissu",
        title: "UI/UX Designer",
        photo: "/images/projects/spring-25/omalSP25/EdnaAdissu.webp",
      },
      {
        name: "Miles McDonald",
        title: "Frontend Developer",
        photo: "/images/projects/spring-25/omalSP25/MilesMcDonald.webp",
      },
      {
        name: "Siddhant Jain",
        title: "Frontend Developer",
        photo: "/images/projects/spring-25/omalSP25/SiddhantJain.webp",
      },
      {
        name: "Lilly Ureta",
        title: "Bootcamp Shadow",
        photo: "/images/projects/spring-25/omalSP25/LillyUreta.webp",
      },
      {
        name: "Andrew Chen",
        title: "Project Manager",
        photo: "/images/projects/spring-25/omalSP25/AndrewChen.webp",
      },
    ],
  },
  {
    slug: "cnh-xray-sp25",
    logo: "/images/logos/childrens-national.png",
    logoAlt: "Childrens National Logo",
    title: "CNH X-Ray Project",
    description:
      "The team trained a Graph Neural Network (GNN) on the ABIDE and sEEG brain imaging dataset to create an application that assists in Autism diagnosis",
    year: 2025,
    semester: "Spring",
    showcaseContent: {
      image: "/images/projects/spring-25/cnhXraySP25/demo.png",
      description:
        "Visualizing imaging in 2D and 3D with focus on regions of interest",
    },
    members: [
      {
        name: "Andrew Yang",
        title: "Project Lead",
        photo: "/images/projects/spring-25/cnhXraySP25/andrewYang.webp",
      },
      {
        name: "Shlok Desai",
        title: "Research Lead",
        photo: "/images/projects/spring-25/cnhXraySP25/ShlokDesai.webp",
      },
      {
        name: "Naman Nagelia",
        title: "Engineer Lead",
        photo: "/images/projects/spring-25/cnhXraySP25/NamanNagelia.webp",
      },
      {
        name: "Nandhu Pillai",
        title: "Researcher",
        photo: "/images/projects/spring-25/cnhXraySP25/NandhuPillai.webp",
      },
      {
        name: "William Lee",
        title: "Researcher",
        photo: "/images/projects/spring-25/cnhXraySP25/WilliamLee.webp",
      },
      {
        name: "Anika Rai",
        title: "Researcher",
        photo: "/images/projects/spring-25/cnhXraySP25/AnikaRai.webp",
      },
      {
        name: "Rian Tiwari",
        title: "Researcher",
        photo: "/images/projects/spring-25/cnhXraySP25/RianTiwari.webp",
      },
      {
        name: "Anu Daga",
        title: "Researcher",
        photo: "/images/projects/spring-25/cnhXraySP25/AnuDaga.webp",
      },
      {
        name: "Jude Lwin",
        title: "Engineer",
        photo: "/images/projects/spring-25/cnhXraySP25/JudeLwin.webp",
      },
      {
        name: "Cathy Wu",
        title: "Engineer",
        photo: "/images/projects/spring-25/cnhXraySP25/CathyWu.webp",
      },
      {
        name: "Arush Jain",
        title: "Engineer",
        photo: "/images/projects/spring-25/cnhXraySP25/ArushJain.webp",
      },
      {
        name: "Alan Chan",
        title: "Engineer",
        photo: "/images/projects/spring-25/cnhXraySP25/AlanChan.webp",
      },
      {
        name: "Vibhas Ramani",
        title: "Engineer",
        photo: "/images/projects/spring-25/cnhXraySP25/VibhasRamani.webp",
      },
      {
        name: "Ishaan Chakraborty",
        title: "Project Manager",
        photo: "/images/projects/spring-25/cnhXraySP25/IshaanChakraborty.webp",
      },
      {
        name: "James Miller",
        title: "Shadow",
        photo: "/images/projects/spring-25/cnhXraySP25/JamesMiller.webp",
      },
      { name: "Aarya Vijayaraghavan", title: "Shadow" },
      {
        name: "Bhavya Tanugula",
        title: "Shadow",
        photo: "/images/projects/spring-25/cnhXraySP25/BhavyaTanugula.webp",
      },
    ],
  },
  {
    slug: "mokhtarzada-sp-25",
    logo: "/images/logos/hatchery-logo.webp",
    title: "Mokhtarzada Project",
    description:
      "Developed a tool to automatically fetch relevant financial documents from websites using AI-based browser automation and construct a vector database of financial data to inform the user about market situations and provide detailed insights into specific industries",
    year: 2025,
    semester: "Spring",
    members: [
      {
        name: "Atheesh Thirumalairajan",
        title: "Project Lead",
        photo:
          "/images/projects/spring-25/mokhtarzadaSP25/AtheeshThirumalairajan.webp",
      },
      {
        name: "Andy Diep",
        title: "Tech lead",
        photo: "/images/projects/spring-25/mokhtarzadaSP25/AndyDiep.webp",
      },
      {
        name: "Aadarsh Govada",
        title: "Engineer",
        photo: "/images/projects/spring-25/mokhtarzadaSP25/AadarshGovada.webp",
      },
      {
        name: "Arjun Rajaram",
        title: "Engineer",
        photo: "/images/projects/spring-25/mokhtarzadaSP25/ArjunRajaram.webp",
      },
      {
        name: "Eva Dimitrova",
        title: "Engineer",
        photo: "/images/projects/spring-25/mokhtarzadaSP25/EvaDimitrova.webp",
      },
      {
        name: "Evelyn Jiang",
        title: "Engineer",
        photo: "/images/projects/spring-25/mokhtarzadaSP25/EvelynJiang.webp",
      },
      {
        name: "Gili Gordiyenko",
        title: "Engineer",
        photo: "/images/projects/spring-25/mokhtarzadaSP25/GiliGordiyenko.webp",
      },
      {
        name: "Harini Thirukonda",
        title: "Engineer",
        photo:
          "/images/projects/spring-25/mokhtarzadaSP25/HariniThirukonda.webp",
      },
      {
        name: "Narain Sriram",
        title: "Engineer",
        photo: "/images/projects/spring-25/mokhtarzadaSP25/NarainSriram.webp",
      },
    ],
  },
  {
    slug: "warriors-legacy-sp-25",
    logo: "/images/logos/warriors-legacy.png",
    title: "Warriors Legacy Project",
    description:
      "Developed an all-in-one mobile app for veterans, integrating healthcare access, AI-powered resume suggestions, video calling, and messaging to support medical, career, and community needs",
    year: 2025,
    semester: "Spring",
    members: [
      {
        name: "Josiah Johnson",
        title: "Project Lead",
        photo:
          "/images/projects/spring-25/warriors-legacySP25/JosiahJohnson.webp",
      },
      {
        name: "Andy Hong",
        title: "Tech Lead",
        photo: "/images/projects/spring-25/warriors-legacySP25/AndyHong.webp",
      },
      {
        name: "Arnav Aggarwal",
        title: "Tech Lead",
        photo:
          "/images/projects/spring-25/warriors-legacySP25/ArnavAggarwal.webp",
      },

      {
        name: "Aprameya Kannan",
        title: "Fullstack Engineer",
        photo:
          "/images/projects/spring-25/warriors-legacySP25/AprameyaKannan.webp",
      },
      {
        name: "Aadi Anand",
        title: "Fullstack Engineer",
        photo: "/images/projects/spring-25/warriors-legacySP25/AadiAnand.webp",
      },
      {
        name: "Jacob Plunkert",
        title: "Fullstack Engineer",
        photo:
          "/images/projects/spring-25/warriors-legacySP25/JacobPlunkert.webp",
      },
      {
        name: "Tanay Naik",
        title: "Fullstack Engineer",
        photo: "/images/projects/spring-25/warriors-legacySP25/TanayNaik.webp",
      },
      { name: "Bharath Malipeddi", title: "Fullstack Engineer" },
      {
        name: "Rithvik Singh",
        title: "Fullstack Engineer",
        photo:
          "/images/projects/spring-25/warriors-legacySP25/RithvikSingh.webp",
      },
      {
        name: "Samarth Parekh",
        title: "Fullstack Engineer",
        photo:
          "/images/projects/spring-25/warriors-legacySP25/SamarthParekh.webp",
      },

      {
        name: "Riya Lakhani",
        title: "Fullstack Engineer",
        photo:
          "/images/projects/spring-25/warriors-legacySP25/RiyaLakhani.webp",
      },
      {
        name: "Milana Dagne",
        title: "Fullstack Engineer",
        photo:
          "/images/projects/spring-25/warriors-legacySP25/MilanaDagne.webp",
      },
    ],
  },
  {
    slug: "ionq-sp-25",
    logo: "/images/logos/ionq.svg",
    title: "Quantum Machine Learning",
    description:
      "Explored quantum machine learning for image classification, reproducing IonQ research papers, benchmarking against classical techniques, and testing quantum circuits on simulators before deploying to Aria-1 and Forte-1 ion-trap quantum computers",
    year: 2025,
    semester: "Spring",
    members: [
      {
        name: "Ashna Nayak",
        title: "Project Lead",
        photo: "/images/projects/spring-25/ionqSP25/AshnaNayak.webp",
      },
      {
        name: "Kushagra Mehta",
        title: "Tech Lead",
        photo: "/images/projects/spring-25/ionqSP25/KushagraMehta.webp",
      },
      {
        name: "Samarth Sriram",
        title: "Tech Lead",
        photo: "/images/projects/spring-25/ionqSP25/SamarthSriram.webp",
      },
      {
        name: "Joey Lee",
        title: "QML Engineer",
        photo: "/images/projects/spring-25/ionqSP25/JoeyLee.webp",
      },
      {
        name: "Kanjonavo Sabud",
        title: "QML Engineer",
        photo: "/images/projects/spring-25/ionqSP25/KanjonavoSabud.webp",
      },
      {
        name: "Kevan Kazeminezhad",
        title: "QML Engineer",
        photo: "/images/projects/spring-25/ionqSP25/KevanKazeminezhad.webp",
      },
      {
        name: "Max Wang",
        title: "QML Engineer",
        photo: "/images/projects/spring-25/ionqSP25/MaxWang.webp",
      },
      {
        name: "Mihir Talati",
        title: "QML Engineer",
        photo: "/images/projects/spring-25/ionqSP25/MihirTalati.webp",
      },
      {
        name: "Richa Gupta",
        title: "QML Engineer",
        photo: "/images/projects/spring-25/ionqSP25/RichaGupta.webp",
      },
      {
        name: "Samarth Parekh",
        title: "QML Engineer",
        photo: "/images/projects/spring-25/ionqSP25/SamarthParekh.webp",
      },
      {
        name: "Jessica Zhou",
        title: "PM",
        photo: "/images/projects/spring-25/ionqSP25/jessicaZhou.webp",
        zoomPhotoIn: true,
      },
      {
        name: "Pranav Krishnamurthy",
        title: "Shadower",
        photo: "/images/projects/spring-25/ionqSP25/PranavKrishnamurthy.webp",
      },
      {
        name: "Sawyer Bloom",
        title: "Shadower",
        photo: "/images/projects/spring-25/ionqSP25/SawyerBloom.webp",
      },
    ],
  },
];

// Featured projects must have exactly 3 items
const FEATURED_PROJECTS: FixedLengthArray<Project, 3> = [
  FALL_25_PROJECTS[0],
  FALL_25_PROJECTS[1],
  FALL_25_PROJECTS[2],
];
// const ALL_PROJECTS: Project[] = [...SPRING_25_PROJECTS, ...FALL_24_PROJECTS];
const ALL_PROJECTS: Project[] = [...SPRING_25_PROJECTS, ...FALL_25_PROJECTS];

export {
  ALL_PROJECTS,
  FEATURED_PROJECTS,
  SPRING_25_PROJECTS,
  FALL_25_PROJECTS,
};
