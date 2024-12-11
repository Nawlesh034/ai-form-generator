"use client"
import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { AiChat } from '@/config/AiModal'
import { useUser } from '@clerk/nextjs'
import { db } from '@/config'
import { JsonForms } from '@/config/schema'
import moment from 'moment/moment'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
  
const prompt = `Please provide a form in JSON format based on the following structure:
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



export default function CreateForm() {
    const[isOpen,setOpen]=useState(false)
    const[value ,setvalue]=useState();
    const[loading, setloading]=useState(false)
    const {user}=useUser();
    const route=useRouter();

    const getValue=async()=>{
        console.log(value);
        setloading(true);
       const result= await AiChat.sendMessage("Description:"+value+prompt);
       console.log(result.response.text())
       if(result.response.text()){
        const resp=await db.insert(JsonForms)
        .values({
          jsonForm:result.response.text(),
          CreatedBy:user?.primaryEmailAddress?.emailAddress,
          CreatedAt:moment().format('DD/MM/yyyy')}).returning({id:JsonForms.id})
        console.log(resp,"naw");
        if(resp[0].id){
          route.push('/edit-form/'+resp[0].id)
        }
        
       }
       setloading(false);
    }
 
  return (
    <>
    <Button onClick={()=>setOpen(true)}>+Create Form</Button>
    <Dialog open={isOpen} >
 
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Write To Create Form?</DialogTitle>
      <DialogDescription>
        <div>
      <Textarea onChange={(e)=>setvalue(e.target.value)}  placeholder='write description of your form'/>
        <div className='py-2  gap-2 flex'>
        <Button variant="destructive" onClick={()=>setOpen(false)}>Cancel</Button>
        <Button disabled={loading} onClick={getValue}>{loading ? <Loader2 className='animate-spin' /> : 'Create'}</Button>
        </div>
      </div>
      </DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>
</>
  )
}
