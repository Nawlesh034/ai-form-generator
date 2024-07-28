import { Button } from '@/components/ui/button'
import React from 'react'
import CreateForm from '../_components/CreateForm'
import FormList from './_components/FormList'

function Dashboard() {
  return (
    <div className='flex justify-between mx-8 py-4'>
    <div className=' font-semibold font-serif text-3xl ' >Dashboard
      <span className='font-normal text-xl px-2'>  <FormList/></span>
    </div>
    <h2><CreateForm/></h2>

  
    </div>
  )
}

export default Dashboard