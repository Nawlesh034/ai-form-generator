"use Client"
import { Edit, Trash } from 'lucide-react'
import React, { useState } from 'react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "@/components/ui/popover"
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
  

function FieldEdit({defaultValue,onUpdate,deleteField}) {
    const[label,setLabel]=useState(defaultValue?.label)
    const[placeholder,setPlaceholder]=useState(defaultValue?.placeholder)
  return (
    <div className='flex'><Popover>
    <PopoverTrigger><Edit/></PopoverTrigger>
    <PopoverContent><h2>Edit Fields</h2>
    <div>
        <label>
            Label Name
            <Input type='text' defaultValue={defaultValue.label} 
             onChange={(e)=>setLabel(e.target.value)}
            />
        </label>
    </div>
    <div>
        <label>
            Placeholder Name
            <Input type='text' defaultValue={defaultValue.placeholder} 
             onChange={(e)=>setPlaceholder(e.target.value)}
            />
        </label>
    </div>
    <div>
        <Button size='sm' onClick={()=>onUpdate({
            label:label,
            placeholder:placeholder
        })}>
         Update
        </Button>
    </div>
    </PopoverContent>
  </Popover>


  <AlertDialog>
  <AlertDialogTrigger>  <Trash className='text-red-500'/></AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete your account
        and remove your data from our servers.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={()=>deleteField()}>Continue</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
  </div>
  )
}

export default FieldEdit