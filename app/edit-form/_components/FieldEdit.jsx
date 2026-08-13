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
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog'


function FieldEdit({defaultValue,onUpdate,deleteField}) {
    const[label,setLabel]=useState(defaultValue?.fieldLabel)
    const[placeholder,setPlaceholder]=useState(defaultValue?.placeholder)
  return (
    <div className='flex'><Popover>
    <PopoverTrigger><Edit/></PopoverTrigger>
    <PopoverContent><h2>Edit Fields</h2>
    <div>
        <label>
            Label Name
            <Input type='text' defaultValue={defaultValue.fieldLabel}
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
            fieldLabel:label,
            placeholder:placeholder
        })}>
         Update
        </Button>
    </div>
    </PopoverContent>
  </Popover>


  <ConfirmDeleteDialog
    trigger={<Trash className='text-red-500'/>}
    description="This action cannot be undone. This will permanently delete this field from your form."
    onConfirm={()=>deleteField()}
  />
  </div>
  )
}

export default FieldEdit