"use client"
import FormUi from '@/app/edit-form/_components/FormUi'
import { db } from '@/config'
import { JsonForms } from '@/config/schema'
import { eq } from 'drizzle-orm'
import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { extractJson } from '@/lib/utils'

function LiveAiForm({params}) {
    const [jsonform,setJsonForm]=useState();
    const[record,setRecord]=useState([]);

    useEffect(()=>{
       params && getFormData();
    },[])
    const getFormData=async()=>{
        const result=await db.select().from(JsonForms)
        .where(eq(JsonForms.id,Number(params?.formid)))
        setRecord(result[0]);
        setJsonForm(extractJson(result[0].jsonForm))
    }
  return (
    <div className='p-10 flex justify-center items-center  h-screen text-black'><FormUi 
    jsonform={jsonform}
    selectedTheme={(record?.theme)}
    onFieldUpdate={()=>console.log()}
    deleteField={()=>console.log()}
    editable={false}
    formId={record.id}
    enableSignIn={record?.enabledSignIn}

    />
    <Link className='text-white bg-black flex gap-2 mx-2 my-4 rounded-md px-2 py-2 fixed bottom-5 left-5 cursor-pointer'
     href={process.env.NEXT_PUBLIC_BASE_URL}
    >
        <Image src={'/logo.svg'} width={50} height={50}/>
        <span>Create By Logo</span>
    </Link>
    </div>
    
  )
}

export default LiveAiForm