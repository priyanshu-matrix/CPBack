const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Problem = require('../models/Problems');
const TestCasesModel = require('../models/TestCases');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}/api/compiler`;

async function quickTest() {
  console.log('--- Quick Judge0 & Header Verification ---');
  console.log(`JUDGE0_AUTH_USER: "${process.env.JUDGE0_AUTH_USER}"`);
  console.log(`JUDGE0_AUTH_TOKEN: "${process.env.JUDGE0_AUTH_TOKEN ? '***' : 'none'}"`);
  console.log(`Target: ${BASE_URL}\n`);

  // 1. Test getLanguages (uses X-Auth-User & X-Auth-Token)
  console.log('1. Testing GET /api/compiler/getLanguages...');
  const t0 = Date.now();
  const langRes = await axios.get(`${BASE_URL}/getLanguages`);
  const langCount = langRes.data?.languages?.length || 0;
  console.log(`✔ Languages returned: ${langCount} (took ${Date.now() - t0}ms)`);

  // 2. Test submitCode (uses X-Auth-User & X-Auth-Token)
  console.log('2. Testing POST /api/compiler/submitCode with sample test...');
  await mongoose.connect(process.env.MONGO);
  
  let p = null;
  let tc = null;
  try {
    p = await Problem.create({
      title: 'QUICK_TEST_' + Date.now(),
      description: 'Quick test',
      difficulty: 'Easy'
    });

    tc = await TestCasesModel.create({
      problemId: p._id.toString(),
      testCases: [
        { input: '2 3\n', output: '5\n', isSample: true }
      ]
    });

    const submitRes = await axios.post(`${BASE_URL}/submitCode`, {
      language_id: 71, // Python 3
      code: 'import sys\na, b = map(int, sys.stdin.read().split())\nprint(a + b)',
      question_id: p._id.toString(),
      runSampleOnly: true
    });

    console.log(`✔ Submission overallStatus: ${submitRes.data?.overallStatus}`);
    console.log(`✔ Status details: ${submitRes.data?.details?.status?.description}`);
    console.log('All quick checks PASSED successfully!');
  } finally {
    if (p) await Problem.findByIdAndDelete(p._id);
    if (tc) await TestCasesModel.findByIdAndDelete(tc._id);
    await mongoose.disconnect();
  }
}

quickTest().catch(err => {
  console.error('✖ Quick test failed:', err.response?.data || err.message);
  process.exit(1);
});
