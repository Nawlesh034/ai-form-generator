"use client"
import { db } from '@/config'
import { JsonForms } from '@/config/schema'
import { useUser } from '@clerk/nextjs'
import { and, eq } from 'drizzle-orm'
import { ArrowLeft, Share2, SquareArrowOutUpRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import FormUi from '../_components/FormUi'

import { toast } from "sonner"
import Controller from '../_components/Controller'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { RWebShare } from 'react-web-share'

function EditForm({params}) {
    const {user}=useUser()
    const [jsonform,setJsonForm]=useState();
    const router=useRouter()
    const[updateTrigger,setTrigger]=useState()
    const[record,setRecord]=useState([]);
    const[selectedTheme,setSelectedTheme]=useState('light')

    useEffect(()=>{
        if (user) {
            getData();
        }
    },[user])

    const getData=async()=>{
        const result=await db.select().from(JsonForms)
        .where(and(eq(JsonForms.id, params?.formid),eq(JsonForms.CreatedBy, user?.primaryEmailAddress.emailAddress)))
        
        console.log(result,'kll')
        
        const rawJson = result[0].jsonForm;
        const jsonStartIndex = rawJson.indexOf('{');
        const jsonEndIndex = rawJson.lastIndexOf('}') + 1;
        const jsonString = rawJson.substring(jsonStartIndex, jsonEndIndex);
        const parsing=JSON.parse(jsonString)
      //  console.log(JSON.parse(jsonString),'nand')
       setRecord(result[0])
       setJsonForm(parsing)
       

    }
    console.log(jsonform,'nandff');
   useEffect(()=>{
    if(updateTrigger){
       setJsonForm(jsonform)
       UpdateFormDb();
    }
   },[updateTrigger])
  const onFieldUpdate=(value,index)=>{
     jsonform.form[index].label=value.label;
     jsonform.form[index].placeholder=value.placeholder
     toast.success('Updated!!!');
     setTrigger(Date.now());
  }
  const UpdateFormDb=async()=>{
    const result=await db.update(JsonForms)
    .set({
      jsonForm:jsonform
    }).where(and(eq(JsonForms.id,record.id),eq(JsonForms.CreatedBy,user?.primaryEmailAddress?.emailAddress)))
    .returning({id:JsonForms.id})
   
    console.log(result);
  }

  const deleteField=(indexto)=>{
    const res=jsonform.form.filter((item,index)=>index!=indexto)
   jsonform.form=res;
   toast.error('deleted!!!');
   setTrigger(Date.now())
  }
  const updateValue=async(value,columnName)=>{
    const result=await db.update(JsonForms)
    .set({
      [columnName]:value
    }).where(and(eq(JsonForms.id,record.id),eq(JsonForms.CreatedBy,user?.primaryEmailAddress?.emailAddress)))
    .returning({id:JsonForms.id})
    toast('Updated!!!')


  }
  const handleThemeChange = (value) => {
    setSelectedTheme(value);
    updateValue(value, 'theme');
  };
  return (
    <div className='p-10'>
      <div className='flex justify-between items-center'>
        <h2 className='flex gap-2 items-center my-5 cursor-pointer hover:font-bold' onClick={()=>router.back()}>
            <ArrowLeft/>Back
            </h2> 
            <div className='flex gap-2'>
              <Link href={'/aiform/'+record?.id} target='_blank'>
              <Button className='flex gap-2'><SquareArrowOutUpRight className='h-5 w-5'/>Live Preview</Button>
              </Link>
              <RWebShare
        data={{
          text: jsonform?.subheading+" ,Build your Form in seconds",
          url: process.env.NEXT_PUBLIC_BASE_URL+"/aiform/"+record?.id,
          title: jsonform?.title,
        }}
        onClick={() => console.log("shared successfully!")}
      >
      
      <Button className='flex gap-2 bg-blue-800'><Share2/>Share</Button>

      </RWebShare>
         
            </div>
            </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
          <div className='p-5 border rounded-lg shadow-md'><Controller selectedTheme={handleThemeChange} setSignInEnable={(value)=>{updateValue(value,'enabledSignIn')}}
          
       /></div>
          <div className='md:col-span-2 border rounded-lg p-4 '><FormUi jsonform={jsonform} onFieldUpdate={onFieldUpdate} deleteField={(indexto)=>deleteField(indexto)} selectedTheme={selectedTheme} /></div>
        </div>
        </div>
  )
}

export default EditForm