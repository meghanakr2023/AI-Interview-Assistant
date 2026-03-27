// ── Global State ──────────────────────────────────────────────────────────────
let mediaRecorder       = null;
let recordingChunks     = [];
let recordedBlob        = null;
let currentSubject      = null;
let isSpeaking          = false;
let currentAudio        = null;
let currentMode         = "voice";
let resumeText          = "";
let monacoEditor        = null;
let currentProblemIndex = 0;
let codingStarted       = false;

const BASE_URL = "https://ai-interview-assistant-hs8y.onrender.com";

// ── Body Language State ───────────────────────────────────────────────────────
let faceMesh            = null;
let webcamStream        = null;
let webcamCamera        = null;
let isAnalyzing         = false;

// Accumulate scores across entire interview
let blFrames = {
    total:          0,
    eyeContact:     0,   // frames where user is looking at screen
    goodPosture:    0,   // frames where face is upright and centered
    positiveExpr:   0,   // frames where mouth corners are up (smile)
    faceVisible:    0,   // frames where face is detected at all
};

// Coding problems
const CODING_PROBLEMS = [
    { title: "Reverse a String",    description: "Write a function that reverses a string without using built-in reverse methods.", example: "'hello' → 'olleh'" },
    { title: "FizzBuzz",            description: "Print numbers 1–20. Multiples of 3 → 'Fizz', multiples of 5 → 'Buzz', both → 'FizzBuzz'.", example: "1, 2, Fizz, 4, Buzz …" },
    { title: "Find Duplicates",     description: "Given a list of integers, return all duplicate values.", example: "[1,2,3,2,4,3] → [2,3]" },
    { title: "Palindrome Check",    description: "Return True if a string is a palindrome, False otherwise.", example: "'racecar' → True" },
    { title: "Sum of Digits",       description: "Return the sum of all digits in an integer.", example: "1234 → 10" },
];

// ── DOM refs ──────────────────────────────────────────────────────────────────
const welcomeState       = document.getElementById("welcomeState");
const interviewState     = document.getElementById("interviewState");
const subjectBtns        = document.querySelectorAll(".subject-btn");
const subjectBadge       = document.getElementById("subjectBadge");
const subjectIcon        = document.getElementById("subjectIcon");
const modeLabel          = document.getElementById("modeLabel");
const questionNum        = document.getElementById("questionNum");
const speakingBubble     = document.getElementById("speakingBubble");

// Voice
const voiceControls      = document.getElementById("voiceControls");
const startInterviewBtn  = document.getElementById("startInterviewBtn");
const recordBtn          = document.getElementById("recordBtn");
const micIcon            = document.getElementById("micIcon");
const stopIcon           = document.getElementById("stopIcon");
const recordingStatus    = document.getElementById("recordingStatus");
const submitBtn          = document.getElementById("submitBtn");

// Coding
const codingControls     = document.getElementById("codingControls");
const problemBox         = document.getElementById("problemBox");
const problemTitle       = document.getElementById("problemTitle");
const problemDescription = document.getElementById("problemDescription");
const problemExample     = document.getElementById("problemExample");
const langSelect         = document.getElementById("langSelect");
const monacoContainer    = document.getElementById("monacoContainer");
const execOutput         = document.getElementById("execOutput");
const execText           = document.getElementById("execText");
const startCodingBtn     = document.getElementById("startCodingBtn");
const runCodeBtn         = document.getElementById("runCodeBtn");
const codingStatus       = document.getElementById("codingStatus");

// Emotion
const emotionPanel       = document.getElementById("emotionPanel");
const emotionScore       = document.getElementById("emotionScore");
const emotionBar         = document.getElementById("emotionBar");
const emotionLabel       = document.getElementById("emotionLabel");
const emotionWPM         = document.getElementById("emotionWPM");
const emotionFillers     = document.getElementById("emotionFillers");
const emotionLength      = document.getElementById("emotionLength");
const emotionTips        = document.getElementById("emotionTips");

// Mode buttons
const modeVoiceBtn       = document.getElementById("modeVoice");
const modeCodingBtn      = document.getElementById("modeCoding");

