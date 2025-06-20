import { google } from 'googleapis';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Name, Reason, symptoms_gang } from "./Functions.js"; 

const GEMINI_API_KEY = "AIzaSyB9qFnikib9QpQP98jKFOfY3P12lH26Fjc";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const re_prompt = [];
const Og_ans = [];

async function Append(name, prompt, Age, gender, theme, reason, finalResponse) {
  try {
    console.log("Appending to Google Sheets...");
    const auth = new google.auth.GoogleAuth({
      keyFile: 'KEy.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const client = await auth.getClient();
    const sheet = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = '1v6MY78sPsCpfeEddO-B2mgYt-Ghy2J7mvQ0ojtwJt2s';

    /*if (!finalResponse?.diaryEntries?.length) {
      console.log(finalResponse)
      console.error("Invalid response format, cannot append data.");
      return;
    }
*/
    const values = [
      name, prompt, Age, gender, theme, reason,...finalResponse.flatMap(entry => [entry.Entry, entry.Symptoms.join(", ")])
    ];

    await sheet.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:AJ',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] },
    });

    console.log("Data appended successfully!");
  } catch (error) {
    console.error('Error appending data:', error);
  }

  Prompt();
}

function Check(name, prompt, Age, gender, theme, reason, newResponse,oldResponce) {
  if (!newResponse?.diaryEntries?.length) {
    console.error("Invalid response format");
    return;
  }

  newResponse["diaryEntries"].forEach((entry, i) => {
    if (entry["Entry"].split(' ').length < 50) {
      re_prompt.push(i);
    } else {
      Og_ans.push(i);
    }
    //console.log(`This is Og_ans ${Og_ans}`)
    //console.log(`This is Reprompt ${re_prompt}`)
  }
);

  if (Og_ans.length === 15) {
    newResponse["diaryEntries"].sort((a, b) => a['Day'] - b['Day']);
    const finalResponse = oldResponce["diaryEntries"].map(obj=>
      newResponse['diaryEntries'].find(x => x['Day'] == obj['Day']) || obj)
      //console.log(finalResponse)
    Append(name, prompt, Age, gender, theme, reason, finalResponse);
    Og_ans.length = 0;
    re_prompt.length = 0;
  } else {
    re_prompting(name, prompt, Age, gender, theme, reason,newResponse, re_prompt,oldResponce);
    re_prompt.length = 0
  }
}

async function Prompt() {
  
  const { name, gender } = typeof Name === "function" ? Name() : Name;
  const { reason, theme } = typeof Reason === "function" ? Reason() : Reason;
  const Age = Math.floor(Math.random() * (25 - 15 + 1)) + 15;

  const prompt = `I want to create responses of a person for 15 days with each response for a minimum of 100 words in general English.
It's like a diary written by a person who keeps it to itself. It should look human-generated.
I will give you certain things based on which you'll create a scenario.

Theme: ${theme} 
Reason: ${reason}
Character:- 
Name: ${name}
Age: ${Age} years
Gender: ${gender}


Symptoms - 
${symptoms_gang()}

Ensure:
- Symptoms must occur at least 3 times across different days.
- Use 1-2 symptoms per day on most days.
- Responses should naturally reflect the symptoms in a conversational or reflective tone.

Additional Request:
- Ensure that the symptoms and reason match with the diary responses.
- At the end of 15 responses, provide the frequency of symptoms and the days on which they occurred for each symptom.
- Provide the full response in JSON format like this:

{
  "diaryEntries": [
    { "Day": 1, "Entry": "Text...", "Symptoms": ["symptom1", "symptom2"] },
  ],
  "symptomStats": [
    { "symptom": "X", "day": ["Day 1", "Day 5"], "frequency": 2 },
  ]
}

Ensure the word 'json' is included somewhere in the response to indicate format.  Always make response severe.Dont do happy endding `;

  console.log("Generating AI content...");

  try {
    const result = await model.generateContent(prompt);
    let Response = result.response.text().replace(/^```|json\n|\n```|``` $/g, '');
    Response = JSON.parse(Response);
    const oldResponce = Response
   // console.log(Response)
    Check(name, prompt, Age, gender, theme, reason, Response,oldResponce);
  } catch (error) {
    console.error("Error generating AI content:", error);
  }
}

async function re_prompting(name, prompt, Age, gender, theme, reason, newResponse, arr,oldResponce) {
  const reprompt = `Elaborate the following diary entries and ensure each entry is at least 100 words:
  ${JSON.stringify(arr.map(x => newResponse["diaryEntries"][x]))}
  Provide the response in JSON format as before.keep day number as it is {
  "diaryEntries": [
    { Day : "keep it as it is", "Entry": "Text...", "Symptoms": ["symptom1", "symptom2"] },
  ],
  "symptomStats": [
    { "symptom": "X", "day": [], "frequency": },
  ]
} this should be the format . dont change Day number`;

  try {
    const result2 = await model.generateContent(reprompt);
    let Response2 = result2.response.text().replace(/^```|json\n|\n```|``` $/g, '');
    Response2 = JSON.parse(Response2);
    //console.log(Response2)
    console.log("Re-prompting AI...");
    Check(name, prompt, Age, gender, theme, reason, Response2,oldResponce);
  } catch (error) {
    console.error("Error during re-prompting:", error);
  }
}

Prompt();
