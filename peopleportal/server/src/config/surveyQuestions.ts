/** Question identities and wording are frozen for this version. */
export const SURVEY_VERSION = "2026-11-v1";

export const SURVEY_QUESTIONS = {
    engineer: [
        { key: "eng_quality", text: "How consistently did their work meet requirements and hold up during review and testing?" },
        { key: "eng_ownership", text: "How well did they follow through on commitments and communicate when plans changed?" },
        { key: "eng_initiative", text: "How actively did they recognize what needed attention and take useful action without waiting to be prompted?" },
        { key: "eng_design", text: "How meaningfully did they contribute ideas or feedback that helped the team improve the project’s design or technical approach?" },
        { key: "eng_collaboration", text: "How constructively did they work with others, especially when receiving feedback or facing disagreement?" },
    ],
    tech_lead: [
        { key: "lead_organization", text: "How effectively did they break project goals into clear engineering tasks and coordinate technical dependencies?" },
        { key: "lead_guidance", text: "How effectively did they help engineers understand their tasks, work through technical difficulties, and develop their skills?" },
        { key: "lead_design", text: "How effectively did they guide technical decisions by considering requirements, alternatives, and tradeoffs?" },
        { key: "lead_momentum", text: "How effectively did they identify and resolve technical blockers so implementation, review, and integration kept moving?" },
        { key: "lead_communication", text: "How effectively did they explain technical decisions, invite team input, and respond constructively to concerns?" },
    ],
    project_lead: [
        { key: "pl_organization", text: "How effectively did they establish clear responsibilities and a working structure for the team?" },
        { key: "pl_priorities", text: "How effectively did they help the team understand what to build, why it mattered, and what to prioritize?" },
        { key: "pl_support", text: "How effectively did they help members get the decisions, resources, or support needed to do their work?" },
        { key: "pl_delivery", text: "How effectively did they track progress and help the team adjust when plans became unrealistic?" },
        { key: "pl_communication", text: "How effectively did they keep the team aligned with stakeholders and communicate decisions or changes?" },
    ],
} as const;