// Resume
const dropZone           = document.getElementById("dropZone");
const resumeInput        = document.getElementById("resumeInput");
const resumeStatus       = document.getElementById("resumeStatus");

// Webcam PiP
const webcamPip          = document.getElementById("webcamPip");
const webcamVideo        = document.getElementById("webcamVideo");
const webcamCanvas       = document.getElementById("webcamCanvas");
const eyeIndicator       = document.getElementById("eyeIndicator");

// Common
const endInterviewBtn    = document.getElementById("endInterviewBtn");
const feedbackSection    = document.getElementById("feedbackSection");
const getFeedbackArea    = document.getElementById("getFeedbackArea");
const getFeedbackBtn     = document.getElementById("getFeedbackBtn");
const feedbackContent    = document.getElementById("feedbackContent");
const feedbackSubject    = document.getElementById("feedbackSubject");
const scoreCircle        = document.getElementById("scoreCircle");
const scoreValue         = document.getElementById("scoreValue");
const feedbackText       = document.getElementById("feedbackText");
const improvementText    = document.getElementById("improvementText");
const newInterviewBtn    = document.getElementById("newInterviewBtn");

// Body language feedback
const bodyLangCard       = document.getElementById("bodyLangCard");
const bodyLangScore      = document.getElementById("bodyLangScore");
const bodyLangLabel      = document.getElementById("bodyLangLabel");
const eyeContactPct      = document.getElementById("eyeContactPct");
const eyeContactBar      = document.getElementById("eyeContactBar");
const posturePct         = document.getElementById("posturePct");
const postureBar         = document.getElementById("postureBar");
const expressionPct      = document.getElementById("expressionPct");
const expressionBar      = document.getElementById("expressionBar");
const visibilityPct      = document.getElementById("visibilityPct");
const visibilityBar      = document.getElementById("visibilityBar");
const bodyLangTips       = document.getElementById("bodyLangTips");

const iconMap = {
    "Self Introduction": "fas fa-user text-blue-400",
    "Generative AI":     "fas fa-brain text-purple-400",
    "Python":            "fab fa-python text-yellow-400",
    "English":           "fas fa-language text-green-400",
    "HTML":              "fab fa-html5 text-orange-400",
    "CSS":               "fab fa-css3-alt text-blue-400",
};


// ════════════════════════════════════════════════════════════════════════════
// MEDIAPIPE — Body Language Detection
// ════════════════════════════════════════════════════════════════════════════

function initFaceMesh() {
    faceMesh = new FaceMesh({
        locateFile: file =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
        maxNumFaces:            1,
        refineLandmarks:        true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence:  0.5,
    });

    faceMesh.onResults(onFaceMeshResults);
}

