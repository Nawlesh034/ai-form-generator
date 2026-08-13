import { Button } from '@/components/ui/button'
import { Edit, Share2, Trash } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog'
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
          <ConfirmDeleteDialog
            trigger={<Button variant="outline"><h2 className='text-red-400'><Trash/></h2></Button>}
            description="This action cannot be undone. This will permanently delete this form and its responses."
            onConfirm={()=>onDeleteForm()}
          />
        </div>
        <h2 className='text-lg text-black'>
          {form?.formTitle}
        </h2>
        <h2 className='text-sm text-gray-500'>{form?.formSubheading}</h2>
        <hr className='my-4'></hr>
        <div className='flex justify-between'>
        <RWebShare
        data={{
          text: form?.formSubheading+" ,Build your Form in seconds",
          url: process.env.NEXT_PUBLIC_BASE_URL+"/aiform/"+id?.id,
          title: form?.formTitle,
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
