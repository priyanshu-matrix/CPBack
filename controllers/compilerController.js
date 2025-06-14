const api_root = process.env.JUDGE0;
const axios = require("axios");
const http = require('http');
const https = require('https');
const TestCasesModel = require("../models/TestCases"); // Added TestCases model

// Configure axios to use connection pooling
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

// Use the agents for all axios requests
axios.defaults.httpAgent = httpAgent;
axios.defaults.httpsAgent = httpsAgent;

// Simple in-memory cache for compilation results
// This helps avoid redundant compilations for identical code
const compilationCache = new Map();
// Cache expiry in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Periodic cache cleanup to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of compilationCache.entries()) {
        if (now > value.timestamp + CACHE_TTL) {
            compilationCache.delete(key);
        }
    }
}, 60 * 1000); // Run cleanup every minute

const getLanguages = async (req, res) => {
    try {
        const response = await axios.get(`${api_root}/languages`, {
            headers: {
                "Content-Type": "application/json",
                "X-Auth-User": process.env.JUDGE0_AUTH_USER,
                "X-Auth-Token": process.env.JUDGE0_AUTH_TOKEN,
            },
        });

        res.status(200).json({
            languages: response.data,
            message: "Languages fetched successfully",
        });
    } catch (error) {
        console.error("Error fetching languages:", error);
        res.status(500).json({ error: "Failed to fetch languages" });
    }
};

/**
 * Compile and run code on Judge0 with full sandbox limits.
 * @param {string} code – source code (can be plain text or base64 encoded)
 * @param {string} input – program stdin (plain text)
 * @param {string} expectedOutput – optional expected stdout (plain text)
 * @param {number} languageId – Judge0 language_id (integer)
 */
async function compileCodeUsingJudge0(
    code,
    input,
    expectedOutput,
    languageId,
    timelimit = 1.0
) {
    // Function to check if string is valid base64
    function isBase64(str) {
        try {
            // Check if it's a valid base64 string
            const decoded = Buffer.from(str, "base64").toString("utf8");
            const reencoded = Buffer.from(decoded).toString("base64");
            return reencoded === str;
        } catch (error) {
            return false;
        }
    }

    // Ensure code is base64 encoded
    const base64Code = isBase64(code)
        ? code
        : Buffer.from(code).toString("base64");
    
    // Create a cache key based on code, input, and language
    const submissionCacheKey = `${base64Code}_${Buffer.from(input).toString("base64")}_${languageId}`;
    
    // Check if we have a cached result
    if (compilationCache.has(submissionCacheKey)) {
        const cachedResult = compilationCache.get(submissionCacheKey);
        // Only return from cache if it's still valid
        if (Date.now() - cachedResult.timestamp < CACHE_TTL) {
            console.log("Cache hit for compilation result");
            return cachedResult.data;
        } else {
            // Expired cache entry
            compilationCache.delete(submissionCacheKey);
        }
    }

    // Base64-encode text fields when using base64_encoded=true
    const payload = {
        source_code: base64Code,
        stdin: Buffer.from(input).toString("base64"),
        expected_output: expectedOutput
            ? Buffer.from(expectedOutput).toString("base64")
            : undefined,
        language_id: languageId,

        // Judge0 config vars - optimized:
        cpu_time_limit: timelimit, // seconds
        cpu_extra_time: 0.3, // reduced from 0.5 to improve speed
        wall_time_limit: timelimit + 0.3, // reduced from timelimit+0.5
        memory_limit: 262144, // KB (256 MB)
        stack_limit: 16384, // KB (16 MB) - increased to prevent stack overflows
        max_processes_and_or_threads: 60, // increased from 50
        enable_per_process_and_thread_time_limit: true,
        enable_per_process_and_thread_memory_limit: true,
        max_file_size: 1024, // KB (1 MB)
        redirect_stderr_to_stdout: true,
        enable_network: false,
        number_of_runs: 1,
    };

    // Check cache first
    const cacheKey = `${languageId}:${base64Code}:${Buffer.from(input).toString("base64")}`;
    if (compilationCache.has(cacheKey)) {
        const cachedResult = compilationCache.get(cacheKey);
        console.log("Cache hit for compilation:", cacheKey);
        return cachedResult.response;
    }

    // Submit and wait for immediate results
    try {
        const headers = {
            "Content-Type": "application/json",
            "X-Auth-User": process.env.JUDGE0_AUTH_USER ,
            "X-Auth-Token": process.env.JUDGE0_AUTH_TOKEN,
        };
        
        // Use wait=true but with a shorter timeout - good balance between async and sync
        const res = await axios.post(
            `${api_root}/submissions?base64_encoded=true&wait=true`,
            payload,
            {
                headers,
                timeout: 10000, // 10 second timeout to avoid hanging requests
                signal: AbortSignal.timeout(5000) // Additional safety to ensure we can abort requests
            }
        );

        // Cache the response
        compilationCache.set(cacheKey, {
            response: res.data,
            timestamp: Date.now(),
        });

        // Store result in cache
        compilationCache.set(submissionCacheKey, {
            data: res.data,
            timestamp: Date.now()
        });
        
        // res.data contains stdout, stderr, compile_output, status, etc.
        return res.data;
    } catch (error) {
        console.error(
            "Error in compileCodeUsingJudge0:",
            error.response?.data || error.message
        );
        throw error;
    }
}