function onFaceMeshResults(results) {
    const canvas  = webcamCanvas;
    const ctx     = canvas.getContext("2d");
    canvas.width  = webcamVideo.videoWidth  || 160;
    canvas.height = webcamVideo.videoHeight || 120;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        // No face detected
        eyeIndicator.style.background    = "#ef4444";
        eyeIndicator.style.boxShadow     = "0 0 6px #ef4444";
        blFrames.total++;
        return;
    }

    blFrames.total++;
    blFrames.faceVisible++;

    const landmarks = results.multiFaceLandmarks[0];
    const W = canvas.width;
    const H = canvas.height;

    // ── 1. Eye Contact Detection ─────────────────────────────────────────────
    // Compare iris position relative to eye corners
    // Left iris: 468, Left eye corners: 33 (left), 133 (right)
    // Right iris: 473, Right eye corners: 362 (left), 263 (right)
    const leftIris   = landmarks[468];
    const leftInner  = landmarks[133];
    const leftOuter  = landmarks[33];
    const rightIris  = landmarks[473];
    const rightInner = landmarks[362];
    const rightOuter = landmarks[263];

    const leftEyeWidth  = Math.abs(leftInner.x  - leftOuter.x);
    const rightEyeWidth = Math.abs(rightInner.x - rightOuter.x);

    const leftIrisOffset  = Math.abs(leftIris.x  - (leftInner.x  + leftOuter.x)  / 2) / (leftEyeWidth  + 0.001);
    const rightIrisOffset = Math.abs(rightIris.x - (rightInner.x + rightOuter.x) / 2) / (rightEyeWidth + 0.001);

    const avgIrisOffset = (leftIrisOffset + rightIrisOffset) / 2;
    const isLookingAtScreen = avgIrisOffset < 0.25;  // threshold

    if (isLookingAtScreen) {
        blFrames.eyeContact++;
        eyeIndicator.style.background = "#22c55e";
        eyeIndicator.style.boxShadow  = "0 0 6px #22c55e";
    } else {
        eyeIndicator.style.background = "#f59e0b";
        eyeIndicator.style.boxShadow  = "0 0 6px #f59e0b";
    }

    // ── 2. Posture Detection ──────────────────────────────────────────────────
    // Use nose tip (1) and face center horizontal position
    // Good posture = face is centered horizontally and nose is roughly level
    const noseTip    = landmarks[1];
    const faceCenter = { x: noseTip.x, y: noseTip.y };

    const horizontalOffset = Math.abs(faceCenter.x - 0.5);   // 0 = center
    const isCentered       = horizontalOffset < 0.15;

    // Check head tilt using left eye (33) vs right eye (263) y-difference
    const eyeYDiff  = Math.abs(landmarks[33].y - landmarks[263].y);
    const isUpright = eyeYDiff < 0.04;

    if (isCentered && isUpright) blFrames.goodPosture++;

    // ── 3. Expression Detection (Smile) ───────────────────────────────────────
    // Mouth corners: 61 (left), 291 (right), top lip center: 13
    const mouthLeft   = landmarks[61];
    const mouthRight  = landmarks[291];
    const mouthTop    = landmarks[13];
    const mouthBottom = landmarks[14];

    // Mouth corner elevation relative to mouth center
    const mouthCenterY  = (mouthTop.y + mouthBottom.y) / 2;
    const cornerAvgY    = (mouthLeft.y + mouthRight.y) / 2;
    const smileScore    = mouthCenterY - cornerAvgY;  // positive = corners above center = smile

    if (smileScore > 0.005) blFrames.positiveExpr++;

    // ── 4. Draw subtle dot landmarks on canvas (optional visual) ─────────────
    ctx.fillStyle = "rgba(102,126,234,0.6)";
    [33, 263, 1, 61, 291, 468, 473].forEach(idx => {
        const lm = landmarks[idx];
        ctx.beginPath();
        ctx.arc(lm.x * W, lm.y * H, 2, 0, 2 * Math.PI);
        ctx.fill();
    });
}

async function startWebcam() {
    try {
        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: "user" },
            audio: false,
        });
        webcamVideo.srcObject = webcamStream;

        await new Promise(resolve => { webcamVideo.onloadedmetadata = resolve; });
        webcamVideo.play();

        webcamPip.style.display = "block";
        isAnalyzing = true;

        // Reset counters
        blFrames = { total: 0, eyeContact: 0, goodPosture: 0, positiveExpr: 0, faceVisible: 0 };

        initFaceMesh();

        // Run face mesh on video frames
        webcamCamera = new Camera(webcamVideo, {
            onFrame: async () => {
                if (isAnalyzing && faceMesh) {
                    await faceMesh.send({ image: webcamVideo });
                }
            },
            width: 320,
            height: 240,
        });
        webcamCamera.start();

    } catch (err) {
        console.warn("Webcam not available:", err);
        webcamPip.style.display = "none";
    }
}

function stopWebcam() {
    isAnalyzing = false;
    if (webcamCamera) { webcamCamera.stop(); webcamCamera = null; }
    if (webcamStream) {
        webcamStream.getTracks().forEach(t => t.stop());
        webcamStream = null;
    }
    webcamPip.style.display = "none";
}

