// app/api/forms/create/route.js
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import moment from "moment";
import { db } from "@/config";
import { JsonForms } from "@/config/schema";
import { generateFormJson } from "@/lib/gemini";
import { shouldBlockFormCreation } from "@/lib/planLimit.mjs";

const PROMPT_TEMPLATE = `Please provide a form in JSON format based on the following structure:
- **formTitle**: The title of the form (e.g., "User Registration")
- **formSubheading**: A short description or instruction for the form (e.g., "Please fill out the form to register.")
- **formFields**: An array of fields for the form, each field should include the following attributes:
  - **fieldName**: The unique identifier for the field (e.g., "firstName", "email", "gender").
  - **fieldLabel**: The label text to display above or beside the field (e.g., "First Name", "Email Address", "Gender").
  - **placeholder**: The placeholder text for the input field (e.g., "Enter your first name", "Enter your email address").
  - **fieldType**: The type of input field (e.g., "text", "email", "date", "select").
  - **required**: Whether the field is mandatory (true or false).
  - **options**: (Optional) Only for fields of type "select". This should be an array of options for the user to choose from (e.g., ["Male", "Female", "Other"]).

### Example Format:
- Field Name: \`"firstName"\`, Field Label: \`"First Name"\`, Placeholder: \`"Enter your first name"\`, Field Type: \`"text"\`, Required: \`true\`
- Field Name: \`"email"\`, Field Label: \`"Email Address"\`, Placeholder: \`"Enter your email address"\`, Field Type: \`"email"\`, Required: \`true\`
- Field Name: \`"gender"\`, Field Label: \`"Gender"\`, Placeholder: \`"Select your gender"\`, Field Type: \`"select"\`, Options: \`["Male", "Female", "Other"]\`, Required: \`true\`

### Example JSON Output:
{
  "formTitle": "User Registration",
  "formSubheading": "Please fill out the form to register.",
  "formFields": [
    {
      "fieldName": "firstName",
      "fieldLabel": "First Name",
      "placeholder": "Enter your first name",
      "fieldType": "text",
      "required": true
    },
    {
      "fieldName": "email",
      "fieldLabel": "Email Address",
      "placeholder": "Enter your email address",
      "fieldType": "email",
      "required": true
    },
    {
      "fieldName": "gender",
      "fieldLabel": "Gender",
      "placeholder": "Select your gender",
      "fieldType": "select",
      "options": ["Male", "Female", "Other"],
      "required": true
    }
  ]
}

Please ensure the output follows the above structure exactly to maintain consistency in the form fields.`;

export async function POST(req) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const plan = user?.publicMetadata?.plan;

  const existing = await db.select().from(JsonForms).where(eq(JsonForms.CreatedBy, email));

  if (shouldBlockFormCreation(plan, existing.length)) {
    return NextResponse.json({ error: "limit_reached" }, { status: 403 });
  }

  const body = await req.json();
  const description = body?.description;
  if (!description) {
    return NextResponse.json({ error: "No description provided" }, { status: 400 });
  }

  let jsonForm;
  try {
    jsonForm = await generateFormJson("Description:" + description + PROMPT_TEMPLATE);
  } catch (err) {
    console.error("Form generation error:", err);
    return NextResponse.json({ error: err?.message || "AI generation failed" }, { status: 500 });
  }

  const inserted = await db.insert(JsonForms).values({
    jsonForm,
    CreatedBy: email,
    CreatedAt: moment().format('DD/MM/yyyy'),
  }).returning({ id: JsonForms.id });

  return NextResponse.json({ id: inserted[0].id });
}
