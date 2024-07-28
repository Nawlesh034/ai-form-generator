"use client"
import { db } from '@/config'
import { JsonForms } from '@/config/schema'
import { useUser } from '@clerk/nextjs'
import { eq } from 'drizzle-orm'
import React, { useEffect, useState } from 'react'
import FormListResponse from './_components/FormListResponse'

function Responses() {
    const{user}=useUser();
    const[formList,setFormList]=useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(()=>{
        user && getFormList();
    },[user])
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
    const getFormList=async ()=>{
        try {
            const result = await db.select().from(JsonForms)
                .where(eq(JsonForms.CreatedBy, user?.primaryEmailAddress?.emailAddress))


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
        

      
    }
  return (
    <div  className=' font-semibold font-serif text-3xl p-10 ' >Responses
    
    <div className='grid grid-cols-2 lg:grid-cols-3'>
        {formList&&formList?.map((form,index)=>(
            <FormListResponse
            key={index}
            formRecord={form}
            jsonform={form.jsonForm}
            />
        ))}
    </div>
    </div>
  )
}

export default Responses