function computeBodyLanguageResults() {
    if (blFrames.total === 0) return null;

    const eyePct        = Math.round((blFrames.eyeContact    / blFrames.total) * 100);
    const posturePctVal = Math.round((blFrames.goodPosture   / blFrames.total) * 100);
    const exprPctVal    = Math.round((blFrames.positiveExpr  / blFrames.total) * 100);
    const visPctVal     = Math.round((blFrames.faceVisible   / blFrames.total) * 100);

    // Overall score = weighted average
    const overall = Math.round(
        eyePct        * 0.40 +
        posturePctVal * 0.30 +
        exprPctVal    * 0.15 +
        visPctVal     * 0.15
    );

    // Label
    let label, labelColor;
    if (overall >= 75) { label = "Excellent Presence";  labelColor = "text-green-400"; }
    else if (overall >= 55) { label = "Good Presence";  labelColor = "text-yellow-400"; }
    else if (overall >= 35) { label = "Needs Improvement"; labelColor = "text-orange-400"; }
    else                    { label = "Poor Presence";  labelColor = "text-red-400"; }

    // Tips
    const tips = [];
    if (eyePct < 60)        tips.push({ icon: "👁️", text: "Maintain more eye contact — look directly at the camera." });
    if (posturePctVal < 60) tips.push({ icon: "🧍", text: "Sit upright and keep your face centered in the frame." });
    if (exprPctVal < 40)    tips.push({ icon: "🙂", text: "Try to smile more — it shows confidence and enthusiasm." });
    if (visPctVal < 70)     tips.push({ icon: "📷", text: "Make sure your face is clearly visible — improve lighting." });
    if (tips.length === 0)  tips.push({ icon: "🌟", text: "Great body language throughout the interview!" });

    return { overall, label, labelColor, eyePct, posturePctVal, exprPctVal, visPctVal, tips };
}

function displayBodyLanguageResults() {
    const results = computeBodyLanguageResults();
    if (!results) return;

    bodyLangCard.classList.remove("hidden");

    // Animate score
    bodyLangScore.textContent = results.overall;
    bodyLangLabel.textContent = results.label;
    bodyLangLabel.className   = `font-bold text-base ${results.labelColor}`;

    // Animate bars (slight delay so CSS transition fires)
    setTimeout(() => {
        eyeContactPct.textContent = results.eyePct + "%";
        eyeContactBar.style.width = results.eyePct + "%";

        posturePct.textContent = results.posturePctVal + "%";
        postureBar.style.width = results.posturePctVal + "%";

        expressionPct.textContent = results.exprPctVal + "%";
        expressionBar.style.width = results.exprPctVal + "%";

        visibilityPct.textContent = results.visPctVal + "%";
        visibilityBar.style.width = results.visPctVal + "%";
    }, 300);

    // Tips
    bodyLangTips.innerHTML = results.tips.map(t =>
        `<p class="text-xs text-gray-400 flex items-start gap-2">
            <span>${t.icon}</span><span>${t.text}</span>
        </p>`
    ).join("");
}


// ════════════════════════════════════════════════════════════════════════════
// MONACO EDITOR
// ════════════════════════════════════════════════════════════════════════════



