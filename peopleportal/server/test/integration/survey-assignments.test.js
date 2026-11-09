const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const axios = require('axios');
const { fixture, withSnapshot } = require('../helpers/survey-snapshot');
const { SurveyController } = require('../../dist/controllers/SurveyController');
const { SurveyAssignment } = require('../../dist/models/SurveyAssignment');
const { SurveyAssignmentBatch } = require('../../dist/models/SurveyAssignmentBatch');
let mongo;
const request = pk => ({session:{authorizedUser:{pk}}});
const body = {semester:'FALL-2025',snapshotRunId:'run-a'};
test.before(async()=>{mongo=await MongoMemoryServer.create();await mongoose.connect(mongo.getUri('survey-test'));await Promise.all([SurveyAssignment.init(),SurveyAssignmentBatch.init()]);});
test.after(async()=>{await mongoose.disconnect();if(mongo)await mongo.stop();});
test.beforeEach(async()=>{await SurveyAssignment.deleteMany({});await SurveyAssignmentBatch.deleteMany({});});
test('concurrent generation is saved once, uses no live data, and isolates respondents',async()=>withSnapshot(async()=>{
  const original=axios.request;axios.request=async()=>{throw new Error('Live data must not be read');};
  try {
    await Promise.all(Array.from({length:3},()=>new SurveyController().generateAssignments(request(99),'p',body)));
    assert.equal(await SurveyAssignment.countDocuments(),2);
    const saved=await SurveyAssignment.findOne().lean();
    assert.equal(saved.snapshotRunId,'run-a');assert.match(saved.snapshotSha256,/^[a-f0-9]{64}$/);
    await new SurveyController().generateAssignments(request(100),'p',body);
    const again=await SurveyAssignment.findById(saved._id).lean();
    assert.equal(again.createdBy,99);assert.deepEqual(again.createdAt,saved.createdAt);
    const assignments=(await new SurveyController().getMyAssignments(request(1),'FALL-2025')).assignments;
    assert.deepEqual(assignments.map(p=>[p.respondentPk,p.techLeadPk]),[[1,2],[1,4]]);
    assert.deepEqual((await new SurveyController().getMyAssignments(request(2),'FALL-2025')).assignments,[]);
    assert.deepEqual((await new SurveyController().getMyAssignments(request(3),'FALL-2025')).assignments,[]);
    await assert.rejects(()=>SurveyAssignment.create({...saved,_id:undefined}),e=>e.code===11000);
  }finally{axios.request=original;}
}));
test('different snapshots cannot mix even when generation starts concurrently',async()=>withSnapshot(async({write})=>{
  await write(fixture('run-b'),'run-b');
  const outcomes=await Promise.allSettled(['run-a','run-b'].map(snapshotRunId=>new SurveyController().generateAssignments(request(99),'p',{...body,snapshotRunId})));
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(outcomes.find(r=>r.status==='rejected').reason.status,409);
  assert.equal((await SurveyAssignment.distinct('snapshotRunId')).length,1);
}));
test('modified snapshot bytes and legacy rows require explicit review',async()=>withSnapshot(async({data,write})=>{
  await new SurveyController().generateAssignments(request(99),'p',body);
  data.roster[0].name='changed';await write(data);
  await assert.rejects(()=>new SurveyController().generateAssignments(request(99),'p',body),{status:409});
  await SurveyAssignment.deleteMany({});await SurveyAssignmentBatch.deleteMany({});
  await SurveyAssignment.collection.insertOne({semester:'FALL-2025',projectPk:'p',respondentPk:2,techLeadPk:4,createdBy:99});
  await assert.rejects(()=>new SurveyController().generateAssignments(request(99),'p',body),{status:409});
  assert.deepEqual((await new SurveyController().getMyAssignments(request(2),'FALL-2025')).assignments,[]);
}));