const submitCode = async (req, res) => {
    try {
        const User = require("../models/User");
        const Problem = require("../models/Problems");
        const Contest = require("../models/Contests");

        const { language_id, code, question_id, userId, runSampleOnly, contestId } =
            req.body;

        // Fetch test cases from MongoDB
        const problemDocument = await TestCasesModel.findOne({
            problemId: question_id,
        });

        if (!problemDocument) {
            return res
                .status(404)
                .json({
                    error: `Question with ID ${question_id} not found or has no test cases.`,
                });
        }

        if (
            !problemDocument.testCases ||
            !Array.isArray(problemDocument.testCases) ||
            problemDocument.testCases.length === 0
        ) {
            return res
                .status(400)
                .json({ error: `No test cases found for question ID ${question_id}.` });
        }

        // const base64EncodedCode = Buffer.from(code).toString('base64');
        let testCasesToRun = problemDocument.testCases;

        if (runSampleOnly === true) {
            testCasesToRun = problemDocument.testCases.filter(
                (testCase) => testCase.isSample === true
            );
            if (testCasesToRun.length === 0) {
                return res
                    .status(400)
                    .json({
                        error: `No sample test cases found for question ID ${question_id}.`,
                    });
            }
        }
        
        console.log(`Running ${testCasesToRun.length} test cases in parallel`);
        
        // Check for compilation errors first with just one quick submission
        // This avoids wasting resources on multiple submissions if code doesn't compile
        const compilationCheck = await compileCodeUsingJudge0(
            code,
            "", // Empty input for compilation check
            "",
            language_id
        );
        
        if (compilationCheck.status.id === 6) {
            // Compilation Error
            return res.status(200).json({
                overallStatus: "Compilation Error",
                message: "Code compilation failed.",
                details: compilationCheck,
            });
        }
        
        // Create a controller to abort running tests when one fails
        const controller = new AbortController();
        const signal = controller.signal;

        // Process test cases with early termination
        const testCasePromises = testCasesToRun.map((testCase, index) => {
            console.log(`Starting test case ${index + 1}`);
            return {
                promise: compileCodeUsingJudge0(
                    code,
                    testCase.input,
                    testCase.output,
                    language_id
                ),
                index,
                testCase
            };
        });
        
        // Execute test cases with early termination
        let failedResult = null;
        const testResults = [];

        // Use a race-based approach for early termination
        for (let i = 0; i < testCasePromises.length; i++) {
            if (signal.aborted) {
                break;
            }

            const currentBatch = testCasePromises.slice(i, i + 3); // Process 3 test cases concurrently
            const results = await Promise.all(
                currentBatch.map(async ({ promise, index, testCase }) => {
                    try {
                        if (signal.aborted) return null;
                        
                        const response = await promise;
                        console.log(
                            `Test case ${index + 1} response status: ${response.status.id} - ${response.status.description}`
                        );
                        
                        if (response.status.id !== 3) {
                            // Test case failed - signal abort and return the error
                            controller.abort();
                            return {
                                failed: true,
                                response,
                                index,
                                testCase
                            };
                        }
                        
                        return {
                            failed: false,
                            response,
                            index,
                            testCase
                        };
                    } catch (error) {
                        console.error(`Error executing test case ${index + 1}:`, error);
                        return null;
                    }
                })
            );
            
            // Filter out nulls and add valid results
            const validResults = results.filter(r => r !== null);
            testResults.push(...validResults);
            
            // Check if any test case in this batch failed
            const failed = validResults.find(r => r.failed);
            if (failed) {
                failedResult = failed;
                break; // Stop processing test cases
            }
        }
        
        // If we have a failed test case, return its error
        if (failedResult) {
            const { response, index, testCase } = failedResult;
            let testCaseNumber = index + 1;
            let message = `Test case ${testCaseNumber} failed.`;
            if (runSampleOnly === true && testCase.isSample === true) {
                message = `Sample test case ${testCaseNumber} failed.`;
            }
            return res.status(200).json({
                overallStatus: response.status.description,
                message: message,
                failedTestCaseNumber: testCaseNumber,
                details: response,
            });
        }
        
        // If we reach here, all tests passed
        const lastResponse = testResults[testResults.length - 1].response;

        // If loop completes, all test cases passed
        let message = "All test cases passed successfully!";
        if (runSampleOnly === true) {
            message = "All sample test cases passed successfully!";
        }

        // If code is accepted, mark problem as solved for the user and update contest match
        if (lastResponse.status.id === 3 && userId) {
            // Update user's solved problems
            const user = await User.findOne({ uid: userId }); // Use uid instead of _id since userId is likely the Firebase UID
            const problem = await Problem.findById(question_id); // Use findById since question_id is likely the problem's _id

            if (user && problem) {
                // Check if problem is not already solved
                const alreadySolved = user.solvedProblems.some(
                    (solved) => solved.problemId.toString() === problem._id.toString()
                );
                if (!alreadySolved) {
                    user.solvedProblems.push({
                        problemId: problem._id,
                        solvedAt: new Date(),
                    });
                    await user.save();
                }

                // If contestId is provided, update the contest match
                if (contestId) {
                    const contest = await Contest.findById(contestId);
                    if (contest) {
                        const currentRound = contest.currentRound;
                        if (currentRound) {
                            const currentMatches = contest.matches.get(String(currentRound));
                            if (currentMatches) {
                                // Find the user's match in the current round
                                const userMatch = currentMatches.find(
                                    (match) =>
                                        (match.user1 === userId || match.user2 === userId) &&
                                        match.status === "pending"
                                );

                                if (userMatch) {
                                    // Update match: set winner and mark as completed
                                    const opponentId =
                                        userMatch.user1 === userId
                                            ? userMatch.user2
                                            : userMatch.user1;
                                    userMatch.winner = userId;
                                    userMatch.status = "completed";
                                    await contest.save();

                                    message += " You have won the match!";

                                    // Emit socket event to user and opponent
                                    const io = require("../socket").getIO();
                                    io.to(userId).emit("matchUpdate", {
                                        contestId,
                                        matchId: userMatch._id,
                                        status: "won",
                                        opponentId,
                                    });
                                    io.to(opponentId).emit("matchUpdate", {
                                        contestId,
                                        matchId: userMatch._id,
                                        status: "lost",
                                        opponentId: userId,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        res.status(200).json({
            overallStatus: "Accepted",
            message: message,
            details: lastResponse, // Contains details of the last successful test case run
        });
    } catch (error) {
        console.error(
            "Error submitting code:",
            error.response ? error.response.data : error.message
        );
        res.status(500).json({
            error: "Failed to submit code for compilation.",
            details: error.response ? error.response.data : error.message,
        });
    }
};

module.exports = { getLanguages, submitCode };