function initMonaco() {
    if (monacoEditor) return;
    require(["vs/editor/editor.main"], () => {
        monacoEditor = monaco.editor.create(monacoContainer, {
            value:               "# Write your solution here\n\n",
            language:            "python",
            theme:               "vs-dark",
            fontSize:            14,
            minimap:             { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout:     true,
        });
    });
}

langSelect.addEventListener("change", () => {
    if (monacoEditor)
        monaco.editor.setModelLanguage(monacoEditor.getModel(), langSelect.value);
});


// ════════════════════════════════════════════════════════════════════════════
// MODE SWITCHING
// ════════════════════════════════════════════════════════════════════════════

function setMode(mode) {
    currentMode = mode;
    if (mode === "voice") {
        modeVoiceBtn.classList.add("border-[#667eea]", "bg-[#667eea]/20", "text-white");
        modeVoiceBtn.classList.remove("border-zinc-700", "text-gray-400");
        modeCodingBtn.classList.remove("border-[#667eea]", "bg-[#667eea]/20", "text-white");
        modeCodingBtn.classList.add("border-zinc-700", "text-gray-400");
    } else {
        modeCodingBtn.classList.add("border-[#667eea]", "bg-[#667eea]/20", "text-white");
        modeCodingBtn.classList.remove("border-zinc-700", "text-gray-400");
        modeVoiceBtn.classList.remove("border-[#667eea]", "bg-[#667eea]/20", "text-white");
        modeVoiceBtn.classList.add("border-zinc-700", "text-gray-400");
        initMonaco();
    }
}

modeVoiceBtn.addEventListener("click",   () => setMode("voice"));
modeCodingBtn.addEventListener("click",  () => setMode("coding"));


// ════════════════════════════════════════════════════════════════════════════
// RESUME UPLOAD
// ════════════════════════════════════════════════════════════════════════════

dropZone.addEventListener("click", () => resumeInput.click());
dropZone.addEventListener("dragover",  e => { e.preventDefault(); dropZone.classList.add("drag-over"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") handleResumeUpload(file);
});
resumeInput.addEventListener("change", () => {
    if (resumeInput.files[0]) handleResumeUpload(resumeInput.files[0]);
});

async function handleResumeUpload(file) {
    resumeStatus.textContent = "Parsing resume...";
    resumeStatus.className   = "text-xs mt-2 text-yellow-400";
    const formData = new FormData();
    formData.append("resume", file);
    try {
        const res  = await fetch(`${BASE_URL}/upload-resume`, { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) {
            resumeText = data.resume_text;
            resumeStatus.textContent = `✓ Resume loaded (${data.char_count} chars)`;
            resumeStatus.className   = "text-xs mt-2 text-green-400";
            dropZone.innerHTML = `<i class="fas fa-check-circle text-2xl text-green-400 mb-1"></i>
                                  <p class="text-green-400 text-xs font-medium">${file.name}</p>`;
        } else {
            resumeStatus.textContent = "Failed to parse resume";
            resumeStatus.className   = "text-xs mt-2 text-red-400";
        }
    } catch {
        resumeStatus.textContent = "Upload error — is backend running?";
        resumeStatus.className   = "text-xs mt-2 text-red-400";
    }
}


// ════════════════════════════════════════════════════════════════════════════
// UI STATE
// ════════════════════════════════════════════════════════════════════════════

function showInterviewPanel(subject) {
    currentSubject      = subject;
    currentProblemIndex = 0;
    codingStarted       = false;
    subjectBtns.forEach(b => b.classList.toggle("active", b.dataset.subject === subject));

    welcomeState.classList.add("hidden");
    interviewState.classList.remove("hidden");
    feedbackSection.classList.add("hidden");
    emotionPanel.classList.add("hidden");
    bodyLangCard.classList.add("hidden");

    subjectBadge.textContent = subject;
    subjectIcon.className    = iconMap[subject] + " text-2xl";
    questionNum.textContent  = "1";

    if (currentMode === "voice") {
        voiceControls.classList.remove("hidden");
        codingControls.classList.add("hidden");
        modeLabel.textContent       = "🎙 Voice";
        startInterviewBtn.classList.remove("hidden");
        recordBtn.classList.add("hidden");
        recordBtn.disabled          = true;
        submitBtn.disabled          = true;
        speakingBubble.classList.add("hidden");
        recordingStatus.textContent = "Click Start Interview to begin";
    } else {
        voiceControls.classList.add("hidden");
        codingControls.classList.remove("hidden");
        modeLabel.textContent = "💻 Coding";
        problemBox.classList.add("hidden");
        runCodeBtn.classList.add("hidden");
        runCodeBtn.disabled   = true;
        codingStatus.textContent = "Click Start Coding Interview";
    }
    endInterviewBtn.disabled = true;
}

function enableRecording() {
    recordBtn.disabled           = false;
    endInterviewBtn.disabled     = false;
    recordingStatus.textContent  = "Click to record";
}

function disableRecording() {
    recordBtn.disabled  = true;
    submitBtn.disabled  = true;
    submitBtn.classList.add("hidden");
}

function showFeedbackSection() {
    stopWebcam();                               // stop webcam when interview ends
    feedbackSection.classList.remove("hidden");
    getFeedbackArea.classList.remove("hidden");
    feedbackContent.classList.add("hidden");
    endInterviewBtn.disabled    = true;
    disableRecording();
    recordingStatus.textContent = "Interview ended";
    speakingBubble.classList.add("hidden");
}

function displayFeedback(data) {
    feedbackSubject.textContent = data.subject || currentSubject;
    scoreValue.textContent      = data.candidate_score || 0;

    const offset = 301.6 - ((data.candidate_score || 0) / 5) * 301.6;
    scoreCircle.style.strokeDashoffset = offset;

    feedbackText.textContent    = data.feedback              || "No feedback available";
    improvementText.textContent = data.areas_of_improvement  || "No suggestions";

    getFeedbackArea.classList.add("hidden");
    feedbackContent.classList.remove("hidden");

    // Show body language results
    displayBodyLanguageResults();
}

function displayEmotionData(emotionData) {
    emotionPanel.classList.remove("hidden");
    emotionScore.textContent   = emotionData.confidence_score + "%";
    emotionBar.style.width     = emotionData.confidence_score + "%";
    emotionLabel.textContent   = emotionData.confidence_label;
    emotionWPM.textContent     = emotionData.wpm    || "–";
    emotionFillers.textContent = emotionData.filler_words?.join(", ") || "None";
    emotionLength.textContent  = emotionData.answer_length || "–";
    emotionTips.textContent    = emotionData.tips?.join(" ") || "";

    const colors = {
        High:     "text-green-400 bg-green-900/30",
        Moderate: "text-yellow-400 bg-yellow-900/30",
        Low:      "text-red-400 bg-red-900/30",
    };
    emotionLabel.className =
        `text-xs font-bold px-3 py-1 rounded-full ${colors[emotionData.confidence_label] || "bg-zinc-800 text-gray-300"}`;
}

function showCodingProblem(index) {
    const p = CODING_PROBLEMS[index];
    problemTitle.textContent       = p.title;
    problemDescription.textContent = p.description;
    problemExample.textContent     = p.example;
    problemBox.classList.remove("hidden");
}

function resetToWelcome() {
    currentSubject      = null;
    isSpeaking          = false;
    mediaRecorder       = null;
    recordingChunks     = [];
    recordedBlob        = null;
    codingStarted       = false;
    currentProblemIndex = 0;

    if (currentAudio) { currentAudio.pause(); currentAudio = null; }

    stopWebcam();

    subjectBtns.forEach(b => b.classList.remove("active"));
    welcomeState.classList.remove("hidden");
    interviewState.classList.add("hidden");
    emotionPanel.classList.add("hidden");
    bodyLangCard.classList.add("hidden");

    recordBtn.classList.remove("bg-red-500","text-white","recording-active");
    recordBtn.classList.add("bg-zinc-800/80","text-gray-400");
    micIcon.classList.remove("hidden");
    stopIcon.classList.add("hidden");
    submitBtn.classList.add("hidden");
    speakingBubble.classList.add("hidden");

    scoreCircle.style.strokeDashoffset = 301.6;
    getFeedbackBtn.textContent = "Get Feedback";
    getFeedbackBtn.disabled    = false;
    execOutput.classList.add("hidden");
    problemBox.classList.add("hidden");
}


// ════════════════════════════════════════════════════════════════════════════
// AUDIO STREAMING
// ════════════════════════════════════════════════════════════════════════════

function handleAudioStream(response, onComplete) {
    const reader      = response.body.getReader();
    const decoder     = new TextDecoder();
    const mediaSource = new MediaSource();
    const audioUrl    = URL.createObjectURL(mediaSource);
    let sourceBuffer, queue = [], isReady = false;

    speakingBubble.classList.remove("hidden");
    isSpeaking         = true;
    recordBtn.disabled = true;
    recordingStatus.textContent = "Listening...";

    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    currentAudio = new Audio(audioUrl);
    currentAudio.play().catch(() => {});

    mediaSource.addEventListener("sourceopen", () => {
        sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
        isReady      = true;
        while (queue.length > 0 && !sourceBuffer.updating)
            sourceBuffer.appendBuffer(queue.shift());
        sourceBuffer.addEventListener("updateend", () => {
            if (queue.length > 0 && !sourceBuffer.updating)
                sourceBuffer.appendBuffer(queue.shift());
        });
    });

    function processChunk({ done, value }) {
        if (done) {
            if (mediaSource.readyState === "open") {
                try { mediaSource.endOfStream(); } catch(e) {}
            }
            if (onComplete) onComplete();
            return;
        }
        decoder.decode(value, { stream: true }).split("\n").forEach(line => {
            if (!line.trim()) return;
            try {
                const bytes = Uint8Array.from(atob(line), c => c.charCodeAt(0));
                (isReady && !sourceBuffer.updating)
                    ? sourceBuffer.appendBuffer(bytes)
                    : queue.push(bytes);
            } catch(e) { console.error("Base64 error", e); }
        });
        reader.read().then(processChunk);
    }
    reader.read().then(processChunk);

    currentAudio.onended = () => {
        isSpeaking = false;
        speakingBubble.classList.add("hidden");
        if (currentMode === "voice") enableRecording();
        URL.revokeObjectURL(audioUrl);
    };
    currentAudio.onerror = () => {
        isSpeaking = false;
        speakingBubble.classList.add("hidden");
        if (currentMode === "voice") enableRecording();
        URL.revokeObjectURL(audioUrl);
    };
}


// ════════════════════════════════════════════════════════════════════════════
// RECORDING
// ════════════════════════════════════════════════════════════════════════════

function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const opts = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? { mimeType: "audio/webm;codecs=opus" }
            : { mimeType: "audio/webm" };
        mediaRecorder   = new MediaRecorder(stream, opts);
        recordingChunks = [];

        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) recordingChunks.push(e.data);
        };
        mediaRecorder.onstop = () => {
            recordedBlob = new Blob(recordingChunks, { type: "audio/webm" });
            stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.start();

        recordBtn.classList.remove("bg-zinc-800/80","text-gray-400");
        recordBtn.classList.add("bg-red-500","text-white","recording-active");
        micIcon.classList.add("hidden");
        stopIcon.classList.remove("hidden");
        recordingStatus.textContent  = "Recording...";
        submitBtn.classList.add("hidden");
        endInterviewBtn.disabled = true;
    });
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        recordBtn.classList.remove("bg-red-500","text-white","recording-active");
        recordBtn.classList.add("bg-zinc-800/80","text-gray-400");
        micIcon.classList.remove("hidden");
        stopIcon.classList.add("hidden");
        recordingStatus.textContent = "Recording complete";
        submitBtn.classList.remove("hidden");
        submitBtn.disabled = false;
    }
}


