"use client"
import { db } from '@/config'
import { JsonForms } from '@/config/schema'
import { useUser } from '@clerk/nextjs'
import { desc, eq } from 'drizzle-orm'
import React, { useEffect, useState } from 'react'
import FormListItem from './FormListItem'
import { extractJson } from '@/lib/utils'



function FormList() {
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
    <div className='mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2'>{formList.map((form,index)=>(<div key={index}>
        <FormListItem form={form.jsonForm} id={form} refreshData={getFormList} />
    </div>))}</div>
  )
}

export default FormList