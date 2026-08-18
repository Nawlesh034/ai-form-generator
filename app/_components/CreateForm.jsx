"use client"
import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog"
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function CreateForm() {
    const[isOpen,setOpen]=useState(false)
    const[value ,setvalue]=useState();
    const[loading, setloading]=useState(false)
    const[limitReached, setLimitReached]=useState(false)
    const route=useRouter();

    const getValue=async()=>{
        setloading(true);
        try {
          const res = await fetch('/api/forms/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: value }),
          });
          const data = await res.json();
          if (res.status === 403 && data?.error === 'limit_reached') {
            setLimitReached(true);
          } else if (data?.id) {
            route.push('/edit-form/'+data.id)
          } else {
            toast.error(data?.error || 'Could not create form. Please try again.');
          }
        } catch (err) {
          toast.error('Something went wrong. Please check your connection and try again.');
        } finally {
          setloading(false);
        }
    }

  return (
    <>
    <Button onClick={()=>{setOpen(true); setLimitReached(false);}}>+Create Form</Button>
    <Dialog open={isOpen} >

  <DialogContent>
    <DialogHeader>
      <DialogTitle>Write To Create Form?</DialogTitle>
      <DialogDescription>
        <div>
      {limitReached ? (
        <div>
          <p>You've reached the 3-form limit on the free plan.</p>
          <Link href='/dashboard/upgrade' className='text-primary underline'>Upgrade to create more forms</Link>
        </div>
      ) : (
        <Textarea onChange={(e)=>setvalue(e.target.value)}  placeholder='write description of your form'/>
      )}
        <div className='py-2  gap-2 flex'>
        <Button variant="destructive" onClick={()=>setOpen(false)}>Cancel</Button>
        {!limitReached &&
        <Button disabled={loading} onClick={getValue}>{loading ? <Loader2 className='animate-spin' /> : 'Create'}</Button>
        }
        </div>
      </div>
      </DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>
</>
  )
}