// ════════════════════════════════════════════════════════════════════════════
// API CALLS
// ════════════════════════════════════════════════════════════════════════════

async function startInterview() {
    startInterviewBtn.classList.add("hidden");
    recordBtn.classList.remove("hidden");
    recordingStatus.textContent = "Connecting...";

    await startWebcam();   // 🎥 start webcam when interview starts

    try {
        const res = await fetch(`${BASE_URL}/start-interview`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ subject: currentSubject, mode: currentMode, resume_text: resumeText }),
        });
        if (res.headers.get("content-type")?.includes("text/plain")) {
            handleAudioStream(res, () => { endInterviewBtn.disabled = false; });
        } else {
            enableRecording();
            endInterviewBtn.disabled = false;
        }
    } catch {
        recordingStatus.textContent = "Backend not connected";
        speakingBubble.classList.add("hidden");
        recordBtn.classList.add("hidden");
        startInterviewBtn.classList.remove("hidden");
        stopWebcam();
    }
}

async function submitAnswer() {
    if (!recordedBlob) return;
    disableRecording();
    recordingStatus.textContent = "Analysing...";

    const formData = new FormData();
    formData.append("audio", recordedBlob, "answer.webm");

    try {
        const res  = await fetch(`${BASE_URL}/submit-answer`, { method: "POST", body: formData });
        const qNum = res.headers.get("X-Question-Number");
        if (qNum) questionNum.textContent = qNum;

        const emotionHeader = res.headers.get("X-Emotion-Data");
        if (emotionHeader) {
            try { displayEmotionData(JSON.parse(atob(emotionHeader))); } catch(e) {}
        }

        if (res.headers.get("content-type")?.includes("text/plain")) {
            handleAudioStream(res, () => {
                recordedBlob    = null;
                recordingChunks = [];
                endInterviewBtn.disabled = false;
                if (parseInt(qNum) >= 5) showFeedbackSection();
            });
        } else {
            recordedBlob = null; recordingChunks = [];
            if (parseInt(qNum) >= 5) showFeedbackSection();
            else enableRecording();
        }
    } catch {
        recordingStatus.textContent = "Connection error";
        speakingBubble.classList.add("hidden");
        enableRecording();
    }
}

