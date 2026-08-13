"use client"
import { db } from '@/config'
import { JsonForms } from '@/config/schema'
import { useUser } from '@clerk/nextjs'
import { eq ,desc} from 'drizzle-orm'
import React, { useEffect, useState } from 'react'
import FormListResponse from './_components/FormListResponse'
import { extractJson } from '@/lib/utils'

function Responses() {
      const {user}=useUser()
        const[formList,setFormList]=useState([]);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);

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