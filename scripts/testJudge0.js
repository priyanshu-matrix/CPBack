const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TestCasesModel = require('../models/TestCases');
const Problem = require('../models/Problems');
const User = require('../models/User');
const Contest = require('../models/Contests');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}/api/compiler`;

// Test statistics
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

function recordTest(name, passed, details = {}) {
  stats.total++;
  if (passed) {
    stats.passed++;
    console.log(`\x1b[32m✔ [PASS]\x1b[0m ${name}`);
  } else {
    stats.failed++;
    console.log(`\x1b[31m✖ [FAIL]\x1b[0m ${name}`, details);
  }
  stats.details.push({ name, passed, details });
}

async function runTests() {
  console.log('====================================================');
  console.log('Starting Comprehensive Judge0 Routes Test Suite');
  console.log(`Target: ${BASE_URL}`);
  console.log('====================================================');

  await mongoose.connect(process.env.MONGO);
  console.log('Connected to MongoDB Atlas\n');

  let testProblem = null;
  let testCasesDoc = null;
  let noSampleProblem = null;
  let noSampleTestCasesDoc = null;
  let emptyCasesProblem = null;
  let emptyCasesDoc = null;
  let testUser = null;
  let testContest = null;

  try {
    // -----------------------------------------------------------------
    // 1. SETUP TEST FIXTURES IN MONGO
    // -----------------------------------------------------------------
    console.log('Setting up test fixtures in DB...');

    // 1.1 Problem with 2 samples + 2 hidden test cases (Problem: Sum of Two Numbers A + B)
    testProblem = await Problem.create({
      title: 'TEST_Sum_Of_Two_Numbers_' + Date.now(),
      description: 'Given two integers A and B, print their sum.',
      difficulty: 'Easy',
      inputFormat: 'Two space-separated integers',
      outputFormat: 'Single integer sum',
      examples: [
        { input: '3 5', output: '8', explanation: '3 + 5 = 8' }
      ],
      constraints: ['1 <= A, B <= 1000'],
      timeLimit: 1,
      memoryLimit: 256
    });

    testCasesDoc = await TestCasesModel.create({
      problemId: testProblem._id.toString(),
      testCases: [
        { input: '3 5\n', output: '8\n', isSample: true },
        { input: '10 20\n', output: '30\n', isSample: true },
        { input: '100 200\n', output: '300\n', isSample: false },
        { input: '500 500\n', output: '1000\n', isSample: false }
      ]
    });

    // 1.2 Problem with no sample test cases
    noSampleProblem = await Problem.create({
      title: 'TEST_No_Samples_' + Date.now(),
      description: 'A problem without sample testcases',
      difficulty: 'Easy'
    });
    noSampleTestCasesDoc = await TestCasesModel.create({
      problemId: noSampleProblem._id.toString(),
      testCases: [
        { input: '1 1\n', output: '2\n', isSample: false }
      ]
    });

    // 1.3 Problem with empty testcases array
    emptyCasesProblem = await Problem.create({
      title: 'TEST_Empty_Cases_' + Date.now(),
      description: 'A problem with empty testcases',
      difficulty: 'Easy'
    });
    emptyCasesDoc = await TestCasesModel.create({
      problemId: emptyCasesProblem._id.toString(),
      testCases: []
    });

    // 1.4 Test User
    const testUid = 'test-firebase-uid-' + Date.now();
    testUser = await User.create({
      uid: testUid,
      email: 'tester@example.com',
      name: 'Test Coder',
      solvedProblems: []
    });

    // 1.5 Test Contest
    testContest = await Contest.create({
      id: 'contest-test-' + Date.now(),
      title: 'Unit Test Contest',
      date: '2026-09-27',
      duration: '60',
      problems: 1,
      level: 'Easy',
      description: 'Contest for automated testing',
      currentRound: 1,
      matches: {
        '1': [
          {
            matchId: 'match-101',
            user1: testUid,
            user2: 'opponent-uid-999',
            winner: null,
            status: 'pending',
            problemId: testProblem._id.toString()
          }
        ]
      }
    });

    console.log('Fixtures created successfully!\n');

    // -----------------------------------------------------------------
    // SECTION 1: GET /api/compiler/getLanguages
    // -----------------------------------------------------------------
    console.log('--- SECTION 1: GET /api/compiler/getLanguages ---');

    try {
      const res = await axios.get(`${BASE_URL}/getLanguages`);
      const isArray = Array.isArray(res.data?.languages);
      const count = isArray ? res.data.languages.length : 0;
      const hasCoreLangs = isArray && res.data.languages.some(l => l.name.includes('Python')) &&
        res.data.languages.some(l => l.name.includes('C++')) &&
        res.data.languages.some(l => l.name.includes('Java')) &&
        res.data.languages.some(l => l.name.includes('JavaScript'));

      recordTest('getLanguages returns status 200 and language list', res.status === 200 && isArray && count > 0, {
        status: res.status,
        languageCount: count,
        message: res.data.message
      });

      recordTest('getLanguages contains core languages (Python, C++, Java, JS)', hasCoreLangs, {
        sampleLanguages: res.data.languages?.slice(0, 5)
      });
    } catch (err) {
      recordTest('getLanguages endpoint call failed', false, { error: err.message });
    }

    // -----------------------------------------------------------------
    // SECTION 2: Input Validation & Edge Cases for submitCode
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 2: Validation & Error Handling in submitCode ---');

    // 2.1 Non-existent question_id (404 expected)
    try {
      const res = await axios.post(`${BASE_URL}/submitCode`, {
        language_id: 71,
        code: 'print("hello")',
        question_id: new mongoose.Types.ObjectId().toString()
      });
      recordTest('submitCode with non-existent question_id returns 404', false, { receivedStatus: res.status });
    } catch (err) {
      const status = err.response?.status;
      recordTest('submitCode with non-existent question_id returns 404', status === 404, {
        status,
        data: err.response?.data
      });
    }

    // 2.2 Problem with empty testcases (400 expected)
    try {
      const res = await axios.post(`${BASE_URL}/submitCode`, {
        language_id: 71,
        code: 'print("hello")',
        question_id: emptyCasesProblem._id.toString()
      });
      recordTest('submitCode on problem with no test cases returns 400', false, { receivedStatus: res.status });
    } catch (err) {
      const status = err.response?.status;
      recordTest('submitCode on problem with no test cases returns 400', status === 400, {
        status,
        data: err.response?.data
      });
    }

    // 2.3 runSampleOnly when no sample cases exist (400 expected)
    try {
      const res = await axios.post(`${BASE_URL}/submitCode`, {
        language_id: 71,
        code: 'print("hello")',
        question_id: noSampleProblem._id.toString(),
        runSampleOnly: true
      });
      recordTest('submitCode runSampleOnly when no samples exist returns 400', false, { receivedStatus: res.status });
    } catch (err) {
      const status = err.response?.status;
      recordTest('submitCode runSampleOnly when no samples exist returns 400', status === 400, {
        status,
        data: err.response?.data
      });
    }

    // -----------------------------------------------------------------
    // SECTION 3: Compilation Error (CE)
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 3: Compilation Error Detection ---');

    try {
      const invalidCppCode = `#include <iostream>
int main() {
    this_is_a_syntax_error();
    return 0;
}`;
      const res = await axios.post(`${BASE_URL}/submitCode`, {
        language_id: 54, // C++ (GCC 9.2.0)
        code: invalidCppCode,
        question_id: testProblem._id.toString()
      });

      const isCE = res.data?.overallStatus === 'Compilation Error' && res.data?.details?.status?.id === 6;
      recordTest('Compilation check catches syntax error and returns Compilation Error (status 6)', isCE, {
        overallStatus: res.data?.overallStatus,
        statusId: res.data?.details?.status?.id,
        compileOutput: res.data?.details?.compile_output ? Buffer.from(res.data.details.compile_output, 'base64').toString('utf8').slice(0, 100) : null
      });
    } catch (err) {
      recordTest('Compilation check failed with request error', false, { error: err.response?.data || err.message });
    }

    // -----------------------------------------------------------------
    // SECTION 4: Accepted (AC) Full Run & Sample Only
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 4: Accepted (AC) Solutions & Sample Only ---');

    const pythonSolution = `import sys
lines = sys.stdin.read().split()
if lines:
    a, b = map(int, lines[:2])
    print(a + b)
`;

    // 4.1 Sample Only Run
    try {
      const res = await axios.post(`${BASE_URL}/submitCode`, {
        language_id: 71, // Python 3
        code: pythonSolution,
        question_id: testProblem._id.toString(),
        runSampleOnly: true
      });

      const isSampleAC = res.data?.overallStatus === 'Accepted' &&
        res.data?.executionStats?.totalTestCases === 2 &&
        res.data?.message?.includes('sample test cases passed');

      recordTest('runSampleOnly: true passes only sample test cases (2 of 2)', isSampleAC, {
        overallStatus: res.data?.overallStatus,
        message: res.data?.message,
        executionStats: res.data?.executionStats
      });
    } catch (err) {
      recordTest('runSampleOnly request failed', false, { error: err.response?.data || err.message });
    }

    // 4.2 Full Run (all 4 test cases)
    try {
      const res = await axios.post(`${BASE_URL}/submitCode`, {
        language_id: 71, // Python 3
        code: pythonSolution,
        question_id: testProblem._id.toString()
      });

      const isFullAC = res.data?.overallStatus === 'Accepted' &&
        res.data?.executionStats?.totalTestCases === 4 &&
        res.data?.executionStats?.executedTestCases === 4;

      recordTest('Full execution passes all test cases (4 of 4)', isFullAC, {
        overallStatus: res.data?.overallStatus,
        message: res.data?.message,
        executionStats: res.data?.executionStats
      });
    } catch (err) {
      recordTest('Full execution request failed', false, { error: err.response?.data || err.message });
    }

    // -----------------------------------------------------------------
    // SECTION 5: Wrong Answer (WA) & Early Termination
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 5: Wrong Answer (WA) and Early Termination ---');

    // Code that succeeds on sample 1 (3 + 5 = 8), but fails on sample 2 (10 + 20 gives wrong answer)
    const pythonWrongAnswer = `import sys
lines = sys.stdin.read().split()
if lines:
    a, b = map(int, lines[:2])
    if a == 3 and b == 5:
        print(8)
    else:
        print(99999)
`;

    try {
      const res = await axios.post(`${BASE_URL}/submitCode`, {
        language_id: 71,
        code: pythonWrongAnswer,
        question_id: testProblem._id.toString()
      });

      const isWA = res.data?.overallStatus === 'Wrong Answer';
      const stoppedEarly = res.data?.executionStats?.stoppedEarly === true;
      const failedCase = res.data?.failedTestCaseNumber;

      recordTest('Wrong Answer properly identified and stops early', isWA && stoppedEarly, {
        overallStatus: res.data?.overallStatus,
        failedTestCaseNumber: failedCase,
        totalExecuted: res.data?.totalTestCasesExecuted,
        stoppedEarly: res.data?.executionStats?.stoppedEarly
      });
    } catch (err) {
      recordTest('Wrong Answer test failed with request error', false, { error: err.response?.data || err.message });
    }

    // -----------------------------------------------------------------
    // SECTION 6: Time Limit Exceeded (TLE)
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 6: Time Limit Exceeded (TLE) ---');

    const pythonTLE = `import time
while True:
    pass
`;

    try {
      const startTime = Date.now();
      const res = await axios.post(`${BASE_URL}/submitCode`, {
        language_id: 71,
        code: pythonTLE,
        question_id: testProblem._id.toString(),
        timeLimit: 1.0
      });
      const elapsed = (Date.now() - startTime) / 1000;

      const isTLE = res.data?.overallStatus === 'Time Limit Exceeded' ||
        res.data?.details?.status?.description?.includes('Time Limit');

      recordTest('Infinite loop caught with Time Limit Exceeded', isTLE, {
        overallStatus: res.data?.overallStatus,
        elapsedSeconds: elapsed.toFixed(2),
        detailsStatus: res.data?.details?.status
      });
    } catch (err) {
      recordTest('TLE test failed with request error', false, { error: err.response?.data || err.message });
    }

    // -----------------------------------------------------------------
    // SECTION 7: Runtime Error (RTE)
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 7: Runtime Error (RTE) Handling ---');

    const pythonRTE = `import sys
# ZeroDivisionError
x = 1 / 0
`;

    try {
      const res = await axios.post(`${BASE_URL}/submitCode`, {
        language_id: 71,
        code: pythonRTE,
        question_id: testProblem._id.toString()
      });

      const isRTE = res.data?.overallStatus?.toLowerCase().includes('runtime') ||
        res.data?.overallStatus?.toLowerCase().includes('nzec') ||
        res.data?.details?.status?.id >= 7;

      recordTest('Uncaught exception caught as Runtime Error / NZEC', isRTE, {
        overallStatus: res.data?.overallStatus,
        statusId: res.data?.details?.status?.id,
        statusDescription: res.data?.details?.status?.description
      });
    } catch (err) {
      recordTest('Runtime error test failed with request error', false, { error: err.response?.data || err.message });
    }

    // -----------------------------------------------------------------
    // SECTION 8: Multi-Language Testing (C++, JavaScript, Java)
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 8: Multi-Language Compilation & Execution ---');

    // 8.1 C++ (GCC 9.2.0 - ID 54)
    const cppCode = `#include <iostream>
using namespace std;
int main() {
    int a, b;
    if (cin >> a >> b) {
        cout << a + b << endl;
    }
    return 0;
}`;
    try {
      const res = await axios.post(`${BASE_URL}/submitCode`, {
        language_id: 54,
        code: cppCode,
        question_id: testProblem._id.toString()
      });
      recordTest('C++ (GCC 9.2.0, ID 54) solution Accepted', res.data?.overallStatus === 'Accepted', {
        overallStatus: res.data?.overallStatus,
        time: res.data?.details?.time,
        memory: res.data?.details?.memory
      });
    } catch (err) {
      recordTest('C++ submission failed', false, { error: err.response?.data || err.message });
    }

    // 8.2 JavaScript (Node.js 12.14.0 - ID 63)
    const jsCode = `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input.length >= 2) {
    const a = parseInt(input[0], 10);
    const b = parseInt(input[1], 10);
    console.log(a + b);
}`;
    try {
      const res = await axios.post(`${BASE_URL}/submitCode`, {
        language_id: 63,
        code: jsCode,
        question_id: testProblem._id.toString()
      });
      recordTest('JavaScript (Node.js, ID 63) solution Accepted', res.data?.overallStatus === 'Accepted', {
        overallStatus: res.data?.overallStatus,
        time: res.data?.details?.time
      });
    } catch (err) {
      recordTest('JavaScript submission failed', false, { error: err.response?.data || err.message });
    }

    // 8.3 Java (OpenJDK 13.0.1 - ID 62)
    const javaCode = `import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int a = sc.nextInt();
            int b = sc.nextInt();
            System.out.println(a + b);
        }
    }
}`;
    try {
      const res = await axios.post(`${BASE_URL}/submitCode`, {
        language_id: 62,
        code: javaCode,
        question_id: testProblem._id.toString(),
        timeLimit: 2.0 // Java startup needs slightly higher time limit
      });
      recordTest('Java (OpenJDK 13.0.1, ID 62) solution Accepted', res.data?.overallStatus === 'Accepted', {
        overallStatus: res.data?.overallStatus,
        time: res.data?.details?.time
      });
    } catch (err) {
      recordTest('Java submission failed', false, { error: err.response?.data || err.message });
    }

    // -----------------------------------------------------------------
    // SECTION 9: Base64 Encoding Support
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 9: Base64 Encoded Code Submission ---');

    try {
      const base64Python = Buffer.from(pythonSolution).toString('base64');
      const res = await axios.post(`${BASE_URL}/submitCode`, {
        language_id: 71,
        code: base64Python,
        question_id: testProblem._id.toString(),
        runSampleOnly: true
      });
      recordTest('Base64 pre-encoded source code runs and produces Accepted', res.data?.overallStatus === 'Accepted', {
        overallStatus: res.data?.overallStatus
      });
    } catch (err) {
      recordTest('Base64 submission failed', false, { error: err.response?.data || err.message });
    }

    // -----------------------------------------------------------------
    // SECTION 10: In-Memory Compilation Caching
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 10: In-Memory Compilation Cache ---');

    try {
      const uniqueCode = `# Unique cache test code ${Date.now()}
