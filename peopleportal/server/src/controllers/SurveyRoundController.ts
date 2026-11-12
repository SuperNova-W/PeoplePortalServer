import { Body, Controller, Path, Post, Route, Security, SuccessResponse, Tags } from "tsoa";
import { getSurveyRoundService } from "../clients/AgendaClient/monthlySurveys";
import { CreateSurveyRoundRequest, SurveyRoundResult } from "../services/SurveyRoundService";

@Route("/api/surveys/rounds")
@Tags("Surveys")
export class SurveyRoundController extends Controller {
    /** Create this month's round now. Retrying preserves its original dates. */
    @Post()
    @Security("executive")
    @SuccessResponse("200", "Survey round created or retrieved")
    public async createRound(@Body() body: CreateSurveyRoundRequest): Promise<SurveyRoundResult> {
        return getSurveyRoundService().createRound(body);
    }

    @Post("{roundId}/close")
    @Security("executive")
    @SuccessResponse("200", "Survey round closed")
    public async closeRound(@Path() roundId: string): Promise<SurveyRoundResult> {
        return getSurveyRoundService().closeRound(roundId);
    }

    @Post("{roundId}/regenerate")
    @Security("executive")
    @SuccessResponse("200", "Missing assignments generated")
    public async regenerateAssignments(@Path() roundId: string): Promise<SurveyRoundResult> {
        return getSurveyRoundService().regenerateAssignments(roundId);
    }
}
