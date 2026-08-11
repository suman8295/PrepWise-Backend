const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

// Use a currently available Gemini model for new API users.
const MODEL_NAME = "models/gemini-flash-latest"


const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {


    const prompt = `You are an elite Technical Recruiter and Expert Interview Coach. Your task is to perform a deep comparative analysis between a candidate's profile and a target Job Description to generate a comprehensive, highly structured Interview Preparation Report. 

### INPUT DATA ###
- Candidate Resume: ${resume}
- Candidate Self-Description: ${selfDescription}
- Target Job Description: ${jobDescription}

### REQUIRED OUTPUT COMPONENTS ###
Analyze the inputs thoroughly and generate a response that strictly adheres to the requested JSON schema. Focus on the following guidelines for each section:

1. Match Score
- Calculate a precise score from 0 to 100 based on how well the candidate's skills, experience, and traits align with the core requirements of the job.
- Weigh hard skills, years of experience, and relevant project work heavily.

2. Interview Questions (Technical & Behavioral)
- Generate highly tailored interview questions based on the candidate's specific background and the job's demands. 
- Technical Questions: Focus on verifying the candidate's claimed skills and probing areas highly relevant to the Job Description.
- Behavioral Questions: Focus on soft skills, culture fit, and past experiences based on the Self-Description and Job Description.
- For the "answer" field, provide a concise, high-quality model answer utilizing the STAR method (Situation, Task, Action, Result) where applicable, tailored to the candidate's actual resume.

3. Skill Gaps
- Identify specific discrepancies between the Job Description requirements and the candidate's profile.
- Categorize severity strictly as "high" (critical for the role), "medium" (important but learnable), or "low" (nice to have).

4. Preparation Plan (Day-by-Day Roadmap)
- Create a structured, actionable study and preparation plan leading up to the interview.
- Ensure the "focus" and "tasks" are realistic and specific to the technologies or methodologies mentioned in the Job Description.

5. Title
- Provide a concise job title based on the Job Description.

### FORMATTING CONSTRAINTS ###
Output strictly valid JSON that completely satisfies the provided JSON schema. Do not include markdown formatting like \`\`\`json or introductory text. Ensure all nested arrays and objects are properly formatted.`;


    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema),
        }
    })

    return JSON.parse(response.text)


}



async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const prompt = `You are an Elite Executive Resume Writer and ATS (Applicant Tracking System) Optimization Expert. Your task is to rewrite, format, and highly tailor a candidate's resume to perfectly align with a target Job Description, outputting the result as print-ready HTML.

### INPUT DATA ###
- Candidate's Original Resume: ${resume}
- Candidate's Self-Description: ${selfDescription}
- Target Job Description: ${jobDescription}

### CONTENT OPTIMIZATION & TAILORING ###
- Keyword Alignment: Naturally integrate key skills, tools, and industry terms from the Job Description into the candidate's summary, skills section, and experience bullets.
- Action-Oriented & Metric-Driven: Rewrite bullet points using strong action verbs. Where possible, format achievements using the formula: "Accomplished [X] as measured by [Y], by doing [Z]".
- Human Tone: The writing must sound like a pragmatic, high-achieving professional. Strictly avoid AI-typical flowery language or overused buzzwords (e.g., "delve", "testament", "synergize").
- Relevance Filtering: Emphasize experiences, skills, and projects that directly match the Job Description. Concisely summarize or remove irrelevant past roles. DO NOT hallucinate fake experience, metrics, or contact info.

### HTML, CSS & ATS-COMPLIANCE INSTRUCTIONS ###
- Semantic Structure: Use strictly semantic HTML tags (e.g., <header>, <section>, <h1> for the name, <h2> for section headers, <ul> and <li> for bullets) so ATS parsers can read the data accurately. Avoid complex tables for layout.
- Styling & Puppeteer Readiness:
  - Provide a comprehensive <style> block in the <head>.
  - The design must be modern, minimalist, and highly professional.
  - Use a highly legible, standard font family (e.g., 'Inter', 'Roboto', 'Helvetica Neue', sans-serif).
  - Use a sophisticated color palette: Dark Navy or Charcoal for headers, pure black for body text, and subtle dark gray for dates/locations.
  - Include standard print margins in the CSS (e.g., \`@page { margin: 20px 40px; }\`) to ensure it renders beautifully as an A4/Letter PDF.
- Layout Density: Scale the font sizes and line heights so the content comfortably fits within 1 to a maximum of 2 pages when printed. 

### REQUIRED RESUME SECTIONS ###
Generate the HTML incorporating these sections in order (if the input data supports them):
1. Header (Name, Email, Phone, Links - positioned cleanly at the top)
2. Professional Summary (3-4 lines tailored heavily to the JD)
3. Core Competencies / Technical Skills (Grouped logically)
4. Professional Experience (Reverse chronological, optimized bullets)
5. Projects (Highly relevant ones only)
6. Education

Output strictly valid JSON that completely satisfies the provided JSON schema containing the "html" key. Do not include markdown formatting like \`\`\`json or introductory text.`;


    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumePdfSchema),
        }
    })


    const jsonContent = JSON.parse(response.text)

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer

}

