"use client"
import { db } from '@/config'
import { JsonForms } from '@/config/schema'
import { useUser } from '@clerk/nextjs'
import { desc, eq } from 'drizzle-orm'
import React, { useEffect, useState } from 'react'
import FormListItem from './FormListItem'



function FormList() {
    const {user}=useUser()
    const[formList,setFormList]=useState([]);
    console.log(formList,"res")
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const extractJson = (rawText) => {
        try {
            // Remove unwanted text before and after the JSON
            const jsonStartIndex = rawText.indexOf('{');
            const jsonEndIndex = rawText.lastIndexOf('}') + 1;
            let jsonString = rawText.substring(jsonStartIndex, jsonEndIndex);
            jsonString = jsonString.replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas
            jsonString = jsonString.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, ''); // Remove comments
            jsonString = jsonString.replace(/^[^\{]*/, ''); // Remove any leading non-JSON text
   
            jsonString = jsonString.replace(/(?<!^)\s*([\{\[])\s*/g, '$1'); // Remove whitespace around braces
            jsonString = jsonString.replace(/\s*([\}\]])\s*(?!$)/g, '$1'); // Remove whitespace around closing braces
    

            // Parse the extracted JSON string
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('Error extracting and parsing JSON:', error);
            return null;
        }
    };

    
    const getFormList = async () => {
        try {
            const result = await db.select().from(JsonForms)
                .where(eq(JsonForms.CreatedBy, user?.primaryEmailAddress?.emailAddress))
                .orderBy(desc(JsonForms.id));

            const cleanedForms = result.map(form => {
                const parsedJson = extractJson(form.jsonForm);
                return {
                    ...form,
                    jsonForm: parsedJson
                };
            }).filter(form => form.jsonForm !== null);

            setFormList(cleanedForms);
        } catch (error) {
            console.error("Error fetching forms:", error);
            setError("Failed to load forms.");
        } finally {
            setLoading(false);
        }
    };
    useEffect(()=>{
       user&& getFormList();
    },[user])
  return (
    <div className='mt-5 grid grid-cols-2 md:grid-cols-3 gap-2'>{formList.map((form,index)=>(<div key={index}>
        <FormListItem form={form.jsonForm} id={form} refreshData={getFormList} />
    </div>))}</div>
  )
}

export default FormList