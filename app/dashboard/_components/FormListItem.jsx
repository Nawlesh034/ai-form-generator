import { Button } from '@/components/ui/button'
import { Edit, Share2, Trash, Trash2 } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useUser } from '@clerk/nextjs'
import { db } from '@/config'
import { JsonForms } from '@/config/schema'
import { and, eq } from 'drizzle-orm'
import { toast } from 'sonner'
import { RWebShare } from 'react-web-share'


export default function FormListItem({form,id,refreshData}) {
  const{user}=useUser();
  const onDeleteForm=async()=>{

    const result=await db.delete(JsonForms)
    .where(and(eq(JsonForms.id,id.id),eq(JsonForms.CreatedBy,user?.primaryEmailAddress?.emailAddress)))

    if(result){
      toast("Form Deleted!!!")
      refreshData()
    }

  }
  return (
    <div className='border shadow-sm rounded-lg p-4'>
        <div className='flex justify-end'>
          
          <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline"><h2 className='text-red-400'><Trash/></h2></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction  onClick={()=>onDeleteForm()}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
        </div>
        <h2 className='text-lg text-black'>
          {form?.title}
        </h2>
        <h2 className='text-sm text-gray-500'>{form?.subheading}</h2>
        <hr className='my-4'></hr>
        <div className='flex justify-between'>
        <RWebShare
        data={{
          text: form?.subheading+" ,Build your Form in seconds",
          url: process.env.NEXT_PUBLIC_BASE_URL+"/aiform/"+id?.id,
          title: form?.title,
        }}
        onClick={() => console.log("shared successfully!")}
      >
         <Button variant='outline' size='sm' className='flex gap-2'><Share2/></Button>

      </RWebShare>
         
          <Link href={'edit-form/'+id?.id}>
          <Button><Edit/></Button>
          </Link>

        </div>
    </div>
  )
}