import sys
lines = sys.stdin.read().split()
if lines:
    a, b = map(int, lines[:2])
    print(a + b)
`;
      // First run (uncached)
      const t1Start = Date.now();
      await axios.post(`${BASE_URL}/submitCode`, {
        language_id: 71,
        code: uniqueCode,
        question_id: testProblem._id.toString(),
        runSampleOnly: true
      });
      const t1Duration = Date.now() - t1Start;

      // Second run (cached)
      const t2Start = Date.now();
      const res2 = await axios.post(`${BASE_URL}/submitCode`, {
        language_id: 71,
        code: uniqueCode,
        question_id: testProblem._id.toString(),
        runSampleOnly: true
      });
      const t2Duration = Date.now() - t2Start;

      const cacheWorked = res2.data?.overallStatus === 'Accepted' && t2Duration <= t1Duration;
      recordTest('In-memory cache delivers faster response on identical submission', cacheWorked, {
        firstRunMs: t1Duration,
        secondRunMs: t2Duration,
        speedup: `${((t1Duration - t2Duration) / t1Duration * 100).toFixed(1)}%`
      });
    } catch (err) {
      recordTest('Cache test failed with request error', false, { error: err.response?.data || err.message });
    }

    // -----------------------------------------------------------------
    // SECTION 11: Database Side-Effects (User solvedProblems & Contest Match)
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 11: User & Contest State Updates on AC ---');

    try {
      // Submit AC with userId and contestId
      const res = await axios.post(`${BASE_URL}/submitCode`, {
        language_id: 71,
        code: pythonSolution,
        question_id: testProblem._id.toString(),
        userId: testUser.uid,
        contestId: testContest._id.toString()
      });

      // Verify user document updated in Mongo
      const updatedUser = await User.findOne({ uid: testUser.uid });
      const hasSolved = updatedUser.solvedProblems.some(
        sp => sp.problemId.toString() === testProblem._id.toString()
      );

      recordTest('Successful submission updates user.solvedProblems in DB', hasSolved, {
        solvedProblemsCount: updatedUser.solvedProblems.length,
        firstSolved: updatedUser.solvedProblems[0]
      });

      // Verify idempotency (submitting again doesn't duplicate)
      await axios.post(`${BASE_URL}/submitCode`, {
        language_id: 71,
        code: pythonSolution,
        question_id: testProblem._id.toString(),
        userId: testUser.uid
      });
      const recheckedUser = await User.findOne({ uid: testUser.uid });
      recordTest('Submitting solved problem again does not create duplicate in user.solvedProblems', recheckedUser.solvedProblems.length === 1, {
        solvedProblemsCount: recheckedUser.solvedProblems.length
      });

      // Verify contest match was marked completed and won
      const updatedContest = await Contest.findById(testContest._id);
      const matchesRound1 = updatedContest.matches.get('1');
      const testMatch = matchesRound1.find(m => m.user1 === testUser.uid);

      const matchWon = testMatch && testMatch.status === 'completed' && testMatch.winner === testUser.uid;
      const messageWon = res.data?.message?.includes('You have won the match!');

      recordTest('Contest match updated to completed with winner set to userId', matchWon && messageWon, {
        status: testMatch?.status,
        winner: testMatch?.winner,
        message: res.data?.message
      });
    } catch (err) {
      recordTest('User and Contest update test failed', false, { error: err.response?.data || err.message });
    }

  } finally {
    // -----------------------------------------------------------------
    // CLEANUP
    // -----------------------------------------------------------------
    console.log('\n--- Cleaning up test fixtures from DB ---');
    if (testProblem) await Problem.findByIdAndDelete(testProblem._id);
    if (testCasesDoc) await TestCasesModel.findByIdAndDelete(testCasesDoc._id);
    if (noSampleProblem) await Problem.findByIdAndDelete(noSampleProblem._id);
    if (noSampleTestCasesDoc) await TestCasesModel.findByIdAndDelete(noSampleTestCasesDoc._id);
    if (emptyCasesProblem) await Problem.findByIdAndDelete(emptyCasesProblem._id);
    if (emptyCasesDoc) await TestCasesModel.findByIdAndDelete(emptyCasesDoc._id);
    if (testUser) await User.findByIdAndDelete(testUser._id);
    if (testContest) await Contest.findByIdAndDelete(testContest._id);
    console.log('Cleanup completed.\n');

    await mongoose.disconnect();
  }

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log('====================================================');
  console.log('Test Summary:');
  console.log(`Total Tests : ${stats.total}`);
  console.log(`Passed      : \x1b[32m${stats.passed}\x1b[0m`);
  console.log(`Failed      : \x1b[31m${stats.failed}\x1b[0m`);
  console.log('====================================================');

  if (stats.failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
