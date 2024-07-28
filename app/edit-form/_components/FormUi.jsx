import { Input } from '@/components/ui/input'
import React, { useRef, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import FieldEdit from './FieldEdit'
import { JsonForms, userResponse } from '@/config/schema'
import { db } from '@/config'
import moment from 'moment'
import { toast } from 'sonner'
import { eq  } from 'drizzle-orm'
import { SignInButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'


function FormUi({jsonform,selectedTheme,onFieldUpdate,deleteField,editable=true,formId, enableSignIn=false}) {
  
  const[formData,setFormData]=useState();
  let formRef=useRef()  //you can refer to the dom element
  const{user,isSignedIn}=useUser()
  
  const handleInputChange=(e)=>{
    const{name,value}=e.target
    setFormData({...formData,[name]:value})
  }
  const handleSelect=(name,value)=>{
    setFormData({...formData,[name]:value})

  }
  const handleCheckboxChange = (name, option,value) => {
    const list=formData?.[name]?formData?.[name]:[];

    if(value){
      list.push({
        label:option,
        value:value
      })
      setFormData({
        ...formData,
        [name]:list
      })
    }else{
      const result=list.filter((item)=>item.label==option);
      setFormData({
        ...formData,
        [name]:result
      })
    }
    
  }
  const onFormSubmit=async(e)=>{
    e.preventDefault()
    console.log(formData)
 

    const formExists = await db.select().from(JsonForms)
    
    .where(eq(JsonForms.id), formId)
    

if (!formExists) {
    toast('Form ID does not exist!');
    return;
}
   
    const result=await db.insert(userResponse)
    .values({
      jsonResponse:formData,
      CreatedAt: moment().format('YYYY-MM-DD'),
      refForm:formId,
    }).execute()
    console.log(formId)
    if(result){
      formRef.reset();
      toast('Response Submitted Successfully!')
    }
    else{
      toast("Internal Error!!")
    }
  }
  return (
    <form

    ref={(e)=>formRef=e}
      onSubmit={onFormSubmit}
    className='border rounded-lg p-5 md:w-[600px] 'data-theme={selectedTheme}><h2 className='font-bold text-center text-2xl'>{jsonform?.title}</h2>
    <h2 className='text-sm text-gray-400 text-center'>{jsonform?.subheading}</h2>
    {jsonform && jsonform.form && Array.isArray(jsonform?.form) ? (
  jsonform.form.map((field, index) => (
    <div key={index} className=' '>
      <div className=' px-1 py-1'>
        <label className='text-sm text-gray-600'>{field.label}</label>
        {field.type === 'select' ? (
          <Select onValueChange={(v)=>handleSelect(field.name,v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(field.options) &&
                field.options.map((option, optIndex) => (
                  <SelectItem key={optIndex} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        ) : field.type === 'radio' ? (
          <RadioGroup defaultValue={field.options[0].value}  value={field.options.value}
          onValueChange={(value) => handleSelect(field.name, value)}   >
            {Array.isArray(field.options) &&
              field.options.map((option, optIndex) => (
                <div key={optIndex} className='flex items-center space-x-2'>
                  <RadioGroupItem value={option.value} id={`option-${index}-${optIndex}`}  />
                  <Label htmlFor={`option-${index}-${optIndex}`}>{option.label}</Label>
                </div>
              ))}
          </RadioGroup>
        ) : field.type === 'checkbox' ? (
          <div>
            <Checkbox id={`checkbox-${index}`} value={field.type} onCheckedChange={(v)=>handleCheckboxChange(field.label,field.type,v)} 
                     />
            <Label htmlFor={`checkbox-${index}`}>{field.label}</Label>
            {Array.isArray(field.options) &&
              field.options.map((option, optIndex) => (
                <div key={optIndex} className='flex items-center space-x-2'>
                  <Checkbox id={`checkbox-${index}-${optIndex}`} value={option.value} onCheckedChange={(v)=>handleCheckboxChange(field.label,option.label,v)} />
                  <Label htmlFor={`checkbox-${index}-${optIndex}`}>{option.label}</Label>
                </div>
              ))}
          </div>
        ) : (
          <Input type={field.type} placeholder={field.placeholder} name={field.name} onChange={(e)=>handleInputChange(e)} />
        )}
      </div>
      {editable &&
      <div>
       <FieldEdit defaultValue={field} onUpdate={(value) => onFieldUpdate(value, index)} deleteField={() => deleteField(index)} />
      </div>
}
    </div>
  ))
) : (
  <div>No form data available</div>
)}{!enableSignIn? <button className='btn btn-primary' type='submit'>Submit</button>:isSignedIn?<button className='btn btn-primary' type='submit'>Submit</button>  :<Button><SignInButton mode='modal'>Sign In Before Submit</SignInButton></Button>}

    </form>
  )
}

export default FormUi