async function startCodingInterview() {
    codingStarted = true;
    startCodingBtn.classList.add("hidden");
    runCodeBtn.classList.remove("hidden");
    runCodeBtn.disabled      = false;
    endInterviewBtn.disabled = false;
    showCodingProblem(currentProblemIndex);
    codingStatus.textContent = "Write your solution and click Run & Submit";

    await startWebcam();   // 🎥 start webcam for coding too

    try {
        const res = await fetch(`${BASE_URL}/start-interview`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ subject: currentSubject, mode: "coding", resume_text: resumeText }),
        });
        if (res.headers.get("content-type")?.includes("text/plain")) {
            handleAudioStream(res, () => {});
        }
    } catch { codingStatus.textContent = "Backend not connected"; }
}

async function runAndSubmitCode() {
    const code     = monacoEditor ? monacoEditor.getValue() : "";
    const language = langSelect.value;
    const problem  = CODING_PROBLEMS[currentProblemIndex];

    if (!code.trim()) { codingStatus.textContent = "Please write some code first!"; return; }

    runCodeBtn.disabled      = true;
    codingStatus.textContent = "Running code...";
    execOutput.classList.add("hidden");

    try {
        const res = await fetch(`${BASE_URL}/submit-code`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ code, language, problem: `${problem.title}: ${problem.description}` }),
        });

        const qNum       = res.headers.get("X-Question-Number");
        const execHeader = res.headers.get("X-Exec-Output");
        if (qNum) questionNum.textContent = qNum;

        if (execHeader) {
            const execResult    = JSON.parse(atob(execHeader));
            execText.textContent = execResult.stdout || execResult.stderr || "No output";
            execText.className   = execResult.success
                ? "text-green-400 whitespace-pre-wrap"
                : "text-red-400 whitespace-pre-wrap";
            execOutput.classList.remove("hidden");
        }

        if (res.headers.get("content-type")?.includes("text/plain")) {
            handleAudioStream(res, () => {
                currentProblemIndex++;
                if (currentProblemIndex < CODING_PROBLEMS.length && parseInt(qNum) < 5) {
                    showCodingProblem(currentProblemIndex);
                    if (monacoEditor) monacoEditor.setValue("# Write your solution here\n\n");
                    runCodeBtn.disabled      = false;
                    codingStatus.textContent = "Next problem loaded — write your solution";
                } else {
                    showFeedbackSection();
                }
            });
        }
    } catch {
        codingStatus.textContent = "Submission error";
        runCodeBtn.disabled      = false;
    }
}

