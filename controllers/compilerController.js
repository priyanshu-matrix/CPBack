const api_root = "http://158.178.243.53:2358";
const axios = require('axios');


const getLanguages = async (req, res) => {
    try {
        const response = await axios.get(`${api_root}/languages`);

        res.status(200).json({
            languages: response.data,
            message: 'Languages fetched successfully'
        });
    } catch (error) {
        console.error('Error fetching languages:', error);
        res.status(500).json({ error: 'Failed to fetch languages' });
    }
};

/**
 * Compile and run code on Judge0 with full sandbox limits.
 * @param {string} code – source code (base64 encoded text)
 * @param {string} input – program stdin (plain text)
 * @param {string} expectedOutput – optional expected stdout (plain text)
 * @param {number} languageId – Judge0 language_id (integer)
 */
async function compileCodeUsingJudge0(code, input, expectedOutput, languageId) {
    // Base64-encode text fields when using base64_encoded=true
    const payload = {
        source_code: code,
        stdin: Buffer.from(input).toString('base64'),
        expected_output: expectedOutput
            ? Buffer.from(expectedOutput).toString('base64')
            : undefined,
        language_id: languageId,

        // Judge0 config vars:
        cpu_time_limit: 1.0,       // seconds
        cpu_extra_time: 0.5,       // seconds
        wall_time_limit: 2.0,       // seconds
        memory_limit: 262144,    // KB (256 MB)
        stack_limit: 8192,      // KB (8 MB)
        max_processes_and_or_threads: 50,
        enable_per_process_and_thread_time_limit: true,
        enable_per_process_and_thread_memory_limit: true,
        max_file_size: 1024,     // KB (1 MB)
        redirect_stderr_to_stdout: true,
        enable_network: false,
        number_of_runs: 1
    };

    // Submit and wait for immediate results
    const res = await axios.post(
        `${api_root}/submissions?base64_encoded=true&wait=true`,
        payload,
        { headers: { 'Content-Type': 'application/json' } }
    );

    // res.data contains stdout, stderr, compile_output, status, etc.
    return res.data;
}

const submitCode = async (req, res) => {
    try {
        const path = require('path');
        const dataPath = path.join(__dirname, 'questionsData.json');
        // Use delete require.cache[require.resolve(dataPath)] to ensure fresh data if file changes frequently
        // For simplicity, assuming it's loaded once per server start or changes are handled by server restart
        const questionsData = require(dataPath);
        const User = require('../models/User'); // Added User model
        const Problem = require('../models/Problems'); // Added Problem model


        const { language_id, code, question_id, userId } = req.body; // Added userId

        if (!questionsData[question_id]) {
            return res.status(404).json({ error: `Question with ID ${question_id} not found.` });
        }

        const questionDetails = questionsData[question_id];
        if (!questionDetails.testCases || !Array.isArray(questionDetails.testCases) || questionDetails.testCases.length === 0) {
            return res.status(400).json({ error: `No test cases found for question ID ${question_id}.` });
        }

        const base64EncodedCode = Buffer.from(code).toString('base64');
        let lastResponse = null;

        for (let i = 0; i < questionDetails.testCases.length; i++) {
            const testCase = questionDetails.testCases[i];
            const response = await compileCodeUsingJudge0(base64EncodedCode, testCase.input, testCase.output, language_id);
            lastResponse = response; // Store the latest response

            // Judge0 status IDs: 3 = Accepted, 6 = Compilation Error
            // Other statuses (Wrong Answer, TLE, Runtime Error) also mean not accepted.
            
            if (response.status.id === 6) { // Compilation Error
                return res.status(200).json({
                    overallStatus: "Compilation Error",
                    message: "Code compilation failed.",
                    details: response
                });
            }

            if (response.status.id !== 3) { // Not Accepted (Wrong Answer, TLE, Runtime Error etc.)
                return res.status(200).json({
                    overallStatus: response.status.description,
                    message: `Test case ${i + 1} failed.`,
                    failedTestCaseNumber: i + 1,
                    details: response
                });
            }
        }

        // If loop completes, all test cases passed
        res.status(200).json({
            overallStatus: "Accepted",
            message: "All test cases passed successfully!",
            details: lastResponse // Contains details of the last successful test case run
        });

        // If code is accepted, mark problem as solved for the user
        if (lastResponse.status.id === 3 && userId) {
            const user = await User.findById(userId);
            const problem = await Problem.findOne({ question_id: question_id }); // Assuming question_id in req.body maps to question_id in Problem model
            if (user && problem && !user.solvedProblems.includes(problem._id)) {
                user.solvedProblems.push(problem._id);
                await user.save();
            }
        }

    } catch (error) {
        console.error('Error submitting code:', error.response ? error.response.data : error.message);
        res.status(500).json({ 
            error: 'Failed to submit code for compilation.',
            details: error.response ? error.response.data : error.message 
        });
    }
};


module.exports = { getLanguages, submitCode };