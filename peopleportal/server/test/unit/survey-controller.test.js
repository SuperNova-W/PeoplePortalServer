const assert = require('node:assert/strict');
const test = require('node:test');
const { SurveyController } = require('../../dist/controllers/SurveyController');
const { SurveyAssignment } = require('../../dist/models/SurveyAssignment');
test('listing is restricted to the signed-in member and excludes legacy live-data rows',async()=>{
  const original = SurveyAssignment.find; let filter;
  SurveyAssignment.find = query => { filter=query; return {select:()=>({sort:()=>({lean:async()=>[]})})}; };
  try {
    await new SurveyController().getMyAssignments({session:{authorizedUser:{pk:7}}},'FALL-2025');
    assert.deepEqual(filter,{semester:'FALL-2025',respondentPk:7,snapshotRunId:{$exists:true},snapshotSha256:{$exists:true}});
    await assert.rejects(()=>new SurveyController().getMyAssignments({},'invalid'),{status:400});
    await assert.rejects(()=>new SurveyController().generateAssignments({},'p',{semester:'invalid',snapshotRunId:'run-a'}),{status:400});
  } finally { SurveyAssignment.find=original; }
});