async function endInterview() {
    if (!confirm("End interview and get feedback?")) return;
    disableRecording();
    endInterviewBtn.disabled = true;
    await getFeedback();
}

async function getFeedback() {
    showFeedbackSection();
    getFeedbackBtn.textContent = "Generating...";
    getFeedbackBtn.disabled    = true;
    try {
        const res  = await fetch(`${BASE_URL}/get-feedback`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: "{}"
        });
        const data = await res.json();
        if (data.success) displayFeedback(data.feedback);
    } catch {
        getFeedbackBtn.textContent = "Error — Retry";
        getFeedbackBtn.disabled    = false;
    }
}


// ════════════════════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ════════════════════════════════════════════════════════════════════════════

subjectBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        if (currentSubject === btn.dataset.subject &&
            !interviewState.classList.contains("hidden")) return;
        resetToWelcome();
        showInterviewPanel(btn.dataset.subject);
    });
});

startInterviewBtn.addEventListener("click",  startInterview);
recordBtn.addEventListener("click", () => {
    if (isSpeaking || recordBtn.disabled) return;
    (!mediaRecorder || mediaRecorder.state === "inactive")
        ? startRecording() : stopRecording();
});
submitBtn.addEventListener("click",          submitAnswer);
endInterviewBtn.addEventListener("click",    endInterview);
getFeedbackBtn.addEventListener("click",     getFeedback);
newInterviewBtn.addEventListener("click",    resetToWelcome);
startCodingBtn.addEventListener("click",     startCodingInterview);
runCodeBtn.addEventListener("click",         runAndSubmitCode);