async function generateCoverLetterPdf({ resume, selfDescription, jobDescription }) {
    const coverLetterPdfSchema = z.object({
        html: z.string().describe("The HTML content of the cover letter which can be converted to PDF using any library like puppeteer")
    })
    const prompt = `You are an Elite Career Coach and Expert Business Communicator. Your task is to write a highly tailored, persuasive, and professional cover letter that connects a candidate's background directly to the core needs of a target Job Description. You will output the result as print-ready HTML.

### INPUT DATA ###
- Candidate's Resume: ${resume}
- Candidate's Self-Description: ${selfDescription}
- Target Job Description: ${jobDescription}

### CONTENT & TONE GUIDELINES ###
- The Hook (Introduction): Start with a strong, engaging opening that states the exact role being applied for. Express genuine enthusiasm for the company's specific domain, product, or mission (inferred from the Job Description). Do not use boring, standard openings like "I am writing to apply for...".
- The Bridge (Body Paragraphs): Do not simply regurgitate the resume. Select 2 to 3 highly relevant achievements or core skills from the candidate's inputs that directly address the most critical requirements of the Job Description. Explain *how* the candidate will add immediate value based on past success.
- The Close (Call to Action): Reiterate excitement concisely, state how the candidate's unique blend of skills fits the company culture, and confidently express a desire to discuss the role further in an interview.
- Human-Centric Tone: The writing must sound authentic, confident, and direct. STRICTLY AVOID AI-generated clichés, overly formal filler words, and flowery language (e.g., "plethora," "delve," "testament," "unwavering commitment," "synergy"). Keep sentences concise and impactful.
- No Hallucinations: Do not invent experiences, metrics, or contact information. If the hiring manager's name is not provided in the inputs, use a professional standard greeting (e.g., "Dear Hiring Team," or "Dear [Company Name] Search Committee,").

### HTML, CSS & PUPPETEER GUIDELINES ###
- Semantic Structure: Use standard, well-structured HTML tags (<header>, <main>, <p>, <strong>, <br>). 
- Styling & Print Readiness:
  - Include a comprehensive <style> block in the <head> of the HTML.
  - The design must emulate a traditional, high-end business letter. Do not use flashy colors or complex CSS grid layouts. 
  - Use highly legible, professional fonts (e.g., 'Georgia', 'Garamond', or a clean 'Helvetica Neue'). Set standard font sizes (e.g., 11pt or 12pt for body text).
  - Define strict print margins using CSS (\`@page { margin: 1in; }\`) and an optimal line height (\`line-height: 1.6;\`) to ensure readability.
  - Format the header cleanly to display the candidate's name and contact info prominently at the top.
- Length Constraint: The content length and CSS styling must ensure the rendered document fits strictly onto a single A4 or Letter-sized page when converted to PDF.

Output strictly valid JSON that completely satisfies the provided JSON schema containing the "html" key. Do not include markdown formatting like \`\`\`json or introductory text.`;

    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(coverLetterPdfSchema),
        }
    })
    const jsonContent = JSON.parse(response.text)
    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)
    return pdfBuffer
}
module.exports = { generateInterviewReport, generateResumePdf, generateCoverLetterPdf }
