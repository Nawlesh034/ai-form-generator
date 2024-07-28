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
  
const Prompt =' ,On the basis of description please give form in json format with form title,form subheading with form having form field,form name,placeholder name,and form label,field type,field required in json format'
export default function CreateForm() {
    const[isOpen,setOpen]=useState(false)
    const[value ,setvalue]=useState();
    const[loading, setloading]=useState(false)
    const {user}=useUser();
    const route=useRouter();

    const getValue=async()=>{
        console.log(value);
        setloading(true);
       const result= await AiChat.sendMessage("Description:"+value+Prompt);
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
